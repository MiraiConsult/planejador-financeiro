'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('current_user_is_admin');
  return data === true;
}

type AccaoAcesso = 'create' | 'reset_password' | 'send_reset' | 'revoke';

interface AcessoResult {
  ok: boolean;
  error?: string;
  email?: string;
  senha_gerada?: string;
  enviado_para?: string;
}

async function chamarEdge(payload: {
  action: AccaoAcesso;
  client_id: string;
  email?: string;
  password?: string;
}): Promise<AcessoResult> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, error: 'Sessão expirada' };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return { ok: false, error: 'SUPABASE_URL não configurada' };

  const res = await fetch(`${url}/functions/v1/admin-client-access`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const jsonResp = await res.json().catch(() => ({ error: 'Resposta inválida' }));
  if (!res.ok) return { ok: false, error: jsonResp.error ?? `HTTP ${res.status}` };
  revalidatePath('/clients');
  return { ok: true, ...jsonResp };
}

export async function criarAcessoCliente(args: { client_id: string; email: string; password?: string }) {
  if (!(await isAdmin())) return { ok: false, error: 'Acesso restrito a administradores' };
  return chamarEdge({ action: 'create', client_id: args.client_id, email: args.email, password: args.password });
}

export async function resetarSenhaCliente(args: { client_id: string; password?: string }) {
  if (!(await isAdmin())) return { ok: false, error: 'Acesso restrito a administradores' };
  return chamarEdge({ action: 'reset_password', client_id: args.client_id, password: args.password });
}

export async function enviarResetEmailCliente(args: { client_id: string }) {
  if (!(await isAdmin())) return { ok: false, error: 'Acesso restrito a administradores' };
  return chamarEdge({ action: 'send_reset', client_id: args.client_id });
}

export async function revogarAcessoCliente(args: { client_id: string }) {
  if (!(await isAdmin())) return { ok: false, error: 'Acesso restrito a administradores' };
  return chamarEdge({ action: 'revoke', client_id: args.client_id });
}
