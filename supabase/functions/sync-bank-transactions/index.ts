// Edge Function: sync-bank-transactions
//
// Sincroniza transações de contas bancárias conectadas via Banco MCP (Pluggy)
// preenchendo controle_mensal_lancamentos.
//
// Ordem de categorização (cai pra próximo se o anterior não casar):
//   1) Regra aprendida (controle_mensal_regras_categorizacao) por merchant
//      ou descrição normalizada — memória das aprovações anteriores
//   2) Match direto pelo categoryId/prefixo do plano de contas do cliente
//   3) null — fica pra revisão manual
//
// Lançamentos existentes (por external_id) são IGNORADOS no sync — não
// recadastra nem altera o que o consultor já revisou.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

interface BankConnection { id: string; client_id: string; external_account_id: string; account_type: string | null; institution_name: string | null; status: string; last_sync_at: string | null; initial_lookback_days: number; }
interface MCPTransaction { id: string; date: string; description: string; amount: string; currencyCode: string; type: 'DEBIT' | 'CREDIT'; status: 'POSTED' | 'PENDING'; category?: string | null; categoryId?: string | null; operationType?: string | null; merchant?: string | null; paymentData?: { paymentMethod?: string | null; payer?: string | null; receiver?: string | null } | null; }
interface MCPListResponse { ok?: boolean; result?: { total: number; page: number; totalPages: number; results: MCPTransaction[] }; total?: number; page?: number; totalPages?: number; results?: MCPTransaction[]; error?: string; warning?: string; }

const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const CATEGORY_ID_PAGAMENTO_FATURA = '05100000';

// ─── Normalização de descrição/merchant pra match das regras ──────────
// (Espelho de apps/web/src/lib/controle-mensal/match.ts)
const PREFIXOS = /^(DL|PPRO|PAY|TBI|EBANX|PG\*|PAYU|SP\*|STR\*|PADDLE|REC\*|2C\*)\s*\*?\s*/i;
const SUFIXO_ID = /\s+[a-z0-9]{4,}$/i;
const SUFIXO_PARCELA = /\s+\d{1,2}\/\d{1,2}$/;

function normalizarDescricao(desc: string): string {
  if (!desc) return '';
  return desc.toUpperCase()
    .replace(PREFIXOS, '')
    .replace(SUFIXO_ID, '')
    .replace(SUFIXO_PARCELA, '')
    .replace(/\s+/g, ' ')
    .trim();
}
function makeMatchKey(merchant: string | null | undefined, descricao: string | null | undefined): string {
  const m = (merchant ?? '').trim().toLowerCase();
  if (m) return `m:${m}`;
  return `d:${normalizarDescricao(descricao ?? '')}`;
}

// ─── Plano de contas + regras aprendidas ──────────────────────────────

interface RegraAprendida { id: string; categoria_id: string | null; rubrica_id: string | null; centro_id: string | null; }

async function carregarPlanoDeContas(supabase: SupabaseClient, clientId: string) {
  const { data: existMacros } = await supabase.from('controle_mensal_categorias')
    .select('id, external_match_prefix').eq('client_id', clientId).is('parent_id', null)
    .not('external_match_prefix', 'is', null);
  const prefixToMacro = new Map<string,string>();
  for (const c of existMacros ?? []) prefixToMacro.set(c.external_match_prefix as string, c.id as string);
  const { data: existRubricas } = await supabase.from('controle_mensal_categorias')
    .select('id, external_match_id').eq('client_id', clientId).not('external_match_id', 'is', null);
  const extIdToRubrica = new Map<string,string>();
  for (const c of existRubricas ?? []) extIdToRubrica.set(c.external_match_id as string, c.id as string);
  return { prefixToMacro, extIdToRubrica };
}

async function carregarRegras(supabase: SupabaseClient, clientId: string): Promise<Map<string, RegraAprendida>> {
  const { data } = await supabase.from('controle_mensal_regras_categorizacao')
    .select('id, match_key, categoria_id, rubrica_id, centro_id')
    .eq('client_id', clientId).eq('ativo', true);
  const map = new Map<string, RegraAprendida>();
  for (const r of data ?? []) {
    map.set(r.match_key as string, {
      id: r.id as string,
      categoria_id: r.categoria_id as string | null,
      rubrica_id: r.rubrica_id as string | null,
      centro_id: r.centro_id as string | null,
    });
  }
  return map;
}

