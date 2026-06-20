// Edge Function: sync-bank-transactions
//
// Sincroniza transações de contas bancárias conectadas via Banco MCP (Pluggy)
// preenchendo controle_mensal_lancamentos.
//
// Provedor: https://api.mcp.ai
//   POST /api/openfinance/transactions/list  { account_id, from, to, page, page_size }
//
// Triggers:
// - Agendado (pg_cron) sem body → processa todas as conexões ativas
// - Manual via UI: POST com { client_id? } ou { bank_connection_id? } pra escopo
//
// Env vars:
// - BANCO_MCP_API_KEY  : sk_live_...
// - BANCO_MCP_BASE_URL : default https://api.mcp.ai

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

interface BankConnection {
  id: string;
  client_id: string;
  external_account_id: string;
  account_type: string | null;     // 'checking' | 'savings' | 'credit_card' | ...
  institution_name: string | null; // 'Itaú' | 'Inter' | ...
  status: string;
  last_sync_at: string | null;
  initial_lookback_days: number;
}

interface MCPTransaction {
  id: string;
  date: string;             // ISO timestamp "2026-06-12T02:59:00.000Z"
  description: string;
  amount: string;           // string! ex "-625.94"
  currencyCode: string;
  type: 'DEBIT' | 'CREDIT';
  status: 'POSTED' | 'PENDING';
  category?: string | null;
  categoryId?: string | null;
  operationType?: string | null;
  merchant?: string | null;
  paymentData?: {
    paymentMethod?: string | null;
    payer?: string | null;
    receiver?: string | null;
  } | null;
  creditCardMetadata?: {
    installmentNumber?: number;
    totalInstallments?: number;
    billId?: string;
  } | null;
}

interface MCPListResponse {
  // O wrapper {ok, result} pode ou não existir; tratamos os 2.
  ok?: boolean;
  result?: {
    total: number;
    page: number;
    totalPages: number;
    results: MCPTransaction[];
  };
  total?: number;
  page?: number;
  totalPages?: number;
  results?: MCPTransaction[];
  error?: string;
  warning?: string;
}

const MESES_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];
const CATEGORY_ID_PAGAMENTO_FATURA = '05100000';

// Taxonomia macro (espelho de apps/web/src/lib/controle-mensal/taxonomia.ts).
// A Edge Function semeia isto automaticamente pra não depender do deploy do app.
const TAXONOMIA: Array<{ prefix: string; nome: string; tipo: string; cor: string; icone: string }> = [
  { prefix: '01', nome: 'Receitas', tipo: 'receita', cor: '#22c55e', icone: 'TrendingUp' },
  { prefix: '03', nome: 'Investimentos', tipo: 'ambos', cor: '#0ea5e9', icone: 'LineChart' },
  { prefix: '10', nome: 'Mercado', tipo: 'gasto', cor: '#16a34a', icone: 'ShoppingCart' },
  { prefix: '11', nome: 'Alimentação', tipo: 'gasto', cor: '#f97316', icone: 'Utensils' },
  { prefix: '17', nome: 'Moradia', tipo: 'gasto', cor: '#0284c7', icone: 'Home' },
  { prefix: '19', nome: 'Transporte', tipo: 'gasto', cor: '#f59e0b', icone: 'Car' },
  { prefix: '18', nome: 'Saúde', tipo: 'gasto', cor: '#ef4444', icone: 'Heart' },
  { prefix: '07', nome: 'Serviços', tipo: 'gasto', cor: '#8b5cf6', icone: 'Wrench' },
  { prefix: '09', nome: 'Serviços Digitais', tipo: 'gasto', cor: '#6366f1', icone: 'Monitor' },
  { prefix: '08', nome: 'Compras', tipo: 'gasto', cor: '#ec4899', icone: 'ShoppingBag' },
  { prefix: '21', nome: 'Lazer', tipo: 'gasto', cor: '#d946ef', icone: 'Smile' },
  { prefix: '12', nome: 'Viagens', tipo: 'gasto', cor: '#14b8a6', icone: 'Plane' },
  { prefix: '20', nome: 'Seguros', tipo: 'gasto', cor: '#64748b', icone: 'Shield' },
  { prefix: '15', nome: 'Impostos', tipo: 'gasto', cor: '#475569', icone: 'Landmark' },
  { prefix: '16', nome: 'Taxas Bancárias', tipo: 'gasto', cor: '#94a3b8', icone: 'Banknote' },
  { prefix: '02', nome: 'Empréstimos e Financiamentos', tipo: 'gasto', cor: '#b91c1c', icone: 'CreditCard' },
  { prefix: '06', nome: 'Obrigações Legais', tipo: 'gasto', cor: '#78716c', icone: 'Scale' },
  { prefix: '13', nome: 'Doações', tipo: 'gasto', cor: '#06b6d4', icone: 'HandHeart' },
  { prefix: '14', nome: 'Apostas', tipo: 'gasto', cor: '#a16207', icone: 'Dices' },
  { prefix: '05', nome: 'Transferências', tipo: 'ambos', cor: '#6b7280', icone: 'ArrowLeftRight' },
  { prefix: '04', nome: 'Transferências (mesma titularidade)', tipo: 'ambos', cor: '#9ca3af', icone: 'Repeat' },
  { prefix: '99', nome: 'Outros', tipo: 'ambos', cor: '#a8a29e', icone: 'Tag' },
];

