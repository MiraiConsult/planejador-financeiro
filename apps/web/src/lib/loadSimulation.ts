import { createClient } from '@/lib/supabase/server';
import type {
  Asset,
  Assumptions,
  Client as EngineClient,
  Expense,
  FinancialEvent,
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

  const [clientRes, assetsRes, expensesRes, eventsRes, assumptionsRes, scenariosRes] =
    await Promise.all([
      supabase.from('clients').select('*').eq('id', client_id).maybeSingle(),
      supabase.from('assets').select('*').eq('client_id', client_id).is('deleted_at', null),
      supabase.from('expenses').select('*').eq('client_id', client_id).is('deleted_at', null),
      supabase.from('events').select('*').eq('client_id', client_id).is('deleted_at', null),
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
        inflacao_anual_br: 0.04,
        retorno_conservador: 0.08,
        volatilidade_conservador: 0.04,
        retorno_moderado: 0.1,
        volatilidade_moderado: 0.08,
        retorno_arrojado: 0.13,
        volatilidade_arrojado: 0.15,
        valorizacao_imovel_uso: 0,
        taxa_desconto_npv: 0.06,
        imposto_renda_efetivo: 0.15,
        custo_credito_aa: 0.15,
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

  const input: SimulationInput = {
    client,
    assets,
    expenses,
    events,
    assumptions,
    scenario,
    // usa hoje como data de referência por padrão; engine deriva idade
  };

  return { client, input };
}
