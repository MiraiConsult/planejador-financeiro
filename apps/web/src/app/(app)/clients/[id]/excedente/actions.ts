'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function registrarAcaoExcedente(args: {
  client_id: string;
  idade: number | null;
  acao: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Não autenticado' };

  const acao = args.acao.trim();
  if (!acao) return { ok: false, error: 'Descreva a ação' };
  if (acao.length > 500) return { ok: false, error: 'Ação com até 500 caracteres' };

  const { error } = await supabase.from('excedente_acoes').insert({
    client_id: args.client_id,
    idade: args.idade,
    acao,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clients/${args.client_id}/balanco`);
  revalidatePath(`/clients/${args.client_id}/perfil`);
  return { ok: true };
}

export async function removerAcaoExcedente(args: {
  client_id: string;
  id: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Não autenticado' };

  const { error } = await supabase.from('excedente_acoes').delete().eq('id', args.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clients/${args.client_id}/balanco`);
  revalidatePath(`/clients/${args.client_id}/perfil`);
  return { ok: true };
}
