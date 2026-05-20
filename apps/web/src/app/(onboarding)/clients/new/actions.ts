'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { OnboardingPayload } from './types';

export async function createClientFromOnboarding(payload: OnboardingPayload) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // 1) client
  const { data: clientRow, error: clientErr } = await supabase
    .from('clients')
    .insert({
      consultant_id: user.id,
      nome_completo: payload.nome_completo,
      data_nascimento: payload.data_nascimento,
      expectativa_vida_anos: payload.expectativa_vida_anos,
      idade_aposentadoria: payload.idade_aposentadoria,
      idade_reducao_trabalho: payload.idade_reducao_trabalho,
      perfil_carteira: payload.perfil_carteira,
      custom_retorno_aa: payload.perfil_carteira === 'custom' ? payload.custom_retorno_aa : null,
      custom_volatilidade_aa: payload.perfil_carteira === 'custom' ? payload.custom_volatilidade_aa : null,
      pais_residencia: 'BR',
    })
    .select('id')
    .single();
  if (clientErr || !clientRow) {
    return { ok: false as const, error: clientErr?.message ?? 'falha ao criar cliente' };
  }
  const client_id = clientRow.id;

  // 2) assets (estoque + fluxo)
  if (payload.assets.length > 0) {
    const { error } = await supabase.from('assets').insert(
      payload.assets.map((a) => ({
        client_id,
        nome: a.nome,
        tipo: a.tipo,
        natureza: a.natureza,
        valor: a.valor,
        idade_inicio: a.idade_inicio,
        idade_fim: a.idade_fim,
        indexado_inflacao: a.indexado_inflacao,
      })),
    );
    if (error) return { ok: false as const, error: error.message };
  }

  // 3) expenses
  if (payload.expenses.length > 0) {
    const { error } = await supabase.from('expenses').insert(
      payload.expenses.map((d) => ({
        client_id,
        categoria: d.categoria,
        descricao: d.descricao,
        valor_mensal: d.valor_mensal,
        idade_inicio: d.idade_inicio,
        idade_fim: d.idade_fim,
        indexado_inflacao: true,
        essencial: d.essencial,
      })),
    );
    if (error) return { ok: false as const, error: error.message };
  }

  // 4) events
  if (payload.events.length > 0) {
    const { error } = await supabase.from('events').insert(
      payload.events.map((ev) => ({
        client_id,
        tipo: ev.tipo,
        descricao: ev.descricao,
        valor: ev.valor,
        padrao_recorrencia: ev.padrao_recorrencia,
        idade_inicio: ev.idade_inicio,
        idade_fim: ev.idade_fim,
        intervalo_anos: ev.intervalo_anos,
        indexado_inflacao: ev.indexado_inflacao,
      })),
    );
    if (error) return { ok: false as const, error: error.message };
  }

  // 5) assumptions vinculado ao client (vai usar defaults da tabela; consultor pode editar depois)
  await supabase.from('assumptions').insert({ consultant_id: user.id, client_id });

  // 6) scenarios: base + otimista + pessimista (3 cenários iniciais)
  await supabase.from('scenarios').insert([
    { client_id, nome: 'Base',       tipo: 'base',       is_default: true  },
    { client_id, nome: 'Otimista',   tipo: 'otimista',   is_default: false },
    { client_id, nome: 'Pessimista', tipo: 'pessimista', is_default: false },
  ]);

  revalidatePath('/clients');
  return { ok: true as const, client_id };
}
