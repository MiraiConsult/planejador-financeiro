import type { FinancialEvent, SimulationInput } from '@planejador/engine';

// Estado interativo do Simulador. Pode ser persistido em
// scenarios.simulador_state (jsonb) e reaplicado ao carregar.

export interface SimuladorAjustes {
  receitaPct: number;
  gastosPct: number;
  sonhosPct: number;
  desReceita: string[];
  desGastos: string[];
  desSonhos: string[];
}

export interface SimuladorMeta {
  id: string;
  descricao: string;
  idade: number;
  valor: number;                                // sempre positivo aqui
  tipo: 'compra' | 'sonho' | 'viagem_pontual';
}

export interface SimuladorState {
  ajustes: SimuladorAjustes;
  metas: SimuladorMeta[];
}

export const SIMULADOR_STATE_VAZIO: SimuladorState = {
  ajustes: {
    receitaPct: 0,
    gastosPct: 0,
    sonhosPct: 0,
    desReceita: [],
    desGastos: [],
    desSonhos: [],
  },
  metas: [],
};

// Validador defensivo para o JSONB vindo do banco — aceita o que combina
// com o shape e descarta o resto. Retorna null se inválido.
export function parseSimuladorState(raw: unknown): SimuladorState | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const aj = r.ajustes as Record<string, unknown> | undefined;
  if (!aj) return null;
  const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  const strArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  const metasIn = Array.isArray(r.metas) ? (r.metas as unknown[]) : [];
  const metas: SimuladorMeta[] = [];
  for (const m of metasIn) {
    if (!m || typeof m !== 'object') continue;
    const mm = m as Record<string, unknown>;
    const tipo = mm.tipo;
    if (
      typeof mm.id === 'string' &&
      typeof mm.descricao === 'string' &&
      typeof mm.idade === 'number' &&
      typeof mm.valor === 'number' &&
      (tipo === 'compra' || tipo === 'sonho' || tipo === 'viagem_pontual')
    ) {
      metas.push({
        id: mm.id,
        descricao: mm.descricao,
        idade: mm.idade,
        valor: mm.valor,
        tipo,
      });
    }
  }
  return {
    ajustes: {
      receitaPct: num(aj.receitaPct),
      gastosPct: num(aj.gastosPct),
      sonhosPct: num(aj.sonhosPct),
      desReceita: strArr(aj.desReceita),
      desGastos: strArr(aj.desGastos),
      desSonhos: strArr(aj.desSonhos),
    },
    metas,
  };
}

function escalarOverrides(
  overrides: Record<string, number> | undefined,
  fator: number,
): Record<string, number> | undefined {
  if (!overrides) return overrides;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(overrides)) out[k] = v * fator;
  return out;
}

function metaParaEvento(m: SimuladorMeta): FinancialEvent {
  return {
    id: m.id,
    tipo: m.tipo,
    descricao: m.descricao,
    valor: -Math.abs(m.valor),
    padrao_recorrencia: 'unico',
    idade_inicio: m.idade,
    indexado_inflacao: true,
  };
}

export function aplicarSimuladorState(
  base: SimulationInput,
  state: SimuladorState,
): SimulationInput {
  const { ajustes: a, metas } = state;
  const fReceita = 1 + a.receitaPct / 100;
  const fGastos = 1 + a.gastosPct / 100;
  const fSonhos = 1 + a.sonhosPct / 100;
  const desReceita = new Set(a.desReceita);
  const desGastos = new Set(a.desGastos);
  const desSonhos = new Set(a.desSonhos);
  return {
    ...base,
    assets: base.assets.map((x) =>
      x.natureza === 'fluxo' && !desReceita.has(x.id)
        ? { ...x, valor: x.valor * fReceita, overrides: escalarOverrides(x.overrides, fReceita) }
        : x,
    ),
    expenses: base.expenses.map((x) =>
      desGastos.has(x.categoria)
        ? x
        : {
            ...x,
            valor_mensal: x.valor_mensal * fGastos,
            overrides: escalarOverrides(x.overrides, fGastos),
          },
    ),
    events: [
      ...base.events.map((x) =>
        x.tipo === 'sonho' && !desSonhos.has(x.id)
          ? { ...x, valor: x.valor * fSonhos, overrides: escalarOverrides(x.overrides, fSonhos) }
          : x,
      ),
      ...metas.map(metaParaEvento),
    ],
  };
}

export function simuladorStateVazio(s: SimuladorState): boolean {
  const a = s.ajustes;
  return (
    a.receitaPct === 0 &&
    a.gastosPct === 0 &&
    a.sonhosPct === 0 &&
    a.desReceita.length === 0 &&
    a.desGastos.length === 0 &&
    a.desSonhos.length === 0 &&
    s.metas.length === 0
  );
}

export function somaAjustada(
  itens: { id: string; valor: number }[],
  pct: number,
  desativados: string[],
): number {
  const f = 1 + pct / 100;
  const des = new Set(desativados);
  return itens.reduce((s, x) => s + (des.has(x.id) ? x.valor : x.valor * f), 0);
}