const MACRO_ROOT_IDS = new Set([
  '01000000','02000000','03000000','04000000','05000000','06000000','07000000','08000000',
  '09000000','10000000','11000000','12000000','13000000','14000000','15000000','16000000',
  '17000000','18000000','19000000','20000000','21000000','99999999',
]);

/**
 * Garante categorias macro (por prefixo) E rubricas (filhas, por external_match_id).
 * Idempotente. Retorna os mapas pra mapeamento no sync.
 */
async function ensureCategorias(supabase: SupabaseClient, clientId: string): Promise<{
  prefixToMacro: Map<string, string>;
  extIdToRubrica: Map<string, string>;
}> {
  // 1. Macros
  const { data: existMacros } = await supabase
    .from('controle_mensal_categorias')
    .select('id, external_match_prefix')
    .eq('client_id', clientId)
    .is('parent_id', null)
    .not('external_match_prefix', 'is', null);
  const prefixToMacro = new Map<string, string>();
  for (const c of existMacros ?? []) prefixToMacro.set(c.external_match_prefix as string, c.id as string);

  const faltamMacro = TAXONOMIA.filter((t) => !prefixToMacro.has(t.prefix));
  if (faltamMacro.length > 0) {
    const { data: novos } = await supabase.from('controle_mensal_categorias').insert(
      faltamMacro.map((t, i) => ({
        client_id: clientId, nome: t.nome, tipo: t.tipo, cor: t.cor, icone: t.icone,
        external_match_prefix: t.prefix, ordem: 100 + i,
      })),
    ).select('id, external_match_prefix');
    for (const c of novos ?? []) prefixToMacro.set(c.external_match_prefix as string, c.id as string);
  }

  // 2. Rubricas (filhas) a partir da taxonomia do provedor
  const { data: refs } = await supabase
    .from('cm_provider_categories')
    .select('external_id, nome_pt, prefix');
  const { data: existRubricas } = await supabase
    .from('controle_mensal_categorias')
    .select('id, external_match_id')
    .eq('client_id', clientId)
    .not('external_match_id', 'is', null);
  const extIdToRubrica = new Map<string, string>();
  for (const c of existRubricas ?? []) extIdToRubrica.set(c.external_match_id as string, c.id as string);

  const faltamRub = (refs ?? []).filter(
    (r) => !MACRO_ROOT_IDS.has(r.external_id as string)
      && prefixToMacro.has(r.prefix as string)
      && !extIdToRubrica.has(r.external_id as string),
  );
  if (faltamRub.length > 0) {
    const { data: novas } = await supabase.from('controle_mensal_categorias').insert(
      faltamRub.map((r) => ({
        client_id: clientId,
        parent_id: prefixToMacro.get(r.prefix as string)!,
        nome: r.nome_pt as string,
        tipo: 'gasto',
        cor: '#94a3b8',
        icone: 'Tag',
        external_match_id: r.external_id as string,
        external_match_prefix: r.prefix as string,
        ordem: 50,
      })),
    ).select('id, external_match_id');
    for (const c of novas ?? []) extIdToRubrica.set(c.external_match_id as string, c.id as string);
  }

  return { prefixToMacro, extIdToRubrica };
}

