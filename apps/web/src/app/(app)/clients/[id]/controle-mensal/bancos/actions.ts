'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface BankConnectionInput {
  external_item_id: string;
  institution_name: string;
  account_type?: 'checking' | 'savings' | 'credit_card' | 'investment' | 'loan' | 'other';
  initial_lookback_days?: number;
}

async function checkOwner(client_id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Não autenticado' };
  const { data: c } = await supabase.from('clients').select('id').eq('id', client_id).maybeSingle();
  if (!c) return { ok: false as const, error: 'Cliente não encontrado' };
  return { ok: true as const, supabase, user_id: user.id };
}

export async function adicionarConexao(args: {
  client_id: string;
  input: BankConnectionInput;
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  const g = await checkOwner(args.client_id);
  if (!g.ok) return g;
  const { external_item_id, institution_name, account_type, initial_lookback_days } = args.input;
  if (!external_item_id.trim()) return { ok: false, error: 'Informe o item_id' };
  if (!institution_name.trim()) return { ok: false, error: 'Informe o nome do banco' };

  const { data, error } = await g.supabase
    .from('bank_connections')
    .insert({
      client_id: args.client_id,
      provider: 'banco_mcp',
      external_item_id: external_item_id.trim(),
      institution_name: institution_name.trim(),
      account_type: account_type ?? 'checking',
      initial_lookback_days: initial_lookback_days ?? 90,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clients/${args.client_id}/controle-mensal/bancos`);
  return { ok: true, id: data.id };
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
 * Dispara sync manual da Edge Function. Pode ser de uma conexão única
 * (bank_connection_id) ou de todas do cliente.
 */
export async function sincronizarAgora(args: {
  client_id: string;
  bank_connection_id?: string;
}): Promise<{ ok: boolean; error?: string; results?: Array<{ connection_id: string; fetched: number; inserted: number; status: string; error?: string }> }> {
  const g = await checkOwner(args.client_id);
  if (!g.ok) return g;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return { ok: false, error: 'SUPABASE_URL não configurada' };

  // Pega o access token do user logado pra passar pra edge function
  const { data: { session } } = await g.supabase.auth.getSession();
  if (!session) return { ok: false, error: 'Sessão expirada' };

  const res = await fetch(`${supabaseUrl}/functions/v1/sync-bank-transactions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: args.client_id,
      bank_connection_id: args.bank_connection_id,
      triggered_by: 'manual',
    }),
  });

  const json = await res.json().catch(() => ({ error: 'Resposta inválida' }));
  if (!res.ok) {
    return { ok: false, error: json.error ?? `HTTP ${res.status}` };
  }

  revalidatePath(`/clients/${args.client_id}/controle-mensal/bancos`);
  revalidatePath(`/clients/${args.client_id}/controle-mensal`);
  return { ok: true, results: json.results };
}
