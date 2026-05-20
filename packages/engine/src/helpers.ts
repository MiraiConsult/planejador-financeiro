import type {
  Asset,
  Assumptions,
  Client,
  FinancialEvent,
  PerfilCarteira,
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
