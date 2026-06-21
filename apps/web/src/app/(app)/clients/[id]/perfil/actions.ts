'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { PerfilInput } from './defaults';

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

  // Valida faixas: pelo menos 1, última com ate_idade=null, % entre 0 e 100,
  // idades crescentes.
  const faixas = args.input.alocacao_excedente ?? [];
  if (faixas.length === 0) return { ok: false, error: 'Defina ao menos uma faixa de alocação do excedente' };
  let ultimaIdade = -1;
  for (let i = 0; i < faixas.length; i++) {
    const f = faixas[i]!;
    if (f.pct_investido < 0 || f.pct_investido > 100) {
      return { ok: false, error: `Faixa ${i + 1}: % inválida (0–100)` };
    }
    if (i < faixas.length - 1) {
      if (f.ate_idade == null) return { ok: false, error: `Apenas a última faixa pode ser sem idade limite` };
      if (f.ate_idade <= ultimaIdade) return { ok: false, error: `Idades das faixas devem ser crescentes` };
      ultimaIdade = f.ate_idade;
    } else if (f.ate_idade != null && f.ate_idade <= ultimaIdade) {
      return { ok: false, error: `Idades das faixas devem ser crescentes` };
    }
  }
  // Última faixa sempre vira "até morrer"
  faixas[faixas.length - 1]!.ate_idade = null;

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
      alocacao_excedente: faixas,
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
