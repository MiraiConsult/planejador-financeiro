import { createClient } from '@/lib/supabase/server';
import type {
  Asset,
  Assumptions,
  Client as EngineClient,
  Expense,
  FinancialEvent,
  Liability,
  Scenario,
  SimulationInput,
} from '@planejador/engine';

/**
 * Carrega todas as entidades do cliente + premissas + cenário default
 * e monta o input pronto para `simulate()`.
 * Retorna null se o cliente não existir ou não for visível pelo RLS.
 */
export async function loadSimulationInput(client_id: string): Promise<{
  client: EngineClient;
  input: SimulationInput;
} | null> {
  const supabase = await createClient();

  const [
    clientRes,
    assetsRes,
    expensesRes,
    eventsRes,
    liabilitiesRes,
    assumptionsRes,
    scenariosRes,
  ] = await Promise.all([
      supabase.from('clients').select('*').eq('id', client_id).maybeSingle(),
      supabase.from('assets').select('*').eq('client_id', client_id).is('deleted_at', null),
      supabase.from('expenses').select('*').eq('client_id', client_id).is('deleted_at', null),
      supabase.from('events').select('*').eq('client_id', client_id).is('deleted_at', null),
      supabase.from('liabilities').select('*').eq('client_id', client_id).is('deleted_at', null),
      // pega a premissa do cliente; se não houver, usa a default do consultor (client_id IS NULL)
      supabase
        .from('assumptions')
        .select('*')
        .or(`client_id.eq.${client_id},client_id.is.null`)
        .order('client_id', { nullsFirst: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('scenarios')
        .select('*')
        .eq('client_id', client_id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

  if (!clientRes.data) return null;
  const c = clientRes.data;

  const client: EngineClient = {
    id: c.id,
    nome_completo: c.nome_completo,
    data_nascimento: c.data_nascimento,
    expectativa_vida_anos: c.expectativa_vida_anos,
    idade_aposentadoria: c.idade_aposentadoria ?? undefined,
    idade_reducao_trabalho: c.idade_reducao_trabalho ?? undefined,
    perfil_carteira: c.perfil_carteira,
    custom_retorno_aa: c.custom_retorno_aa ?? undefined,
    custom_volatilidade_aa: c.custom_volatilidade_aa ?? undefined,
    alocacao_excedente: Array.isArray(c.alocacao_excedente)
      ? (c.alocacao_excedente as { ate_idade: number | null; pct_investido: number }[])
      : undefined,
  };

  const assets: Asset[] = (assetsRes.data ?? []).map((a) => ({
    id: a.id,
    nome: a.nome,
    tipo: a.tipo,
    natureza: a.natureza,
    valor: Number(a.valor),
    idade_inicio: a.idade_inicio,
    idade_fim: a.idade_fim,
    indexado_inflacao: a.indexado_inflacao,
    taxa_retorno_aa: a.taxa_retorno_aa != null ? Number(a.taxa_retorno_aa) : undefined,
    valorizacao_aa: a.valorizacao_aa != null ? Number(a.valorizacao_aa) : undefined,
    crescimento_real_aa:
      a.crescimento_real_aa != null ? Number(a.crescimento_real_aa) : undefined,
    padrao_recorrencia: a.padrao_recorrencia ?? undefined,
    intervalo_anos: a.intervalo_anos ?? undefined,
    aporte_mensal: a.aporte_mensal != null ? Number(a.aporte_mensal) : undefined,
    idade_aporte_inicio: a.idade_aporte_inicio ?? undefined,
    idade_aporte_fim: a.idade_aporte_fim ?? undefined,
    overrides: (a.overrides as Record<string, number> | null) ?? undefined,
    prioridade_liquidacao: a.prioridade_liquidacao ?? undefined,
    notas: a.notas ?? undefined,
  }));

  const expenses: Expense[] = (expensesRes.data ?? []).map((e) => ({
    id: e.id,
    categoria: e.categoria,
    descricao: e.descricao,
    valor_mensal: Number(e.valor_mensal),
    idade_inicio: e.idade_inicio,
    idade_fim: e.idade_fim,
    indexado_inflacao: e.indexado_inflacao,
    essencial: e.essencial,
    crescimento_real_aa:
      e.crescimento_real_aa != null ? Number(e.crescimento_real_aa) : undefined,
    padrao_recorrencia: e.padrao_recorrencia ?? undefined,
    intervalo_anos: e.intervalo_anos ?? undefined,
    overrides: (e.overrides as Record<string, number> | null) ?? undefined,
    notas: e.notas ?? undefined,
  }));

  const events: FinancialEvent[] = (eventsRes.data ?? []).map((ev) => ({
    id: ev.id,
    tipo: ev.tipo,
    descricao: ev.descricao,
    valor: Number(ev.valor),
    padrao_recorrencia: ev.padrao_recorrencia,
    idade_inicio: ev.idade_inicio,
    idade_fim: ev.idade_fim ?? undefined,
    intervalo_anos: ev.intervalo_anos ?? undefined,
    indexado_inflacao: ev.indexado_inflacao,
    prioridade: ev.prioridade ?? undefined,
    ativo_referenciado: ev.ativo_referenciado ?? undefined,
    overrides: (ev.overrides as Record<string, number> | null) ?? undefined,
  }));

  const liabilities: Liability[] = (liabilitiesRes.data ?? []).map((l) => ({
    id: l.id,
    nome: l.nome,
    tipo: l.tipo,
    saldo_atual: Number(l.saldo_atual),
    juros_aa: l.juros_aa != null ? Number(l.juros_aa) : undefined,
    parcela_mensal: Number(l.parcela_mensal),
    idade_inicio: l.idade_inicio,
    idade_fim: l.idade_fim,
    notas: l.notas ?? undefined,
  }));

  const a = assumptionsRes.data;
  const assumptions: Assumptions = a
    ? {
        inflacao_anual_br: Number(a.inflacao_anual_br),
        retorno_conservador: Number(a.retorno_conservador),
        volatilidade_conservador: Number(a.volatilidade_conservador),
        retorno_moderado: Number(a.retorno_moderado),
        volatilidade_moderado: Number(a.volatilidade_moderado),
        retorno_arrojado: Number(a.retorno_arrojado),
        volatilidade_arrojado: Number(a.volatilidade_arrojado),
        valorizacao_imovel_uso: Number(a.valorizacao_imovel_uso),
        taxa_desconto_npv: Number(a.taxa_desconto_npv),
        imposto_renda_efetivo: Number(a.imposto_renda_efetivo),
        custo_credito_aa: Number(a.custo_credito_aa),
      }
    : {
        // Sistema opera em VALORES REAIS (moeda de hoje, sem inflação).
        // Taxas abaixo são RETORNOS REAIS — descontados da inflação BR (~4%).
        // Equivalentes nominais aprox.: 4%→8%, 6%→10%, 9%→13%.
        inflacao_anual_br: 0.04,
        retorno_conservador: 0.04,
        volatilidade_conservador: 0.04,
        retorno_moderado: 0.06,
        volatilidade_moderado: 0.08,
        retorno_arrojado: 0.09,
        volatilidade_arrojado: 0.15,
        valorizacao_imovel_uso: 0,
        taxa_desconto_npv: 0.06,
        imposto_renda_efetivo: 0.15,
        custo_credito_aa: 0.10,
      };

  const sc = scenariosRes.data;
  const scenario: Scenario = sc
    ? {
        id: sc.id,
        nome: sc.nome,
        tipo: sc.tipo,
        horizonte_idade_final: sc.horizonte_idade_final ?? undefined,
      }
    : { id: 'sc-base', nome: 'Base', tipo: 'base' };

  // Quando o cliente força idade_inicio_simulacao, computamos um
  // reference_date sintético (data_nascimento + N anos) para que o
  // motor enxergue essa idade como "hoje". Sem isso, usa data atual.
  let reference_date: string | undefined;
  if (c.idade_inicio_simulacao != null && c.data_nascimento) {
    const nasc = new Date(c.data_nascimento);
    nasc.setUTCFullYear(nasc.getUTCFullYear() + c.idade_inicio_simulacao);
    reference_date = nasc.toISOString().slice(0, 10);
  }

  const input: SimulationInput = {
    client,
    assets,
    expenses,
    events,
    liabilities,
    assumptions,
    scenario,
    reference_date,
  };

  return { client, input };
}
