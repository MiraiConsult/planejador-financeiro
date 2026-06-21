'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type Result = { ok: boolean; error?: string; resumo?: string };

export async function executarAtualizarIdadeAposentadoria(args: {
  client_id: string;
  idade: number;
}): Promise<Result> {
  if (!Number.isInteger(args.idade) || args.idade < 45 || args.idade > 90) {
    return { ok: false, error: 'Idade fora do intervalo (45-90)' };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Não autenticado' };

  const { error } = await supabase
    .from('clients')
    .update({ idade_aposentadoria: args.idade })
    .eq('id', args.client_id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clients/${args.client_id}/perfil`);
  revalidatePath(`/clients/${args.client_id}/balanco`);
  return { ok: true, resumo: `Idade de aposentadoria atualizada para ${args.idade}.` };
}

export async function executarCriarMetaDeCompra(args: {
  client_id: string;
  descricao: string;
  idade: number;
  valor: number;
}): Promise<Result> {
  const desc = args.descricao.trim();
  if (!desc) return { ok: false, error: 'Descrição obrigatória' };
  if (!Number.isFinite(args.valor) || args.valor <= 0) {
    return { ok: false, error: 'Valor inválido' };
  }
  if (!Number.isInteger(args.idade) || args.idade < 1 || args.idade > 120) {
    return { ok: false, error: 'Idade inválida' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Não autenticado' };

  const { error } = await supabase.from('events').insert({
    client_id: args.client_id,
    tipo: 'compra',
    descricao: desc,
    valor: -Math.abs(args.valor),
    padrao_recorrencia: 'unico',
    idade_inicio: args.idade,
    indexado_inflacao: true,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clients/${args.client_id}/balanco`);
  revalidatePath(`/clients/${args.client_id}/edit`);
  return {
    ok: true,
    resumo: `Meta "${desc}" criada: R$ ${args.valor.toLocaleString('pt-BR')} aos ${args.idade} anos.`,
  };
}

export async function executarRegistrarAcaoExcedente(args: {
  client_id: string;
  acao: string;
}): Promise<Result> {
  const acao = args.acao.trim();
  if (!acao) return { ok: false, error: 'Descreva a ação' };
  if (acao.length > 500) return { ok: false, error: 'Ação muito longa' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Não autenticado' };

  const { error } = await supabase.from('excedente_acoes').insert({
    client_id: args.client_id,
    idade: null,
    acao,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clients/${args.client_id}/perfil`);
  revalidatePath(`/clients/${args.client_id}/balanco`);
  return { ok: true, resumo: `Ação para excedentes registrada: "${acao}".` };
}
