'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { TAXONOMIA_MACRO } from '@/lib/controle-mensal/taxonomia';

export interface DiscoveredAccount {
  external_account_id: string;
  external_item_id: string | null;
  bank: string | null;
  type_raw: string;
  subtype: string;
  subtype_label: string;
  account_type: string;
  account_name: string;
  account_number: string;
  balance: string;
  currency: string;
  owner: string | null;
  display_name: string;
}

async function checkOwner(client_id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Não autenticado' };
  const { data: c } = await supabase.from('clients').select('id').eq('id', client_id).maybeSingle();
  if (!c) return { ok: false as const, error: 'Cliente não encontrado' };
  return { ok: true as const, supabase, user_id: user.id };
}

async function callEdgeFunction<T>(supabase: Awaited<ReturnType<typeof createClient>>, fn: string, body: object): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return { ok: false, error: 'SUPABASE_URL não configurada' };
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, error: 'Sessão expirada' };
  const res = await fetch(`${supabaseUrl}/functions/v1/${fn}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({ error: 'Resposta inválida' }));
  if (!res.ok) return { ok: false, error: json.error ?? `HTTP ${res.status}` };
  return { ok: true, data: json as T };
}

/**
 * Lista as contas disponíveis no Banco MCP (todas as conexões do tenant).
 * Marca quais já estão conectadas a esse cliente.
 */
export async function descobrirContasDisponiveis(args: {
  client_id: string;
  item?: string;
}): Promise<{
  ok: boolean;
  error?: string;
  accounts?: (DiscoveredAccount & { ja_conectada: boolean; bank_connection_id?: string })[];
  connections_count?: number;
}> {
  const g = await checkOwner(args.client_id);
  if (!g.ok) return g;

  const res = await callEdgeFunction<{
    ok: boolean;
    total: number;
    connections: number;
    accounts: DiscoveredAccount[];
  }>(g.supabase, 'list-bank-accounts', args.item ? { item: args.item } : {});

  if (!res.ok) return { ok: false, error: res.error };

  // Quais accounts já estão na tabela bank_connections desse cliente?
  const { data: existentes } = await g.supabase
    .from('bank_connections')
    .select('id, external_account_id')
    .eq('client_id', args.client_id);
  const mapaExistentes = new Map<string, string>(
    (existentes ?? []).map((e) => [e.external_account_id, e.id]),
  );

  return {
    ok: true,
    connections_count: res.data.connections,
    accounts: res.data.accounts.map((a) => ({
      ...a,
      ja_conectada: mapaExistentes.has(a.external_account_id),
      bank_connection_id: mapaExistentes.get(a.external_account_id),
    })),
  };
}

/**
 * Cria várias bank_connections a partir das accounts descobertas no MCP.
 */
export async function adicionarContas(args: {
  client_id: string;
  accounts: DiscoveredAccount[];
  initial_lookback_days?: number;
}): Promise<{ ok: boolean; error?: string; inseridos?: number }> {
  const g = await checkOwner(args.client_id);
  if (!g.ok) return g;
  if (args.accounts.length === 0) return { ok: true, inseridos: 0 };

  const rows = args.accounts.map((a) => ({
    client_id: args.client_id,
    provider: 'banco_mcp',
    external_account_id: a.external_account_id,
    external_item_id: a.external_item_id,
    institution_name: a.bank ?? a.account_name,
    account_type: a.account_type,
    account_subtype: a.subtype,
    account_number: a.account_number,
    account_owner: a.owner,
    currency: a.currency,
    last_balance: parseFloat(a.balance) || null,
    last_balance_at: new Date().toISOString(),
    initial_lookback_days: args.initial_lookback_days ?? 90,
  }));

  const { error, count } = await g.supabase
    .from('bank_connections')
    .upsert(rows, { onConflict: 'provider,external_account_id', ignoreDuplicates: true, count: 'exact' });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clients/${args.client_id}/controle-mensal/bancos`);
  return { ok: true, inseridos: count ?? rows.length };
}

/**
 * Cadastra um banco/conta manualmente (sem MCP). Serve só como rótulo
 * para vincular na hora do lançamento — não sincroniza nada.
 */
