'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface PerfilInput {
  nome_completo: string;
  data_nascimento: string; // ISO yyyy-mm-dd
  expectativa_vida_anos: number;
  idade_aposentadoria: number | null;
  idade_reducao_trabalho: number | null;
  perfil_carteira: 'conservador' | 'moderado' | 'arrojado' | 'custom';
  custom_retorno_aa: number | null;
  custom_volatilidade_aa: number | null;
  pais_residencia: string;
  estado_civil: string | null;
}

export async function salvarPerfil(args: {
  client_id: string;
  input: PerfilInput;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Não autenticado' };

  const nome = args.input.nome_completo.trim();
  if (!nome) return { ok: false, error: 'Nome obrigatório' };
  if (!args.input.data_nascimento) return { ok: false, error: 'Data de nascimento obrigatória' };
  if (!args.input.expectativa_vida_anos || args.input.expectativa_vida_anos < 1) {
    return { ok: false, error: 'Expectativa de vida inválida' };
  }

  const { error } = await supabase
    .from('clients')
    .update({
      nome_completo: nome,
      data_nascimento: args.input.data_nascimento,
      expectativa_vida_anos: args.input.expectativa_vida_anos,
      idade_aposentadoria: args.input.idade_aposentadoria,
      idade_reducao_trabalho: args.input.idade_reducao_trabalho,
      perfil_carteira: args.input.perfil_carteira,
      custom_retorno_aa: args.input.perfil_carteira === 'custom' ? args.input.custom_retorno_aa : null,
      custom_volatilidade_aa: args.input.perfil_carteira === 'custom' ? args.input.custom_volatilidade_aa : null,
      pais_residencia: args.input.pais_residencia || 'BR',
      estado_civil: args.input.estado_civil,
    })
    .eq('id', args.client_id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clients/${args.client_id}/perfil`);
  revalidatePath(`/clients/${args.client_id}/balanco`);
  revalidatePath(`/clients/${args.client_id}/controle-mensal`);
  revalidatePath(`/clients/${args.client_id}`);
  revalidatePath('/clients');
  return { ok: true };
}
