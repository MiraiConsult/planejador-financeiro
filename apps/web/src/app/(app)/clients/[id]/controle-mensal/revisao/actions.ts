'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

async function checkOwner(client_id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Não autenticado' };
  const { data: c } = await supabase.from('clients').select('id').eq('id', client_id).maybeSingle();
  if (!c) return { ok: false as const, error: 'Cliente não encontrado' };
  return { ok: true as const, supabase };
}

/** Atualiza categoria e/ou centro de um lançamento em revisão. */
export async function ajustarLancamento(args: {
  client_id: string;
  id: string;
  categoria_id?: string | null;
  centro_id?: string | null;
  eh_pagamento_fatura?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const g = await checkOwner(args.client_id);
  if (!g.ok) return g;
  const patch: Record<string, unknown> = {};
  if (args.categoria_id !== undefined) patch.categoria_id = args.categoria_id;
  if (args.centro_id !== undefined) patch.centro_id = args.centro_id;
  if (args.eh_pagamento_fatura !== undefined) patch.eh_pagamento_fatura = args.eh_pagamento_fatura;
  if (Object.keys(patch).length === 0) return { ok: true };

  const { error } = await g.supabase
    .from('controle_mensal_lancamentos')
    .update(patch)
    .eq('id', args.id)
    .eq('client_id', args.client_id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Aprova lançamentos (revisado = true). Lista de ids ou todos pendentes. */
export async function aprovarLancamentos(args: {
  client_id: string;
  ids?: string[];
  todos?: boolean;
}): Promise<{ ok: boolean; error?: string; aprovados?: number }> {
  const g = await checkOwner(args.client_id);
  if (!g.ok) return g;

  let q = g.supabase
    .from('controle_mensal_lancamentos')
    .update({ revisado: true }, { count: 'exact' })
    .eq('client_id', args.client_id)
    .eq('revisado', false);

  if (!args.todos) {
    if (!args.ids || args.ids.length === 0) return { ok: true, aprovados: 0 };
    q = q.in('id', args.ids);
  }

  const { error, count } = await q.select('id');
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clients/${args.client_id}/controle-mensal`);
  revalidatePath(`/clients/${args.client_id}/controle-mensal/revisao`);
  return { ok: true, aprovados: count ?? 0 };
}

/** Exclui lançamentos em revisão (descarta — não quero esse lançamento). */
export async function descartarLancamentos(args: {
  client_id: string;
  ids: string[];
}): Promise<{ ok: boolean; error?: string }> {
  const g = await checkOwner(args.client_id);
  if (!g.ok) return g;
  if (args.ids.length === 0) return { ok: true };
  const { error } = await g.supabase
    .from('controle_mensal_lancamentos')
    .delete()
    .eq('client_id', args.client_id)
    .eq('revisado', false)
    .in('id', args.ids);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/clients/${args.client_id}/controle-mensal/revisao`);
  revalidatePath(`/clients/${args.client_id}/controle-mensal`);
  return { ok: true };
}