function competenciaFromDate(iso: string): { mes: string; mes_num: number; ano: number; competencia: number; data: string } {
  const d = new Date(iso);
  const ano = d.getUTCFullYear();
  const mes_num = d.getUTCMonth() + 1;
  return {
    mes: MESES_PT[mes_num - 1]!,
    mes_num,
    ano,
    competencia: ano * 100 + mes_num,
    data: iso.slice(0, 10),
  };
}

/**
 * Normaliza valor + flag de receita conforme tipo de conta e tipo da transação.
 *
 * BANK (conta corrente/poupança):
 *   amount já vem com sinal natural: + entrada, - saída.
 *
 * CREDIT (cartão de crédito):
 *   amount POSITIVO + type=DEBIT  = compra → gasto (valor negativo)
 *   amount NEGATIVO + type=CREDIT = pagamento/estorno recebido → eh_pagamento_fatura
 */
function normalizarValor(
  amountStr: string,
  type: 'DEBIT' | 'CREDIT',
  isCreditCard: boolean,
  categoryId: string | null | undefined,
): { valor: number; eh_receita: boolean; eh_pagamento_fatura: boolean } {
  const raw = parseFloat(amountStr);
  if (isCreditCard) {
    if (type === 'DEBIT') {
      // Compra no cartão — gasto. amount geralmente positivo
      return { valor: -Math.abs(raw), eh_receita: false, eh_pagamento_fatura: false };
    }
    // type === 'CREDIT' no cartão = pagamento/estorno
    return { valor: Math.abs(raw), eh_receita: false, eh_pagamento_fatura: true };
  }
  // BANK: respeita sinal natural
  const eh_receita = raw > 0;
  // Pagamento de fatura em conta corrente: categoryId estável
  const eh_pgto = !eh_receita && categoryId === CATEGORY_ID_PAGAMENTO_FATURA;
  return { valor: raw, eh_receita, eh_pagamento_fatura: eh_pgto };
}

function hashTx(connId: string, tx: MCPTransaction): string {
  const raw = `${connId}|${tx.id}`;
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = ((h << 5) - h + raw.charCodeAt(i)) | 0;
  return `mcp-${h >>> 0}`;
}