function competenciaFromDate(iso: string) { const d = new Date(iso); const ano = d.getUTCFullYear(); const mes_num = d.getUTCMonth() + 1; return { mes: MESES_PT[mes_num - 1]!, mes_num, ano, competencia: ano * 100 + mes_num, data: iso.slice(0, 10) }; }
function normalizarValor(amountStr: string, type: 'DEBIT' | 'CREDIT', isCreditCard: boolean, categoryId: string | null | undefined) { const raw = parseFloat(amountStr); if (isCreditCard) { if (type === 'DEBIT') return { valor: -Math.abs(raw), eh_receita: false, eh_pagamento_fatura: false }; return { valor: Math.abs(raw), eh_receita: false, eh_pagamento_fatura: true }; } const eh_receita = raw > 0; const eh_pgto = !eh_receita && categoryId === CATEGORY_ID_PAGAMENTO_FATURA; return { valor: raw, eh_receita, eh_pagamento_fatura: eh_pgto }; }
function hashTx(connId: string, tx: MCPTransaction): string { const raw = `${connId}|${tx.id}`; let h = 0; for (let i = 0; i < raw.length; i++) h = ((h << 5) - h + raw.charCodeAt(i)) | 0; return `mcp-${h >>> 0}`; }

async function fetchTransactionsPage(apiKey: string, baseUrl: string, accountId: string, fromIso: string, page: number) {
  const res = await fetch(`${baseUrl}/api/openfinance/transactions/list`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ account_id: accountId, from: fromIso, page, page_size: 500 }),
  });
  if (!res.ok) { const body = await res.text(); throw new Error(`MCP API ${res.status}: ${body.slice(0, 300)}`); }
  const json = (await res.json()) as MCPListResponse;
  if (json.error) throw new Error(json.error);
  const result = json.result ?? json; return { results: result.results ?? [], totalPages: result.totalPages ?? 1 };
}
async function fetchAllTransactions(apiKey: string, baseUrl: string, accountId: string, fromIso: string): Promise<MCPTransaction[]> {
  const all: MCPTransaction[] = []; let page = 1;
  while (true) {
    const { results, totalPages } = await fetchTransactionsPage(apiKey, baseUrl, accountId, fromIso, page);
    all.push(...results);
    if (page >= totalPages || results.length === 0) break;
    page += 1; if (page > 50) break;
  }
  return all;
}

interface SyncResult { connection_id: string; account_id: string; institution_name: string | null; fetched: number; inserted: number; skipped: number; status: 'success' | 'error'; error?: string; regras_aplicadas?: number }

