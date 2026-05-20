import type {
  Asset,
  Assumptions,
  Client,
  FinancialEvent,
  PerfilCarteira,
  Recorrencia,
  Scenario,
  ScenarioTipo,
} from './types';

export function idadeNoReferencial(client: Client, referenceDate?: string): number {
  const ref = referenceDate ? new Date(referenceDate) : new Date();
  const nasc = new Date(client.data_nascimento);
  let idade = ref.getUTCFullYear() - nasc.getUTCFullYear();
  const mAnt =
    ref.getUTCMonth() < nasc.getUTCMonth() ||
    (ref.getUTCMonth() === nasc.getUTCMonth() && ref.getUTCDate() < nasc.getUTCDate());
  if (mAnt) idade -= 1;
  return idade;
}

export function resolveAssumptions(base: Assumptions, scenario: Scenario): Assumptions {
  return { ...base, ...(scenario.overrides_premissas ?? {}) };
}

export function retornoEfetivoDoCenario(
  perfil: PerfilCarteira,
  client: Client,
  premissas: Assumptions,
  tipo: ScenarioTipo,
): number {
  let retorno: number;
  let vol: number;
  if (perfil === 'custom') {
    retorno = client.custom_retorno_aa ?? 0;
    vol = client.custom_volatilidade_aa ?? 0;
  } else {
    retorno = premissas[`retorno_${perfil}` as const];
    vol = premissas[`volatilidade_${perfil}` as const];
  }
  if (tipo === 'otimista') return retorno + vol;
  if (tipo === 'pessimista') return retorno - vol;
  return retorno;
}

export function fatorInflacao(taxaAnual: number, t: number): number {
  return Math.pow(1 + taxaAnual, t);
}

/**
 * Valor de mercado de um ativo de estoque ilíquido no instante t (anos desde o início).
 * Usa valorizacao_aa quando definida (carros podem ter negativa = depreciação);
 * para imóveis, cai no default de premissas.valorizacao_imovel_uso quando ambos ausentes.
 */
export function valorAtualEstoque(
  ativo: Asset,
  t: number,
  premissas: Assumptions,
): number {
  const taxa =
    ativo.valorizacao_aa ??
    ativo.taxa_retorno_aa ??
    (ativo.tipo === 'imovel' ? premissas.valorizacao_imovel_uso : 0);
  return ativo.valor * Math.pow(1 + taxa, t);
}

/**
 * Determina se um evento dispara no ano (idade) dado.
 * unico: idade == idade_inicio
 * recorrente_anual: idade_inicio <= idade <= (idade_fim ?? +inf)
 * recorrente_espacado: idade >= idade_inicio AND (idade - idade_inicio) % intervalo == 0 AND <= idade_fim
 */
export function eventoDisparaNoAno(
  ev: FinancialEvent,
  idade: number,
  idadeFinal: number,
): boolean {
  const fim = ev.idade_fim ?? idadeFinal;
  if (idade < ev.idade_inicio || idade > fim) return false;
  switch (ev.padrao_recorrencia) {
    case 'unico':
      return idade === ev.idade_inicio;
    case 'recorrente_anual':
      return true;
    case 'recorrente_espacado': {
      const intervalo = ev.intervalo_anos ?? 0;
      if (intervalo <= 0) return false;
      return (idade - ev.idade_inicio) % intervalo === 0;
    }
  }
}

/**
 * Valor anual de uma série (receita ou despesa) numa dada idade.
 *
 * Ordem de precedência:
 *   1. Override (`overrides[idade]`) — sobrescreve TUDO, é o valor nominal final daquele ano.
 *   2. Fora do intervalo idade_inicio..idade_fim → 0.
 *   3. Recorrência: unico/anual/espaçado filtra anos elegíveis (não-elegível → 0).
 *   4. Crescimento real composto a partir de idade_inicio + inflação se indexado.
 *
 * `valorBase` é o que está no campo da entidade: para despesas o caller
 * deve passar `valor_mensal * 12`; para fluxos, `ativo.valor` já anual.
 */
export function valorAnualSerie(opts: {
  valorBase: number;
  idade: number;
  idadeInicio: number;
  idadeFim: number;
  padrao?: Recorrencia | undefined;
  intervaloAnos?: number | undefined;
  crescimentoRealAa?: number | undefined;
  indexadoInflacao: boolean;
  inflacaoFator: number;          // (1 + inflacao_anual_br) ^ t
  overrides?: Record<string, number> | undefined;
}): number {
  const ovr = opts.overrides?.[String(opts.idade)];
  if (ovr !== undefined && ovr !== null && Number.isFinite(ovr)) return ovr;

  if (opts.idade < opts.idadeInicio || opts.idade > opts.idadeFim) return 0;

  const anosDesdeInicio = opts.idade - opts.idadeInicio;
  const padrao = opts.padrao ?? 'recorrente_anual';
  if (padrao === 'unico' && anosDesdeInicio !== 0) return 0;
  if (padrao === 'recorrente_espacado') {
    const intervalo = opts.intervaloAnos ?? 0;
    if (intervalo <= 0) return 0;
    if (anosDesdeInicio % intervalo !== 0) return 0;
  }

  const fatorCresc = Math.pow(1 + (opts.crescimentoRealAa ?? 0), anosDesdeInicio);
  const fatorInf = opts.indexadoInflacao ? opts.inflacaoFator : 1;
  return opts.valorBase * fatorCresc * fatorInf;
}

/**
 * Valor de um evento naquele ano. Aplica override (com sinal) ou
 * usa `ev.valor` corrigido por inflação.
 */
export function valorEventoNoAno(
  ev: FinancialEvent,
  idade: number,
  inflacaoFator: number,
): number {
  const ovr = ev.overrides?.[String(idade)];
  if (ovr !== undefined && ovr !== null && Number.isFinite(ovr)) return ovr;
  return ev.valor * (ev.indexado_inflacao ? inflacaoFator : 1);
}

/**
 * Ordem de liquidação dos ilíquidos quando há déficit.
 * Por `prioridade_liquidacao` ASC (nulls last); empate → menor valor atual primeiro.
 */
export function ordenaParaLiquidacao<T extends Asset>(
  iliquidos: T[],
  t: number,
  premissas: Assumptions,
): T[] {
  return [...iliquidos].sort((a, b) => {
    const pa = a.prioridade_liquidacao ?? Number.POSITIVE_INFINITY;
    const pb = b.prioridade_liquidacao ?? Number.POSITIVE_INFINITY;
    if (pa !== pb) return pa - pb;
    return valorAtualEstoque(a, t, premissas) - valorAtualEstoque(b, t, premissas);
  });
}
