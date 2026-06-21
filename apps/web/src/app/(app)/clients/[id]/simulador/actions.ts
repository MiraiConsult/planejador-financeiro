'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { SimuladorState } from '@/lib/simuladorState';

export async function salvarCenarioPersonalizado(args: {
  client_id: string;
  nome: string;
  state: SimuladorState;
}): Promise<{ ok: boolean; error?: string; scenario_id?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Não autenticado' };

  const nome = args.nome.trim();
  if (!nome) return { ok: false, error: 'Dê um nome ao cenário' };
  if (nome.length > 100) return { ok: false, error: 'Nome com até 100 caracteres' };

  const { data, error } = await supabase
    .from('scenarios')
    .insert({
      client_id: args.client_id,
      nome,
      tipo: 'personalizado',
      simulador_state: args.state as unknown as Record<string, unknown>,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clients/${args.client_id}/compare`);
  revalidatePath(`/clients/${args.client_id}/simulador`);
  return { ok: true, scenario_id: data.id };
}