async function syncOneConnection(supabase: SupabaseClient, apiKey: string, baseUrl: string, conn: BankConnection, triggeredBy: string): Promise<SyncResult> {
  const { data: logRow } = await supabase.from('bank_sync_log').insert({ bank_connection_id: conn.id, client_id: conn.client_id, triggered_by: triggeredBy }).select('id').single();
  const logId = logRow?.id as string;
  const lookbackMs = conn.initial_lookback_days * 24 * 60 * 60 * 1000;
  const fromMs = conn.last_sync_at ? new Date(conn.last_sync_at).getTime() - 3 * 24 * 60 * 60 * 1000 : Date.now() - lookbackMs;
  const fromIso = new Date(fromMs).toISOString().slice(0, 10);
  const isCreditCard = (conn.account_type ?? '').toLowerCase() === 'credit_card';

  // Plano de contas (match direto) + regras aprendidas (memória)
  const { prefixToMacro, extIdToRubrica } = await carregarPlanoDeContas(supabase, conn.client_id);
  const regras = await carregarRegras(supabase, conn.client_id);

  let txs: MCPTransaction[] = [];
  try { txs = await fetchAllTransactions(apiKey, baseUrl, conn.external_account_id, fromIso); }
  catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await supabase.from('bank_sync_log').update({ finished_at: new Date().toISOString(), status: 'error', error_message: msg }).eq('id', logId);
    await supabase.from('bank_connections').update({ status: 'error', last_sync_error: msg }).eq('id', conn.id);
    return { connection_id: conn.id, account_id: conn.external_account_id, institution_name: conn.institution_name, fetched: 0, inserted: 0, skipped: 0, status: 'error', error: msg };
  }

  // IDs de regras que vamos incrementar hits/ultima_aplicacao depois do insert
  const regrasUsadas = new Set<string>();

  const rows = txs.map((tx) => {
    const comp = competenciaFromDate(tx.date);
    const { valor, eh_receita, eh_pagamento_fatura } = normalizarValor(tx.amount, tx.type, isCreditCard, tx.categoryId);

    // 1) Tenta regra aprendida primeiro (mais específica que o match Pluggy)
    const matchKey = makeMatchKey(tx.merchant, tx.description);
    const regra = matchKey !== 'd:' && matchKey !== 'm:' ? regras.get(matchKey) : undefined;

    // 2) Fallback: match pelo categoryId do provedor
    const prefix = (tx.categoryId ?? '').slice(0, 2);
    const fallback_categoria = prefixToMacro.get(prefix) ?? null;
    const fallback_rubrica = tx.categoryId ? extIdToRubrica.get(tx.categoryId) ?? null : null;

    const categoria_id = regra?.categoria_id ?? fallback_categoria;
    const rubrica_id = regra?.rubrica_id ?? fallback_rubrica;
    const centro_id = regra?.centro_id ?? null;

    if (regra) regrasUsadas.add(regra.id);

    return {
      client_id: conn.client_id, bank_connection_id: conn.id, external_id: tx.id,
      origem_externa: conn.institution_name, data: comp.data,
      descricao: (tx.description || '').slice(0, 500), valor,
      categoria: tx.category ?? null, categoria_externa_id: tx.categoryId ?? null,
      categoria_id, rubrica_id, subcategoria: null,
      mes: comp.mes, mes_num: comp.mes_num, ano: comp.ano,
      competencia: comp.competencia, tipo: eh_receita ? 'receita' : 'pessoal',
      eh_receita, eh_pagamento_fatura,
      status_transacao: (tx.status ?? 'POSTED').toLowerCase(),
      merchant: tx.merchant ?? null,
      payment_method: tx.paymentData?.paymentMethod ?? null,
      counterparty: tx.paymentData?.payer ?? tx.paymentData?.receiver ?? null,
      centro_id, revisado: false, hash: hashTx(conn.id, tx),
    };
  });

  let inserted = 0; let skipped = 0;
  if (rows.length > 0) {
    const externalIds = rows.map((r) => r.external_id);
    const existentesSet = new Set<string>();
    for (let i = 0; i < externalIds.length; i += 300) {
      const chunk = externalIds.slice(i, i + 300);
      const { data: ex } = await supabase.from('controle_mensal_lancamentos').select('external_id').eq('bank_connection_id', conn.id).in('external_id', chunk);
      for (const e of ex ?? []) existentesSet.add(e.external_id as string);
    }
    const novos = rows.filter((r) => !existentesSet.has(r.external_id));
    skipped = rows.length - novos.length;
    if (novos.length > 0) {
      const { data: ins, error } = await supabase.from('controle_mensal_lancamentos').insert(novos).select('id');
      if (error) { await supabase.from('bank_sync_log').update({ finished_at: new Date().toISOString(), status: 'partial', transactions_fetched: txs.length, error_message: error.message }).eq('id', logId); return { connection_id: conn.id, account_id: conn.external_account_id, institution_name: conn.institution_name, fetched: txs.length, inserted: 0, skipped: txs.length, status: 'error', error: error.message }; }
      inserted = ins?.length ?? 0;
    }
  }

  // Atualiza estatísticas das regras usadas (best-effort, não bloqueia o sync)
  if (regrasUsadas.size > 0 && inserted > 0) {
    for (const regraId of regrasUsadas) {
      await supabase.rpc('increment_regra_hit', { regra_id: regraId }).catch(() => {});
    }
  }

  await supabase.from('bank_connections').update({ last_sync_at: new Date().toISOString(), last_sync_error: null, status: 'active' }).eq('id', conn.id);
  await supabase.from('bank_sync_log').update({ finished_at: new Date().toISOString(), status: 'success', transactions_fetched: txs.length, transactions_inserted: inserted, transactions_skipped: skipped }).eq('id', logId);
  return { connection_id: conn.id, account_id: conn.external_account_id, institution_name: conn.institution_name, fetched: txs.length, inserted, skipped, status: 'success', regras_aplicadas: regrasUsadas.size };
}

Deno.serve(async (req: Request) => {
  const apiKey = Deno.env.get('BANCO_MCP_API_KEY');
  const baseUrl = Deno.env.get('BANCO_MCP_BASE_URL') ?? 'https://api.mcp.ai';
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (!apiKey) return new Response(JSON.stringify({ error: 'BANCO_MCP_API_KEY não configurada' }), { status: 500, headers: { 'content-type': 'application/json' } });
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let body: { client_id?: string; bank_connection_id?: string; triggered_by?: string } = {};
  if (req.body && req.headers.get('content-type')?.includes('json')) { try { body = await req.json(); } catch {} }
  const triggeredBy = body.triggered_by ?? 'cron';
  let q = supabase.from('bank_connections').select('id, client_id, external_account_id, account_type, institution_name, status, last_sync_at, initial_lookback_days').eq('status', 'active');
  if (body.bank_connection_id) q = q.eq('id', body.bank_connection_id);
  else if (body.client_id) q = q.eq('client_id', body.client_id);
  const { data: connections, error: cErr } = await q;
  if (cErr) return new Response(JSON.stringify({ error: cErr.message }), { status: 500, headers: { 'content-type': 'application/json' } });
  const results: SyncResult[] = [];
  for (const conn of (connections ?? []) as BankConnection[]) { results.push(await syncOneConnection(supabase, apiKey, baseUrl, conn, triggeredBy)); }
  return new Response(JSON.stringify({ ok: true, connections_processed: results.length, results }), { headers: { 'content-type': 'application/json' } });
});
