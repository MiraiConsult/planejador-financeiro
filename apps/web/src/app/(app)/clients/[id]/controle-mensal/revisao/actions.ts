'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { makeMatchKey } from '@/lib/controle-mensal/match';

async function checkOwner(client_id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Não autenticado' };
  const { data: c } = await supabase.from('clients').select('id').eq('id', client_id).maybeSingle();
  if (!c) return { ok: false as const, error: 'Cliente não encontrado' };
  return { ok: true as const, supabase };
}

/** Atualiza categoria, rubrica e/ou centro de um lançamento em revisão. */
export async function ajustarLancamento(args: {
  client_id: string;
  id: string;
  categoria_id?: string | null;
  rubrica_id?: string | null;
  centro_id?: string | null;
  eh_pagamento_fatura?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const g = await checkOwner(args.client_id);
  if (!g.ok) return g;
  const patch: Record<string, unknown> = {};
  if (args.categoria_id !== undefined) patch.categoria_id = args.categoria_id;
  if (args.rubrica_id !== undefined) patch.rubrica_id = args.rubrica_id;
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

/** Cria uma categoria macro (parent null) e retorna. */
export async function criarCategoria(args: {
  client_id: string;
  nome: string;
  tipo?: 'receita' | 'despesa';
}): Promise<{ ok: boolean; error?: string; categoria?: { id: string; nome: string; tipo: string; cor: string; parent_id: null } }> {
  const g = await checkOwner(args.client_id);
  if (!g.ok) return g;
  const nome = args.nome.trim();
  if (!nome) return { ok: false, error: 'Nome vazio' };
  const tipo = args.tipo ?? 'despesa';
  const cor = tipo === 'receita' ? '#22c55e' : '#64748b';
  const { data, error } = await g.supabase
    .from('controle_mensal_categorias')
    .insert({
      client_id: args.client_id,
      parent_id: null,
      nome,
      tipo,
      cor,
      icone: 'Tag',
      ordem: 50,
    })
    .select('id, nome, tipo, cor')
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? 'falha' };
  return { ok: true, categoria: { ...data, parent_id: null } };
}

/** Cria uma rubrica (filha de uma categoria macro) e retorna. */
export async function criarRubrica(args: {
  client_id: string;
  parent_id: string;
  nome: string;
}): Promise<{ ok: boolean; error?: string; rubrica?: { id: string; nome: string; tipo: string; cor: string; parent_id: string } }> {
  const g = await checkOwner(args.client_id);
  if (!g.ok) return g;
  const nome = args.nome.trim();
  if (!nome) return { ok: false, error: 'Nome vazio' };
  if (!args.parent_id) return { ok: false, error: 'Selecione a categoria primeiro' };
  const { data, error } = await g.supabase
    .from('controle_mensal_categorias')
    .insert({
      client_id: args.client_id,
      parent_id: args.parent_id,
      nome,
      tipo: 'despesa',
      cor: '#94a3b8',
      icone: 'Tag',
      ordem: 50,
    })
    .select('id, nome, tipo, cor, parent_id')
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? 'falha' };
  return { ok: true, rubrica: data };
}

/**
 * Aprova lançamentos (revisado = true) E aprende com a categorização:
 * pra cada aprovado vindo de banco com categoria/rubrica preenchidas, cria
 * ou atualiza uma regra (match_key → categoria_id, rubrica_id). Próximos
 * syncs aplicam a regra automaticamente.
 */
export async function aprovarLancamentos(args: {
  client_id: string;
  ids?: string[];
  todos?: boolean;
}): Promise<{ ok: boolean; error?: string; aprovados?: number; regrasAprendidas?: number }> {
  const g = await checkOwner(args.client_id);
  if (!g.ok) return g;

  // 1) Lê os lançamentos que serão aprovados (precisa antes do UPDATE pra
  //    extrair merchant/descricao/categoria pro aprendizado).
  let q = g.supabase
    .from('controle_mensal_lancamentos')
    .select('id, descricao, merchant, categoria_id, rubrica_id, centro_id, bank_connection_id')
    .eq('client_id', args.client_id)
    .eq('revisado', false);
  if (!args.todos) {
    if (!args.ids || args.ids.length === 0) return { ok: true, aprovados: 0 };
    q = q.in('id', args.ids);
  }
  const { data: pendentes, error: errLer } = await q;
  if (errLer) return { ok: false, error: errLer.message };
  if (!pendentes || pendentes.length === 0) return { ok: true, aprovados: 0 };

  // 2) UPDATE pra revisado=true
  const ids = pendentes.map((p) => p.id as string);
  const { error: errUp } = await g.supabase
    .from('controle_mensal_lancamentos')
    .update({ revisado: true })
    .in('id', ids);
  if (errUp) return { ok: false, error: errUp.message };

  // 3) Aprendizado: upsert de regras pros que vieram de banco e estão categorizados
  const regrasMap = new Map<string, {
    match_key: string;
    categoria_id: string | null;
    rubrica_id: string | null;
    centro_id: string | null;
  }>();
  for (const l of pendentes) {
    // Só aprende com vindos de banco e que TÊM categorização definida
    if (!l.bank_connection_id) continue;
    if (!l.categoria_id && !l.rubrica_id) continue;
    const key = makeMatchKey(l.merchant as string | null, l.descricao as string);
    // 'd:' vazio não conta (descrição muito ruim pra match)
    if (key === 'd:' || key === 'm:') continue;
    // Última aprovação vence (sobrescreve em duplicatas no mesmo batch)
    regrasMap.set(key, {
      match_key: key,
      categoria_id: l.categoria_id as string | null,
      rubrica_id: l.rubrica_id as string | null,
      centro_id: l.centro_id as string | null,
    });
  }

  let regrasAprendidas = 0;
  if (regrasMap.size > 0) {
    const rows = [...regrasMap.values()].map((r) => ({
      client_id: args.client_id,
      match_key: r.match_key,
      categoria_id: r.categoria_id,
      rubrica_id: r.rubrica_id,
      centro_id: r.centro_id,
      origem: 'manual', // veio de aprovação do consultor
    }));
    const { error, count } = await g.supabase
      .from('controle_mensal_regras_categorizacao')
      .upsert(rows, { onConflict: 'client_id,match_key', count: 'exact' });
    if (!error) regrasAprendidas = count ?? rows.length;
  }

  revalidatePath(`/clients/${args.client_id}/controle-mensal`);
  revalidatePath(`/clients/${args.client_id}/controle-mensal/revisao`);
  return { ok: true, aprovados: ids.length, regrasAprendidas };
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
