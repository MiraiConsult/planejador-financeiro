'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type Result = { ok: boolean; error?: string; resumo?: string; dados?: unknown };

function brl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

// Único entry-point para tools do consultor. Faz auth, valida ownership
// e despacha por nome.
export async function executarToolConsultor(args: {
  client_id: string;
  tool_name: string;
  input: Record<string, unknown>;
}): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Não autenticado' };

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', args.client_id)
    .maybeSingle();
  if (!client) return { ok: false, error: 'Cliente não encontrado' };

  const i = args.input;
  const cid = args.client_id;

  function revalida() {
    revalidatePath(`/clients/${cid}/perfil`);
    revalidatePath(`/clients/${cid}/balanco`);
    revalidatePath(`/clients/${cid}/edit`);
    revalidatePath(`/clients/${cid}/compare`);
  }

  // ─── Helpers ─────────────────────────────────────────────────
  async function update(field: string, value: unknown, resumo: string): Promise<Result> {
    const { error } = await supabase.from('clients').update({ [field]: value }).eq('id', cid);
    if (error) return { ok: false, error: error.message };
    revalida();
    return { ok: true, resumo };
  }

  switch (args.tool_name) {
    // ─── Leitura ───────────────────────────────────────────────
    case 'listar_perfil': {
      const { data, error } = await supabase
        .from('clients')
        .select('nome_completo, data_nascimento, expectativa_vida_anos, idade_aposentadoria, idade_reducao_trabalho, perfil_carteira, alocacao_excedente')
        .eq('id', cid)
        .maybeSingle();
      if (error) return { ok: false, error: error.message };
      return { ok: true, dados: data, resumo: 'Perfil consultado.' };
    }
    case 'listar_ativos': {
      const { data, error } = await supabase
        .from('assets')
        .select('id, nome, tipo, natureza, valor, idade_inicio, idade_fim')
        .eq('client_id', cid)
        .is('deleted_at', null);
      if (error) return { ok: false, error: error.message };
      return { ok: true, dados: data, resumo: `${data?.length ?? 0} ativos.` };
    }
    case 'listar_despesas': {
      const { data, error } = await supabase
        .from('expenses')
        .select('id, categoria, descricao, valor_mensal, idade_inicio, idade_fim, essencial')
        .eq('client_id', cid)
        .is('deleted_at', null);
      if (error) return { ok: false, error: error.message };
      return { ok: true, dados: data, resumo: `${data?.length ?? 0} despesas.` };
    }
    case 'listar_eventos': {
      const { data, error } = await supabase
        .from('events')
        .select('id, tipo, descricao, valor, idade_inicio, idade_fim, padrao_recorrencia')
        .eq('client_id', cid)
        .is('deleted_at', null);
      if (error) return { ok: false, error: error.message };
      return { ok: true, dados: data, resumo: `${data?.length ?? 0} eventos.` };
    }
    case 'listar_passivos': {
      const { data, error } = await supabase
        .from('liabilities')
        .select('id, nome, tipo, saldo_atual, juros_aa, parcela_mensal, idade_inicio, idade_fim')
        .eq('client_id', cid)
        .is('deleted_at', null);
      if (error) return { ok: false, error: error.message };
      return { ok: true, dados: data, resumo: `${data?.length ?? 0} passivos.` };
    }
    case 'listar_acoes_excedente': {
      const { data, error } = await supabase
        .from('excedente_acoes')
        .select('id, idade, acao')
        .eq('client_id', cid);
      if (error) return { ok: false, error: error.message };
      return { ok: true, dados: data, resumo: `${data?.length ?? 0} ações.` };
    }
    case 'listar_cenarios': {
      const { data, error } = await supabase
        .from('scenarios')
        .select('id, nome, tipo, is_default')
        .eq('client_id', cid);
      if (error) return { ok: false, error: error.message };
      return { ok: true, dados: data, resumo: `${data?.length ?? 0} cenários.` };
    }

    // ─── Perfil ────────────────────────────────────────────────
    case 'atualizar_idade_aposentadoria': {
      const idade = Number(i.idade);
      if (!Number.isInteger(idade) || idade < 45 || idade > 90) {
        return { ok: false, error: 'Idade fora do intervalo (45-90)' };
      }
      return update('idade_aposentadoria', idade, `Idade de aposentadoria → ${idade}.`);
    }
    case 'atualizar_idade_reducao_trabalho': {
      const idade = Number(i.idade);
      if (!Number.isInteger(idade) || idade < 35 || idade > 90) {
        return { ok: false, error: 'Idade fora do intervalo (35-90)' };
      }
      return update('idade_reducao_trabalho', idade, `Idade de redução de trabalho → ${idade}.`);
    }
    case 'atualizar_expectativa_vida': {
      const anos = Number(i.anos);
      if (!Number.isInteger(anos) || anos < 50 || anos > 120) {
        return { ok: false, error: 'Expectativa fora do intervalo (50-120)' };
      }
      return update('expectativa_vida_anos', anos, `Expectativa de vida → ${anos} anos.`);
    }
    case 'atualizar_perfil_carteira': {
      const perfil = String(i.perfil);
      if (!['conservador', 'moderado', 'arrojado'].includes(perfil)) {
        return { ok: false, error: 'Perfil inválido' };
      }
      return update('perfil_carteira', perfil, `Perfil de carteira → ${perfil}.`);
    }

    // ─── Ativos ────────────────────────────────────────────────
    case 'criar_ativo': {
      const nome = String(i.nome ?? '').trim();
      if (!nome) return { ok: false, error: 'Nome obrigatório' };
      const { error } = await supabase.from('assets').insert({
        client_id: cid,
        nome,
        tipo: String(i.tipo),
        natureza: String(i.natureza),
        valor: Number(i.valor),
        idade_inicio: Number(i.idade_inicio),
        idade_fim: Number(i.idade_fim),
        indexado_inflacao: i.indexado_inflacao !== false,
      });
      if (error) return { ok: false, error: error.message };
      revalida();
      return { ok: true, resumo: `Ativo "${nome}" criado: ${brl(Number(i.valor))}.` };
    }
    case 'remover_ativo': {
      const { error } = await supabase
        .from('assets')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', String(i.asset_id))
        .eq('client_id', cid);
      if (error) return { ok: false, error: error.message };
      revalida();
      return { ok: true, resumo: 'Ativo removido.' };
    }

    // ─── Despesas ──────────────────────────────────────────────
    case 'criar_despesa': {
      const desc = String(i.descricao ?? '').trim();
      if (!desc) return { ok: false, error: 'Descrição obrigatória' };
      const { error } = await supabase.from('expenses').insert({
        client_id: cid,
        categoria: String(i.categoria),
        descricao: desc,
        valor_mensal: Number(i.valor_mensal),
        idade_inicio: Number(i.idade_inicio),
        idade_fim: Number(i.idade_fim),
        essencial: Boolean(i.essencial),
        indexado_inflacao: i.indexado_inflacao !== false,
      });
      if (error) return { ok: false, error: error.message };
      revalida();
      return { ok: true, resumo: `Despesa "${desc}" criada: ${brl(Number(i.valor_mensal))}/mês.` };
    }
    case 'remover_despesa': {
      const { error } = await supabase
        .from('expenses')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', String(i.expense_id))
        .eq('client_id', cid);
      if (error) return { ok: false, error: error.message };
      revalida();
      return { ok: true, resumo: 'Despesa removida.' };
    }

    // ─── Eventos ───────────────────────────────────────────────
    case 'criar_evento': {
      const desc = String(i.descricao ?? '').trim();
      if (!desc) return { ok: false, error: 'Descrição obrigatória' };
      const valor = Number(i.valor);
      const tipo = String(i.tipo);
      // Saídas devem ser negativas; corrige se cliente passou positivo em compra/sonho
      const saidaForcada = ['sonho', 'compra', 'viagem_pontual', 'imprevisto'].includes(tipo);
      const valorFinal = saidaForcada ? -Math.abs(valor) : valor;
      const { error } = await supabase.from('events').insert({
        client_id: cid,
        tipo,
        descricao: desc,
        valor: valorFinal,
        padrao_recorrencia: String(i.padrao_recorrencia ?? 'unico'),
        idade_inicio: Number(i.idade_inicio),
        idade_fim: i.idade_fim != null ? Number(i.idade_fim) : null,
        intervalo_anos: i.intervalo_anos != null ? Number(i.intervalo_anos) : null,
        indexado_inflacao: i.indexado_inflacao !== false,
      });
      if (error) return { ok: false, error: error.message };
      revalida();
      return {
        ok: true,
        resumo: `Evento "${desc}" criado: ${brl(valorFinal)} aos ${i.idade_inicio} anos.`,
      };
    }
    case 'remover_evento': {
      const { error } = await supabase
        .from('events')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', String(i.event_id))
        .eq('client_id', cid);
      if (error) return { ok: false, error: error.message };
      revalida();
      return { ok: true, resumo: 'Evento removido.' };
    }

    // ─── Passivos ──────────────────────────────────────────────
    case 'criar_passivo': {
      const nome = String(i.nome ?? '').trim();
      if (!nome) return { ok: false, error: 'Nome obrigatório' };
      const { error } = await supabase.from('liabilities').insert({
        client_id: cid,
        nome,
        tipo: String(i.tipo ?? 'outro'),
        saldo_atual: Number(i.saldo_atual),
        juros_aa: i.juros_aa != null ? Number(i.juros_aa) : null,
        parcela_mensal: Number(i.parcela_mensal),
        idade_inicio: Number(i.idade_inicio),
        idade_fim: Number(i.idade_fim),
      });
      if (error) return { ok: false, error: error.message };
      revalida();
      return { ok: true, resumo: `Passivo "${nome}" criado: ${brl(Number(i.saldo_atual))} de saldo.` };
    }
    case 'remover_passivo': {
      const { error } = await supabase
        .from('liabilities')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', String(i.liability_id))
        .eq('client_id', cid);
      if (error) return { ok: false, error: error.message };
      revalida();
      return { ok: true, resumo: 'Passivo removido.' };
    }

    // ─── Excedente ─────────────────────────────────────────────
    case 'registrar_acao_excedente': {
      const acao = String(i.acao ?? '').trim();
      if (!acao) return { ok: false, error: 'Descreva a ação' };
      const { error } = await supabase.from('excedente_acoes').insert({
        client_id: cid,
        idade: i.idade != null ? Number(i.idade) : null,
        acao,
      });
      if (error) return { ok: false, error: error.message };
      revalida();
      return { ok: true, resumo: `Ação para excedentes registrada: "${acao}".` };
    }
    case 'remover_acao_excedente': {
      const { error } = await supabase
        .from('excedente_acoes')
        .delete()
        .eq('id', String(i.acao_id))
        .eq('client_id', cid);
      if (error) return { ok: false, error: error.message };
      revalida();
      return { ok: true, resumo: 'Ação removida.' };
    }

    // ─── Cenários ──────────────────────────────────────────────
    case 'remover_cenario_personalizado': {
      const { error } = await supabase
        .from('scenarios')
        .delete()
        .eq('id', String(i.scenario_id))
        .eq('client_id', cid)
        .eq('tipo', 'personalizado');
      if (error) return { ok: false, error: error.message };
      revalida();
      return { ok: true, resumo: 'Cenário removido.' };
    }

    default:
      return { ok: false, error: `Tool desconhecida: ${args.tool_name}` };
  }
}
