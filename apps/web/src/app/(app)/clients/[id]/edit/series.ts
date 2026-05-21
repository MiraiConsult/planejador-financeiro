/**
 * Cálculo de séries client-side pra alimentar o gráfico ao vivo de cada
 * tipo de item. NÃO mexe no engine real (que continua sendo a fonte de
 * verdade da simulação completa).
 *
 * Aqui geramos a curva que faz sentido pedagógico pra cada tipo:
 *  - estoque físico (imóvel/terreno/carro) → valor de mercado projetado
 *  - aplicação financeira → saldo com juros compostos + aportes
 *  - fluxo (receita) → valor anual ano a ano
 *  - despesa → valor anual ano a ano
 */

import { valorAnualSerie } from '@planejador/engine';

// Inflação anual default usada pra projeção visual (espelha o assumptions
// padrão; será substituído por premissas do cliente em fase 2).
// Sistema opera em valores NOMINAIS — inflação desativada.
// Constante mantida em 0 para manter a forma das fórmulas estável.
export const INFLACAO_AA_DEFAULT = 0;

export interface SeriesPoint {
  idade: number;
  base: number;          // valor paramétrico naquela idade
  override?: number;     // override salvo (se existir)
}

// ─── Estoque físico (imóvel/terreno/carro/herança) ───
// Valor de mercado = valor_inicial × (1 + valorizacao_real)^t × inflação se indexado.

export function seriesEstoqueFisico(opts: {
  valor: number;
  idadeInicio: number;
  idadeFim: number;
  valorizacaoAa?: number | null;     // já em fração (-0.10 = -10%)
  indexadoInflacao: boolean;
  overrides?: Record<string, number>;
}): SeriesPoint[] {
  const points: SeriesPoint[] = [];
  for (let idade = opts.idadeInicio; idade <= opts.idadeFim; idade++) {
    const t = idade - opts.idadeInicio;
    const fatorInf = opts.indexadoInflacao ? Math.pow(1 + INFLACAO_AA_DEFAULT, t) : 1;
    const fatorVal = Math.pow(1 + (opts.valorizacaoAa ?? 0), t);
    const base = opts.valor * fatorVal * fatorInf;
    const ovr = opts.overrides?.[String(idade)];
    points.push({
      idade,
      base: Math.round(base),
      ...(ovr !== undefined && ovr !== null ? { override: Number(ovr) } : {}),
    });
  }
  return points;
}

// ─── Aplicação financeira (estoque líquido) ───
// Saldo(t) = saldo(t-1) × (1 + rentabilidade) + aporte_anual_se_em_periodo
// Inflação é aplicada como overlay no display (mantém poder de compra real).

export function seriesAplicacaoFinanceira(opts: {
  saldoInicial: number;
  idadeInicio: number;
  idadeFim: number;
  rentabilidadeAa?: number | null;     // fração real (acima da inflação)
  aporteMensal?: number | null;         // BRL/mês; positivo=aporte, negativo=retirada
  idadeAporteInicio?: number | null;
  idadeAporteFim?: number | null;
  indexadoInflacao: boolean;
  overrides?: Record<string, number>;
}): SeriesPoint[] {
  const points: SeriesPoint[] = [];
  const r = opts.rentabilidadeAa ?? 0;
  const aporteAnual = (opts.aporteMensal ?? 0) * 12;
  const apInicio = opts.idadeAporteInicio ?? opts.idadeInicio;
  const apFim = opts.idadeAporteFim ?? opts.idadeFim;

  let saldo = opts.saldoInicial;
  for (let idade = opts.idadeInicio; idade <= opts.idadeFim; idade++) {
    const t = idade - opts.idadeInicio;
    if (t > 0) {
      saldo = saldo * (1 + r);
      // Aporte/retirada anual SE estiver no período
      if (idade >= apInicio && idade <= apFim) {
        saldo += aporteAnual;
      }
      if (saldo < 0) saldo = 0;
    }
    const fatorInf = opts.indexadoInflacao ? Math.pow(1 + INFLACAO_AA_DEFAULT, t) : 1;
    const base = saldo * fatorInf;
    const ovr = opts.overrides?.[String(idade)];
    points.push({
      idade,
      base: Math.round(base),
      ...(ovr !== undefined && ovr !== null ? { override: Number(ovr) } : {}),
    });
  }
  return points;
}

// ─── Fluxo (receita anual) e Despesa (anual) ───
// Reusa valorAnualSerie do engine, idêntico ao usado na simulação real.

export function seriesFluxoAnual(opts: {
  valorBase: number;                   // anual
  idadeInicio: number;
  idadeFim: number;
  padrao?: string | null;
  intervaloAnos?: number | null;
  crescimentoRealAa?: number | null;
  indexadoInflacao: boolean;
  overrides?: Record<string, number>;
}): SeriesPoint[] {
  const points: SeriesPoint[] = [];
  for (let idade = opts.idadeInicio; idade <= opts.idadeFim; idade++) {
    const t = idade - opts.idadeInicio;
    const inflacaoFator = Math.pow(1 + INFLACAO_AA_DEFAULT, t);
    const base = valorAnualSerie({
      valorBase: opts.valorBase,
      idade,
      idadeInicio: opts.idadeInicio,
      idadeFim: opts.idadeFim,
      padrao: (opts.padrao ?? undefined) as never,
      intervaloAnos: opts.intervaloAnos ?? undefined,
      crescimentoRealAa: opts.crescimentoRealAa ?? undefined,
      indexadoInflacao: opts.indexadoInflacao,
      inflacaoFator,
      overrides: undefined,
    });
    const ovr = opts.overrides?.[String(idade)];
    points.push({
      idade,
      base: Math.round(base),
      ...(ovr !== undefined && ovr !== null ? { override: Number(ovr) } : {}),
    });
  }
  return points;
}
