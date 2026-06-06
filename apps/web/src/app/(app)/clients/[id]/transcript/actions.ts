'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { RefinementPatch } from '@/lib/ai/refineSchema';

export async function saveTranscricao(args: { client_id: string; texto: string }) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('clients')
    .update({ transcricao: args.texto })
    .eq('id', args.client_id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/clients/${args.client_id}`);
  revalidatePath(`/clients/${args.client_id}/transcript`);
  return { ok: true as const };
}

/**
 * Aplica o patch da IA no banco. Aceita o JSON do RefinementPatch.
 */
export async function applyRefinementPatch(args: {
  client_id: string;
  patch: RefinementPatch;
}): Promise<{ ok: true; aplicado: number } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { client_id, patch } = args;
  let aplicado = 0;

  // ─── Cliente ───
  if (patch.cliente_updates) {
    const u: Record<string, unknown> = {};
    if (patch.cliente_updates.nome_completo) u.nome_completo = patch.cliente_updates.nome_completo;
    if (patch.cliente_updates.data_nascimento) u.data_nascimento = patch.cliente_updates.data_nascimento;
    if (patch.cliente_updates.expectativa_vida_anos != null)
      u.expectativa_vida_anos = patch.cliente_updates.expectativa_vida_anos;
    if (patch.cliente_updates.idade_aposentadoria != null)
      u.idade_aposentadoria = patch.cliente_updates.idade_aposentadoria;
    if (patch.cliente_updates.perfil_carteira) u.perfil_carteira = patch.cliente_updates.perfil_carteira;
    if (Object.keys(u).length > 0) {
      const { error } = await supabase.from('clients').update(u).eq('id', client_id);
      if (error) return { ok: false, error: `cliente: ${error.message}` };
      aplicado++;
    }
  }

  // ─── Perfil subjetivo ───
  if (patch.perfil_updates) {
    const { data: cur } = await supabase
      .from('clients')
      .select('perfil_subjetivo')
      .eq('id', client_id)
      .single();
    const perfil = { ...((cur?.perfil_subjetivo as Record<string, unknown>) ?? {}) };
    for (const [k, v] of Object.entries(patch.perfil_updates)) {
      if (v !== undefined) perfil[k] = v;
    }
    const { error } = await supabase
      .from('clients')
      .update({ perfil_subjetivo: perfil })
      .eq('id', client_id);
    if (error) return { ok: false, error: `perfil: ${error.message}` };
    aplicado++;
  }

  // ─── Helper de busca por nome/descrição ───
  async function findIdByMatch(table: string, field: string, value: string): Promise<string | null> {
    const { data } = await supabase
      .from(table)
      .select('id')
      .eq('client_id', client_id)
      .ilike(field, value.trim())
      .is('deleted_at', null)
      .limit(1);
    return data?.[0]?.id ?? null;
  }

  // ─── Assets ───
  for (const add of patch.assets_add ?? []) {
    const { error } = await supabase.from('assets').insert({
      client_id,
      nome: add.nome,
      tipo: add.tipo,
      natureza: add.natureza,
      valor: add.valor,
      idade_inicio: add.idade_inicio,
      idade_fim: add.idade_fim,
      indexado_inflacao: true,
      crescimento_real_aa: add.crescimento_real_aa_pct != null ? add.crescimento_real_aa_pct / 100 : null,
    });
    if (error) return { ok: false, error: `assets_add: ${error.message}` };
    aplicado++;
  }
  for (const upd of patch.assets_update ?? []) {
    const id = await findIdByMatch('assets', 'nome', upd.match_descricao);
    if (!id) continue;
    const u: Record<string, unknown> = {};
    if (upd.novo_nome) u.nome = upd.novo_nome;
    if (upd.novo_valor != null) u.valor = upd.novo_valor;
    if (upd.nova_idade_inicio != null) u.idade_inicio = upd.nova_idade_inicio;
    if (upd.nova_idade_fim != null) u.idade_fim = upd.nova_idade_fim;
    if (upd.novo_crescimento_real_aa_pct != null)
      u.crescimento_real_aa = upd.novo_crescimento_real_aa_pct / 100;
    if (Object.keys(u).length === 0) continue;
    const { error } = await supabase.from('assets').update(u).eq('id', id);
    if (error) return { ok: false, error: `assets_update: ${error.message}` };
    aplicado++;
  }
  for (const rem of patch.assets_remove ?? []) {
    const id = await findIdByMatch('assets', 'nome', rem.match_descricao);
    if (!id) continue;
    await supabase
      .from('assets')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    aplicado++;
  }

  // ─── Expenses ───
  for (const add of patch.expenses_add ?? []) {
    const { error } = await supabase.from('expenses').insert({
      client_id,
      categoria: add.categoria,
      descricao: add.descricao,
      valor_mensal: add.valor_mensal,
      idade_inicio: add.idade_inicio,
      idade_fim: add.idade_fim,
      indexado_inflacao: true,
      essencial: add.essencial,
    });
    if (error) return { ok: false, error: `expenses_add: ${error.message}` };
    aplicado++;
  }
  for (const upd of patch.expenses_update ?? []) {
    const id = await findIdByMatch('expenses', 'descricao', upd.match_descricao);
    if (!id) continue;
    const u: Record<string, unknown> = {};
    if (upd.nova_descricao) u.descricao = upd.nova_descricao;
    if (upd.novo_valor_mensal != null) u.valor_mensal = upd.novo_valor_mensal;
    if (upd.nova_idade_inicio != null) u.idade_inicio = upd.nova_idade_inicio;
    if (upd.nova_idade_fim != null) u.idade_fim = upd.nova_idade_fim;
    if (upd.novo_essencial != null) u.essencial = upd.novo_essencial;
    if (Object.keys(u).length === 0) continue;
    const { error } = await supabase.from('expenses').update(u).eq('id', id);
    if (error) return { ok: false, error: `expenses_update: ${error.message}` };
    aplicado++;
  }
  for (const rem of patch.expenses_remove ?? []) {
    const id = await findIdByMatch('expenses', 'descricao', rem.match_descricao);
    if (!id) continue;
    await supabase
      .from('expenses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    aplicado++;
  }

  // ─── Events ───
  for (const add of patch.events_add ?? []) {
    const { error } = await supabase.from('events').insert({
      client_id,
      tipo: add.tipo,
      descricao: add.descricao,
      valor: add.valor,
      padrao_recorrencia: add.padrao_recorrencia,
      idade_inicio: add.idade_inicio,
      idade_fim: add.idade_fim ?? null,
      intervalo_anos: add.intervalo_anos ?? null,
      indexado_inflacao: true,
    });
    if (error) return { ok: false, error: `events_add: ${error.message}` };
    aplicado++;
  }
  for (const upd of patch.events_update ?? []) {
    const id = await findIdByMatch('events', 'descricao', upd.match_descricao);
    if (!id) continue;
    const u: Record<string, unknown> = {};
    if (upd.nova_descricao) u.descricao = upd.nova_descricao;
    if (upd.novo_valor != null) u.valor = upd.novo_valor;
    if (upd.nova_idade_inicio != null) u.idade_inicio = upd.nova_idade_inicio;
    if (upd.nova_idade_fim != null) u.idade_fim = upd.nova_idade_fim;
    if (upd.nova_recorrencia) u.padrao_recorrencia = upd.nova_recorrencia;
    if (upd.novo_intervalo_anos != null) u.intervalo_anos = upd.novo_intervalo_anos;
    if (Object.keys(u).length === 0) continue;
    const { error } = await supabase.from('events').update(u).eq('id', id);
    if (error) return { ok: false, error: `events_update: ${error.message}` };
    aplicado++;
  }
  for (const rem of patch.events_remove ?? []) {
    const id = await findIdByMatch('events', 'descricao', rem.match_descricao);
    if (!id) continue;
    await supabase
      .from('events')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    aplicado++;
  }

  // ─── Liabilities ───
  for (const add of patch.liabilities_add ?? []) {
    const { error } = await supabase.from('liabilities').insert({
      client_id,
      nome: add.nome,
      tipo: add.tipo,
      saldo_atual: add.saldo_atual,
      juros_aa: add.juros_aa_pct != null ? add.juros_aa_pct / 100 : null,
      parcela_mensal: add.parcela_mensal,
      idade_inicio: add.idade_inicio,
      idade_fim: add.idade_fim,
    });
    if (error) return { ok: false, error: `liabilities_add: ${error.message}` };
    aplicado++;
  }
  for (const upd of patch.liabilities_update ?? []) {
    const id = await findIdByMatch('liabilities', 'nome', upd.match_descricao);
    if (!id) continue;
    const u: Record<string, unknown> = {};
    if (upd.novo_nome) u.nome = upd.novo_nome;
    if (upd.novo_saldo_atual != null) u.saldo_atual = upd.novo_saldo_atual;
    if (upd.novo_juros_aa_pct != null) u.juros_aa = upd.novo_juros_aa_pct / 100;
    if (upd.nova_parcela_mensal != null) u.parcela_mensal = upd.nova_parcela_mensal;
    if (upd.nova_idade_inicio != null) u.idade_inicio = upd.nova_idade_inicio;
    if (upd.nova_idade_fim != null) u.idade_fim = upd.nova_idade_fim;
    if (Object.keys(u).length === 0) continue;
    const { error } = await supabase.from('liabilities').update(u).eq('id', id);
    if (error) return { ok: false, error: `liabilities_update: ${error.message}` };
    aplicado++;
  }
  for (const rem of patch.liabilities_remove ?? []) {
    const id = await findIdByMatch('liabilities', 'nome', rem.match_descricao);
    if (!id) continue;
    await supabase
      .from('liabilities')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    aplicado++;
  }

  revalidatePath(`/clients/${client_id}`);
  revalidatePath(`/clients/${client_id}/edit`);
  revalidatePath(`/clients/${client_id}/transcript`);
  return { ok: true, aplicado };
}
