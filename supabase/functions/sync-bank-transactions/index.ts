// Edge Function: sync-bank-transactions
//
// Sincroniza transações dos bancos conectados via Banco MCP / Pluggy
// preenchendo controle_mensal_lancamentos.
//
// Triggers:
// - Agendada via pg_cron 1x/dia (sem body — processa todas conexões ativas)
// - Manual via UI: POST com { client_id? } ou { bank_connection_id? } pra escopo único
//
// Env vars necessárias:
// - BANCO_MCP_API_KEY  : chave secreta do provedor (sk_live_...)
// - BANCO_MCP_BASE_URL : URL base da API REST (default: https://api.mcp.ai)
//
// Auth: requer service_role token no header Authorization (chamada via pg_cron
// passa pelo wrapper Supabase que injeta o token). Pra trigger manual da UI,
// a server action chama com o anon/auth do user e a função valida.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

interface BankConnection {
  id: string;
  client_id: string;
  provider: string;
  external_item_id: string;
  institution_name: string | null;
  account_type: string | null;
  status: string;
  last_sync_at: string | null;
  initial_lookback_days: number;
}

interface MCPTransaction {
  // Formato HIPOTÉTICO baseado em padrões Pluggy/Open Finance.
  // Vai precisar de ajuste quando você me passar 1 sample real do JSON.
  id: string;
  date: string; // ISO yyyy-mm-dd
  description: string;
  amount: number; // negativo = débito, positivo = crédito
  category?: string | null;
  type?: 'DEBIT' | 'CREDIT' | string;
  paymentData?: {
    payer?: string;
    receiver?: string;
  } | null;
  creditCardMetadata?: {
    installmentNumber?: number;
    totalInstallments?: number;
    billId?: string;
  } | null;
}

interface MCPTransactionsResponse {
  // Padrão paginado Pluggy
  results: MCPTransaction[];
  total: number;
  page: number;
  totalPages: number;
}

const MESES_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

function competenciaFromDate(iso: string): { mes: string; mes_num: number; ano: number; competencia: number } {
  const d = new Date(iso);
  const ano = d.getUTCFullYear();
  const mes_num = d.getUTCMonth() + 1;
  return {
    mes: MESES_PT[mes_num - 1]!,
    mes_num,
    ano,
    competencia: ano * 100 + mes_num,
  };
}

function isPagamentoFatura(tx: MCPTransaction): boolean {
  const desc = (tx.description || '').toLowerCase();
  return /pagamento\s+(de\s+)?fatura|pagto\s+fatura|pagto\s+cart[ãa]o/.test(desc);
}

function hashTx(connectionId: string, tx: MCPTransaction): string {
  const raw = `${connectionId}|${tx.date}|${tx.description.trim().toLowerCase()}|${tx.amount.toFixed(2)}`;
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = ((h << 5) - h + raw.charCodeAt(i)) | 0;
  return `mcp-${h >>> 0}`;
}

async function fetchTransactions(
  apiKey: string,
  baseUrl: string,
  itemId: string,
  fromIso: string,
): Promise<MCPTransaction[]> {
  // PLACEHOLDER — substitua o caminho/parâmetros quando confirmar o spec.
  // Padrão Pluggy: GET /transactions?itemId=...&from=...&pageSize=500
  const all: MCPTransaction[] = [];
  let page = 1;
  while (true) {
    const url = new URL(`${baseUrl}/transactions`);
    url.searchParams.set('itemId', itemId);
    url.searchParams.set('from', fromIso);
    url.searchParams.set('pageSize', '500');
    url.searchParams.set('page', String(page));

    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`MCP API ${res.status}: ${body.slice(0, 300)}`);
    }
    const json = (await res.json()) as MCPTransactionsResponse;
    all.push(...(json.results ?? []));
    if (page >= (json.totalPages ?? 1)) break;
    page += 1;
    if (page > 50) break; // proteção contra loop infinito
  }
  return all;
}

interface SyncResult {
  connection_id: string;
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
  // Cria log
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

  // Janela: a partir de last_sync_at, ou lookback inicial
  const fromIso = conn.last_sync_at
    ? new Date(new Date(conn.last_sync_at).getTime() - 1000 * 60 * 60 * 24 * 3).toISOString() // overlap de 3 dias pra pegar reconciliações
    : new Date(Date.now() - conn.initial_lookback_days * 24 * 60 * 60 * 1000).toISOString();

  let txs: MCPTransaction[] = [];
  try {
    txs = await fetchTransactions(apiKey, baseUrl, conn.external_item_id, fromIso.slice(0, 10));
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
    return { connection_id: conn.id, fetched: 0, inserted: 0, skipped: 0, status: 'error', error: msg };
  }

  // Mapeia e faz upsert
  const rows = txs.map((tx) => {
    const comp = competenciaFromDate(tx.date);
    const ehReceita = tx.amount > 0;
    const ehPgto = isPagamentoFatura(tx);
    return {
      client_id: conn.client_id,
      bank_connection_id: conn.id,
      external_id: tx.id,
      origem_externa: conn.institution_name,
      data: tx.date.slice(0, 10),
      descricao: tx.description.slice(0, 500),
      valor: tx.amount,
      categoria: tx.category ?? null,
      subcategoria: null,
      mes: comp.mes,
      mes_num: comp.mes_num,
      ano: comp.ano,
      competencia: comp.competencia,
      tipo: ehReceita ? 'receita' : 'pessoal',
      eh_receita: ehReceita,
      eh_pagamento_fatura: ehPgto,
      centro_id: null, // será preenchido pelo backfill ou manualmente
      hash: hashTx(conn.id, tx),
    };
  });

  let inserted = 0;
  let skipped = 0;

  if (rows.length > 0) {
    // Upsert com onConflict no índice único (bank_connection_id, external_id)
    const { data: insertedRows, error } = await supabase
      .from('controle_mensal_lancamentos')
      .upsert(rows, {
        onConflict: 'bank_connection_id,external_id',
        ignoreDuplicates: true,
      })
      .select('id');
    if (error) {
      await supabase.from('bank_sync_log').update({
        finished_at: new Date().toISOString(),
        status: 'partial',
        transactions_fetched: txs.length,
        error_message: error.message,
      }).eq('id', logId);
      return { connection_id: conn.id, fetched: txs.length, inserted: 0, skipped: txs.length, status: 'error', error: error.message };
    }
    inserted = insertedRows?.length ?? 0;
    skipped = rows.length - inserted;
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
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Parse body opcional pra escopo
  let body: { client_id?: string; bank_connection_id?: string; triggered_by?: string } = {};
  if (req.body && req.headers.get('content-type')?.includes('json')) {
    try {
      body = await req.json();
    } catch {
      // ignora body inválido
    }
  }
  const triggeredBy = body.triggered_by ?? 'cron';

  // Seleciona conexões a sincronizar
  let q = supabase
    .from('bank_connections')
    .select('id, client_id, provider, external_item_id, institution_name, account_type, status, last_sync_at, initial_lookback_days')
    .eq('status', 'active');
  if (body.bank_connection_id) q = q.eq('id', body.bank_connection_id);
  else if (body.client_id) q = q.eq('client_id', body.client_id);

  const { data: connections, error: cErr } = await q;
  if (cErr) {
    return new Response(JSON.stringify({ error: cErr.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
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
  }), {
    headers: { 'content-type': 'application/json' },
  });
});