export async function criarBancoManual(args: {
  client_id: string;
  nome: string;
  tipo?: string | null;
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  const g = await checkOwner(args.client_id);
  if (!g.ok) return g;
  const nome = args.nome.trim();
  if (!nome) return { ok: false, error: 'Nome do banco obrigatório' };

  const { data, error } = await g.supabase
    .from('bank_connections')
    .insert({
      client_id: args.client_id,
      provider: 'manual',
      // external_account_id é NOT NULL; gera um valor estável por nome.
      external_account_id: `manual:${crypto.randomUUID()}`,
      institution_name: nome,
      account_type: args.tipo?.trim() || null,
      status: 'active',
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clients/${args.client_id}/controle-mensal/bancos`);
  revalidatePath(`/clients/${args.client_id}/controle-mensal`);
  return { ok: true, id: data.id };
}

export async function renomearBanco(args: {
  client_id: string;
  id: string;
  nome: string;
}): Promise<{ ok: boolean; error?: string }> {
  const g = await checkOwner(args.client_id);
  if (!g.ok) return g;
  const nome = args.nome.trim();
  if (!nome) return { ok: false, error: 'Nome obrigatório' };
  const { error } = await g.supabase
    .from('bank_connections')
    .update({ institution_name: nome })
    .eq('id', args.id)
    .eq('client_id', args.client_id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/clients/${args.client_id}/controle-mensal/bancos`);
  return { ok: true };
}

export async function removerConexao(args: { client_id: string; id: string }): Promise<{ ok: boolean; error?: string }> {
  const g = await checkOwner(args.client_id);
  if (!g.ok) return g;
  const { error } = await g.supabase
    .from('bank_connections')
    .delete()
    .eq('id', args.id)
    .eq('client_id', args.client_id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/clients/${args.client_id}/controle-mensal/bancos`);
  return { ok: true };
}

export async function pausarConexao(args: {
  client_id: string;
  id: string;
  pause: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const g = await checkOwner(args.client_id);
  if (!g.ok) return g;
  const { error } = await g.supabase
    .from('bank_connections')
    .update({ status: args.pause ? 'paused' : 'active' })
    .eq('id', args.id)
    .eq('client_id', args.client_id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/clients/${args.client_id}/controle-mensal/bancos`);
  return { ok: true };
}

/**
 * Garante que o cliente tenha a taxonomia macro de categorias (idempotente).
 * Cada categoria carrega o external_match_prefix pra mapeamento automático
 * no sync. Só cria as que faltam (casa por prefixo).
 */
export async function semearCategoriasPadrao(client_id: string): Promise<{ ok: boolean; error?: string; criadas?: number }> {
  const g = await checkOwner(client_id);
  if (!g.ok) return g;

  const { data: existentes } = await g.supabase
    .from('controle_mensal_categorias')
    .select('external_match_prefix')
    .eq('client_id', client_id)
    .not('external_match_prefix', 'is', null);
  const jaTem = new Set((existentes ?? []).map((c) => c.external_match_prefix));

  const faltantes = TAXONOMIA_MACRO.filter((c) => !jaTem.has(c.prefix));
  if (faltantes.length === 0) return { ok: true, criadas: 0 };

  const rows = faltantes.map((c, i) => ({
    client_id,
    nome: c.nome,
    // Taxonomia usa 'receita'|'gasto'|'ambos'; tabela só aceita
    // 'receita'|'despesa'. 'gasto'/'ambos' viram 'despesa' (Receitas
    // continuam separadas na macro '01').
    tipo: c.tipo === 'receita' ? 'receita' : 'despesa',
    cor: c.cor,
    icone: c.icone,
    external_match_prefix: c.prefix,
    ordem: 100 + i, // depois das categorias manuais do consultor
  }));

  const { error, count } = await g.supabase
    .from('controle_mensal_categorias')
    .insert(rows, { count: 'exact' });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clients/${client_id}/controle-mensal`);
  return { ok: true, criadas: count ?? rows.length };
}

export async function sincronizarAgora(args: {
  client_id: string;
  bank_connection_id?: string;
}): Promise<{
  ok: boolean;
  error?: string;
  results?: Array<{ connection_id: string; institution_name: string | null; fetched: number; inserted: number; status: string; error?: string }>;
}> {
  const g = await checkOwner(args.client_id);
  if (!g.ok) return g;

  // Garante taxonomia de categorias antes de sincronizar (mapeamento automático)
  await semearCategoriasPadrao(args.client_id);

  const res = await callEdgeFunction<{ ok: boolean; results: Array<{ connection_id: string; institution_name: string | null; fetched: number; inserted: number; status: string; error?: string }> }>(
    g.supabase,
    'sync-bank-transactions',
    {
      client_id: args.client_id,
      bank_connection_id: args.bank_connection_id,
      triggered_by: 'manual',
    },
  );
  if (!res.ok) return { ok: false, error: res.error };

  revalidatePath(`/clients/${args.client_id}/controle-mensal/bancos`);
  revalidatePath(`/clients/${args.client_id}/controle-mensal`);
  return { ok: true, results: res.data.results };
}