async function fetchTransactionsPage(
  apiKey: string,
  baseUrl: string,
  accountId: string,
  fromIso: string,
  page: number,
): Promise<{ results: MCPTransaction[]; totalPages: number }> {
  const res = await fetch(`${baseUrl}/api/openfinance/transactions/list`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      account_id: accountId,
      from: fromIso,
      page,
      page_size: 500,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MCP API ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as MCPListResponse;
  if (json.error) throw new Error(json.error);
  const result = json.result ?? json; // suporta wrapper {ok,result} ou response direto
  const results = result.results ?? [];
  const totalPages = result.totalPages ?? 1;
  return { results, totalPages };
}

async function fetchAllTransactions(
  apiKey: string,
  baseUrl: string,
  accountId: string,
  fromIso: string,
): Promise<MCPTransaction[]> {
  const all: MCPTransaction[] = [];
  let page = 1;
  while (true) {
    const { results, totalPages } = await fetchTransactionsPage(apiKey, baseUrl, accountId, fromIso, page);
    all.push(...results);
    if (page >= totalPages || results.length === 0) break;
    page += 1;
    if (page > 50) break; // proteção
  }
  return all;
}

interface SyncResult {
  connection_id: string;
  account_id: string;
  institution_name: string | null;
  fetched: number;
  inserted: number;
  skipped: number;
  status: 'success' | 'error';
  error?: string;
}

async function syncOneConnection(
  supabase: SupabaseClient,
  apiKey: string,
  baseUrl: string,
  conn: BankConnection,
  triggeredBy: string,
): Promise<SyncResult> {
  const { data: logRow } = await supabase
    .from('bank_sync_log')
    .insert({
      bank_connection_id: conn.id,
      client_id: conn.client_id,
      triggered_by: triggeredBy,
    })
    .select('id')
    .single();
  const logId = logRow?.id as string;

  // Overlap de 3 dias pra pegar transações que mudaram de PENDING pra POSTED
  const lookbackMs = conn.initial_lookback_days * 24 * 60 * 60 * 1000;
  const fromMs = conn.last_sync_at
    ? new Date(conn.last_sync_at).getTime() - 3 * 24 * 60 * 60 * 1000
    : Date.now() - lookbackMs;
  const fromIso = new Date(fromMs).toISOString().slice(0, 10);

  const isCreditCard = (conn.account_type ?? '').toLowerCase() === 'credit_card';

  // Garante categorias macro + rubricas e devolve os mapas de match (auto-seed)
  const { prefixToMacro, extIdToRubrica } = await ensureCategorias(supabase, conn.client_id);

  // Mapa external_id → nome PT (rubrica como texto display em subcategoria)
  const { data: refsNome } = await supabase
    .from('cm_provider_categories')
    .select('external_id, nome_pt');
  const extIdToNome = new Map<string, string>();
  for (const r of refsNome ?? []) extIdToNome.set(r.external_id as string, r.nome_pt as string);

  let txs: MCPTransaction[] = [];
  try {
    txs = await fetchAllTransactions(apiKey, baseUrl, conn.external_account_id, fromIso);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await supabase.from('bank_sync_log').update({
      finished_at: new Date().toISOString(),
      status: 'error',
      error_message: msg,
    }).eq('id', logId);
    await supabase.from('bank_connections').update({
      status: 'error',
      last_sync_error: msg,
    }).eq('id', conn.id);
    return {
      connection_id: conn.id, account_id: conn.external_account_id, institution_name: conn.institution_name,
      fetched: 0, inserted: 0, skipped: 0, status: 'error', error: msg,
    };
  }

  const rows = txs.map((tx) => {
    const comp = competenciaFromDate(tx.date);
    const { valor, eh_receita, eh_pagamento_fatura } = normalizarValor(
      tx.amount, tx.type, isCreditCard, tx.categoryId,
    );
    // Categorização automática: categoria (macro) pelo prefixo, rubrica (folha) pelo id exato
    const prefix = (tx.categoryId ?? '').slice(0, 2);
    const categoria_id = prefixToMacro.get(prefix) ?? prefixToMacro.get('99') ?? null;
    const rubrica_id = tx.categoryId ? extIdToRubrica.get(tx.categoryId) ?? null : null;
    const rubricaNome = tx.categoryId ? extIdToNome.get(tx.categoryId) ?? null : null;
    return {
      client_id: conn.client_id,
      bank_connection_id: conn.id,
      external_id: tx.id,
      origem_externa: conn.institution_name,
      data: comp.data,
      descricao: (tx.description || '').slice(0, 500),
      valor,
      categoria: tx.category ?? null,
      categoria_externa_id: tx.categoryId ?? null,
      categoria_id,
      rubrica_id,
      subcategoria: rubricaNome,
      mes: comp.mes,
      mes_num: comp.mes_num,
      ano: comp.ano,
      competencia: comp.competencia,
      tipo: eh_receita ? 'receita' : 'pessoal',
      eh_receita,
      eh_pagamento_fatura,
      status_transacao: (tx.status ?? 'POSTED').toLowerCase(),
      merchant: tx.merchant ?? null,
      payment_method: tx.paymentData?.paymentMethod ?? null,
      counterparty: tx.paymentData?.payer ?? tx.paymentData?.receiver ?? null,
      centro_id: null,
      revisado: false, // entra na fila de revisão — consultor valida antes de contar
      hash: hashTx(conn.id, tx),
    };
  });

  let inserted = 0;
  let skipped = 0;

  if (rows.length > 0) {
    // Descobre quais external_ids já existem pra não sobrescrever o que o
    // consultor já revisou (categoria_id / centro_id / revisado).
    const externalIds = rows.map((r) => r.external_id);
    const existentesSet = new Set<string>();
    // chunk no .in() pra evitar URL gigante
    for (let i = 0; i < externalIds.length; i += 300) {
      const chunk = externalIds.slice(i, i + 300);
      const { data: ex } = await supabase
        .from('controle_mensal_lancamentos')
        .select('external_id')
        .eq('bank_connection_id', conn.id)
        .in('external_id', chunk);
      for (const e of ex ?? []) existentesSet.add(e.external_id as string);
    }

    const novos = rows.filter((r) => !existentesSet.has(r.external_id));
    const existentes = rows.filter((r) => existentesSet.has(r.external_id));

    // Insere os novos (entram revisado=false com categoria sugerida)
    if (novos.length > 0) {
      const { data: ins, error } = await supabase
        .from('controle_mensal_lancamentos')
        .insert(novos)
        .select('id');
      if (error) {
        await supabase.from('bank_sync_log').update({
          finished_at: new Date().toISOString(),
          status: 'partial',
          transactions_fetched: txs.length,
          error_message: error.message,
        }).eq('id', logId);
        return {
          connection_id: conn.id, account_id: conn.external_account_id, institution_name: conn.institution_name,
          fetched: txs.length, inserted: 0, skipped: txs.length, status: 'error', error: error.message,
        };
      }
      inserted = ins?.length ?? 0;
    }

    // Já existentes são IGNORADOS — não recadastra nem altera o que já está no
    // sistema (preserva categoria/rubrica/revisão que o consultor ajustou).
    skipped = existentes.length;
  }

  await supabase.from('bank_connections').update({
    last_sync_at: new Date().toISOString(),
    last_sync_error: null,
    status: 'active',
  }).eq('id', conn.id);

  await supabase.from('bank_sync_log').update({
    finished_at: new Date().toISOString(),
    status: 'success',
    transactions_fetched: txs.length,
    transactions_inserted: inserted,
    transactions_skipped: skipped,
  }).eq('id', logId);

  return {
    connection_id: conn.id,
    account_id: conn.external_account_id,
    institution_name: conn.institution_name,
    fetched: txs.length,
    inserted,
    skipped,
    status: 'success',
  };
}

Deno.serve(async (req: Request) => {
  const apiKey = Deno.env.get('BANCO_MCP_API_KEY');
  const baseUrl = Deno.env.get('BANCO_MCP_BASE_URL') ?? 'https://api.mcp.ai';
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'BANCO_MCP_API_KEY não configurada' }), {
      status: 500, headers: { 'content-type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: { client_id?: string; bank_connection_id?: string; triggered_by?: string } = {};
  if (req.body && req.headers.get('content-type')?.includes('json')) {
    try { body = await req.json(); } catch { /* ignore */ }
  }
  const triggeredBy = body.triggered_by ?? 'cron';

  let q = supabase
    .from('bank_connections')
    .select('id, client_id, external_account_id, account_type, institution_name, status, last_sync_at, initial_lookback_days')
    .eq('status', 'active');
  if (body.bank_connection_id) q = q.eq('id', body.bank_connection_id);
  else if (body.client_id) q = q.eq('client_id', body.client_id);

  const { data: connections, error: cErr } = await q;
  if (cErr) {
    return new Response(JSON.stringify({ error: cErr.message }), {
      status: 500, headers: { 'content-type': 'application/json' },
    });
  }

  const results: SyncResult[] = [];
  for (const conn of (connections ?? []) as BankConnection[]) {
    const r = await syncOneConnection(supabase, apiKey, baseUrl, conn, triggeredBy);
    results.push(r);
  }

  return new Response(JSON.stringify({
    ok: true,
    connections_processed: results.length,
    results,
  }), { headers: { 'content-type': 'application/json' } });
});
