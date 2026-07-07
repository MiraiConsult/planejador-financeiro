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

export async function marcarConciliado(args: {
  client_id: string;
  id: string;
  conciliado: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const g = await checkOwner(args.client_id);
  if (!g.ok) return g;
  const { error } = await g.supabase
    .from('controle_mensal_lancamentos')
    .update({ conciliado: args.conciliado })
    .eq('id', args.id)
    .eq('client_id', args.client_id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/clients/${args.client_id}/controle-mensal/conciliacao`);
  return { ok: true };
}

/** Marca/desmarca vários de uma vez (ex.: conciliar todos do banco/mês). */
export async function marcarConciliadoEmMassa(args: {
  client_id: string;
  ids: string[];
  conciliado: boolean;
}): Promise<{ ok: boolean; error?: string; atualizados?: number }> {
  const g = await checkOwner(args.client_id);
  if (!g.ok) return g;
  if (!args.ids.length) return { ok: true, atualizados: 0 };

  let atualizados = 0;
  const LOTE = 200;
  for (let i = 0; i < args.ids.length; i += LOTE) {
    const slice = args.ids.slice(i, i + LOTE);
    const { error, count } = await g.supabase
      .from('controle_mensal_lancamentos')
      .update({ conciliado: args.conciliado }, { count: 'exact' })
      .eq('client_id', args.client_id)
      .in('id', slice);
    if (error) return { ok: false, error: error.message, atualizados };
    atualizados += count ?? slice.length;
  }
  revalidatePath(`/clients/${args.client_id}/controle-mensal/conciliacao`);
  return { ok: true, atualizados };
}
