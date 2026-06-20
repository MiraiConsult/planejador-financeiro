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

function revalidar(client_id: string) {
  revalidatePath(`/clients/${client_id}/controle-mensal/dados-cadastrais`);
  revalidatePath(`/clients/${client_id}/controle-mensal/revisao`);
  revalidatePath(`/clients/${client_id}/controle-mensal`);
}

export interface CategoriaInput {
  nome: string;
  tipo: 'receita' | 'despesa';
  cor?: string;
}

export interface RubricaInput {
  parent_id: string;
  nome: string;
}

export async function criarCategoria(args: {
  client_id: string;
  input: CategoriaInput;
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  const g = await checkOwner(args.client_id);
  if (!g.ok) return g;
  const nome = args.input.nome.trim();
  if (!nome) return { ok: false, error: 'Nome obrigatório' };
  const cor = args.input.cor ?? (args.input.tipo === 'receita' ? '#22c55e' : '#64748b');

  // Próxima ordem = max + 1 entre as raízes do mesmo tipo
  const { data: maxRow } = await g.supabase
    .from('controle_mensal_categorias')
    .select('ordem')
    .eq('client_id', args.client_id)
    .is('parent_id', null)
    .eq('tipo', args.input.tipo)
    .order('ordem', { ascending: false })
    .limit(1);
  const ordem = ((maxRow?.[0]?.ordem as number) ?? 0) + 1;

  const { data, error } = await g.supabase
    .from('controle_mensal_categorias')
    .insert({
      client_id: args.client_id,
      parent_id: null,
      nome,
      tipo: args.input.tipo,
      cor,
      icone: 'Tag',
      ordem,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidar(args.client_id);
  return { ok: true, id: data?.id };
}

export async function criarRubrica(args: {
  client_id: string;
  input: RubricaInput;
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  const g = await checkOwner(args.client_id);
  if (!g.ok) return g;
  const nome = args.input.nome.trim();
  if (!nome) return { ok: false, error: 'Nome obrigatório' };

  const { data: parent } = await g.supabase
    .from('controle_mensal_categorias')
    .select('tipo')
    .eq('id', args.input.parent_id)
    .eq('client_id', args.client_id)
    .maybeSingle();
  if (!parent) return { ok: false, error: 'Categoria-pai não encontrada' };

  const { data: maxRow } = await g.supabase
    .from('controle_mensal_categorias')
    .select('ordem')
    .eq('client_id', args.client_id)
    .eq('parent_id', args.input.parent_id)
    .order('ordem', { ascending: false })
    .limit(1);
  const ordem = ((maxRow?.[0]?.ordem as number) ?? 0) + 1;

  const { data, error } = await g.supabase
    .from('controle_mensal_categorias')
    .insert({
      client_id: args.client_id,
      parent_id: args.input.parent_id,
      nome,
      tipo: parent.tipo,
      cor: '#94a3b8',
      icone: 'Tag',
      ordem,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidar(args.client_id);
  return { ok: true, id: data?.id };
}

export async function atualizarItem(args: {
  client_id: string;
  id: string;
  patch: { nome?: string; cor?: string; tipo?: 'receita' | 'despesa' };
}): Promise<{ ok: boolean; error?: string }> {
  const g = await checkOwner(args.client_id);
  if (!g.ok) return g;
  const patch: Record<string, unknown> = {};
  if (args.patch.nome !== undefined) {
    const n = args.patch.nome.trim();
    if (!n) return { ok: false, error: 'Nome vazio' };
    patch.nome = n;
  }
  if (args.patch.cor !== undefined) patch.cor = args.patch.cor;
  if (args.patch.tipo !== undefined) patch.tipo = args.patch.tipo;

  const { error } = await g.supabase
    .from('controle_mensal_categorias')
    .update(patch)
    .eq('id', args.id)
    .eq('client_id', args.client_id);
  if (error) return { ok: false, error: error.message };
  revalidar(args.client_id);
  return { ok: true };
}

/**
 * Exclui. Hard delete se não houver lançamentos vinculados (categoria ou rubrica),
 * senão soft delete (ativo=false).
 */
export async function excluirItem(args: {
  client_id: string;
  id: string;
}): Promise<{ ok: boolean; error?: string; soft?: boolean }> {
  const g = await checkOwner(args.client_id);
  if (!g.ok) return g;

  // Em uso por algum lançamento? (categoria_id OU rubrica_id)
  const { count: cnt1 } = await g.supabase
    .from('controle_mensal_lancamentos')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', args.client_id)
    .eq('categoria_id', args.id);
  const { count: cnt2 } = await g.supabase
    .from('controle_mensal_lancamentos')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', args.client_id)
    .eq('rubrica_id', args.id);

  if ((cnt1 ?? 0) + (cnt2 ?? 0) > 0) {
    const { error } = await g.supabase
      .from('controle_mensal_categorias')
      .update({ ativo: false })
      .eq('id', args.id)
      .eq('client_id', args.client_id);
    if (error) return { ok: false, error: error.message };
    revalidar(args.client_id);
    return { ok: true, soft: true };
  }

  // Hard delete (cascade vai apagar as rubricas filhas se for categoria raiz vazia)
  const { error } = await g.supabase
    .from('controle_mensal_categorias')
    .delete()
    .eq('id', args.id)
    .eq('client_id', args.client_id);
  if (error) return { ok: false, error: error.message };
  revalidar(args.client_id);
  return { ok: true };
}
