// Agregações de cada visão do Controle Mensal (porte de backend/analytics.py).
// Recebe os lançamentos já lidos do Supabase e devolve estruturas prontas pra UI.

export const ALERTA_MARGEM_PCT = 15;

export interface Lancamento {
  id?: string;
  data: string;
  descricao: string;
  valor: number;
  categoria: string | null;
  subcategoria: string | null;
  mes: string;
  mes_num: number | null;
  ano: number | null;
  competencia: number | null;
  /** Legado (pessoal | viagem | mirai | receita). Continua preenchido pra compatibilidade. */
  tipo: string;
  /** Novo: vínculo com a tabela controle_mensal_centros. Null durante migração. */
  centro_id: string | null;
  /** Novo: substitui o teste `tipo === 'receita'` no agrupamento. */
  eh_receita: boolean;
  origem: string | null;
  cliente_obs: string | null;
  viagem: string | null;
  sistema: string | null;
  is_nexlex: boolean;
}

export interface MesInfo { competencia: number; mes: string; ano: number | null; label: string; }
export interface MensalLinha {
  label: string; mes: string; competencia: number;
  receita: number; pessoal: number; viagem: number; mirai: number;
}
export interface OverviewData {
  por_tipo: Record<string, number>;
  mensal: MensalLinha[];
  meses: MesInfo[];
  n_lancamentos: number;
}
export interface CategoriaTotal { categoria: string; total: number; }
export interface ComparativoLinha { label: string; receita: number; gastos: number; }
export interface PessoalData {
  labels_mes: string[];
  por_categoria: CategoriaTotal[];
  por_categoria_mensal: Record<string, number[]>;
  comparativo: ComparativoLinha[];
  lancamentos: Lancamento[];
  breakdown: BreakdownData;
}
export interface DemonstrativoLinha {
  label: string; receita_nexlex: number; saas: number;
  colaboradores: number; outros: number; salario_liquido: number;
}
export interface Alerta { sistema: string; label: string; valor: number; media: number; desvio_pct: number; }
export interface MiraiData {
  labels_mes: string[];
  demonstrativo: DemonstrativoLinha[];
  sistemas: string[];
  sistemas_mensal: Record<string, number[]>;
  alertas: Alerta[];
  lancamentos: Lancamento[];
  breakdown: BreakdownData;
}
export interface SubcatTotal { subcategoria: string; total: number; }
export interface ViagemTotal { viagem: string; total: number; n: number; subcategorias: SubcatTotal[]; }
export interface ViagensData {
  por_viagem: ViagemTotal[];
  comparativo: Array<{ viagem: string; total: number }>;
  lancamentos: Lancamento[];
  breakdown: BreakdownData;
}
export interface ClienteTotal { cliente: string; total: number; }
export interface ReceitasData {
  labels_mes: string[];
  por_cliente: ClienteTotal[];
  cliente_mensal: Record<string, number[]>;
  lancamentos: Lancamento[];
  breakdown: BreakdownData;
}

/* ─── Breakdown genérico (grupo → itens) ──────────────────────────────
 * Estrutura genérica que alimenta a view <CategoryBreakdown>:
 * grupo (ex. categoria de gasto) com lista de itens agregados
 * (ex. lançamentos com a mesma descrição somados).
 */
export interface BreakdownItem { nome: string; valor: number; n: number; }
export interface BreakdownGroup {
  chave: string;
  total: number;
  pct: number;
  itens: BreakdownItem[];
}
export interface BreakdownData {
  total: number;
  grupos: BreakdownGroup[];
  /** Labels dos meses (presentes nos rows usados). */
  labels_mes: string[];
  /** Série mensal por grupo — alinha com labels_mes (índices). */
  serie_mensal: Record<string, number[]>;
  /** Série mensal por item, dentro de cada grupo. grupo → item → série. */
  serie_mensal_item: Record<string, Record<string, number[]>>;
}

export function buildBreakdown<T extends { competencia: number | null; mes: string; ano: number | null }>(
  rows: T[],
  getGroup: (r: T) => string,
  getItem: (r: T) => string,
  getValue: (r: T) => number,
): BreakdownData {
  // ─── meses ordenados a partir do próprio recorte ────────────────────
  const mesesMap = new Map<number, MesInfo>();
  for (const r of rows) {
    const c = r.competencia ?? 0;
    if (!mesesMap.has(c)) {
      mesesMap.set(c, { competencia: c, mes: r.mes, ano: r.ano, label: r.ano ? `${r.mes}/${r.ano}` : r.mes });
    }
  }
  const meses = [...mesesMap.values()].sort((a, b) => a.competencia - b.competencia);
  const idxByComp = new Map(meses.map((m, i) => [m.competencia, i] as const));

  const groups = new Map<string, Map<string, { soma: number; n: number }>>();
  const serieByGroup = new Map<string, number[]>();
  const serieByItem = new Map<string, Map<string, number[]>>();
  let total = 0;
  for (const r of rows) {
    const v = Math.abs(getValue(r));
    if (!v) continue;
    const g = getGroup(r) || '—';
    const i = getItem(r) || '—';
    if (!groups.has(g)) groups.set(g, new Map());
    const itens = groups.get(g)!;
    const cur = itens.get(i) ?? { soma: 0, n: 0 };
    cur.soma += v;
    cur.n += 1;
    itens.set(i, cur);
    const idx = idxByComp.get(r.competencia ?? 0);
    if (!serieByGroup.has(g)) serieByGroup.set(g, new Array(meses.length).fill(0));
    if (!serieByItem.has(g)) serieByItem.set(g, new Map());
    const itensSerie = serieByItem.get(g)!;
    if (!itensSerie.has(i)) itensSerie.set(i, new Array(meses.length).fill(0));
    const grupoArr = serieByGroup.get(g);
    const itemArr = itensSerie.get(i);
    if (idx != null) {
      if (grupoArr) grupoArr[idx] = (grupoArr[idx] ?? 0) + v;
      if (itemArr) itemArr[idx] = (itemArr[idx] ?? 0) + v;
    }
    total += v;
  }
  const denom = total || 1;
  const grupos: BreakdownGroup[] = [...groups.entries()]
    .map(([chave, itens]) => {
      const list: BreakdownItem[] = [...itens.entries()]
        .map(([nome, { soma, n }]) => ({ nome, valor: round2(soma), n }))
        .sort((a, b) => b.valor - a.valor);
      const t = list.reduce((acc, it) => acc + it.valor, 0);
      return {
        chave,
        total: round2(t),
        pct: round2((t / denom) * 100),
        itens: list,
      };
    })
    .sort((a, b) => b.total - a.total);

  const serie_mensal: Record<string, number[]> = {};
  for (const [g, arr] of serieByGroup) {
    serie_mensal[g] = arr.map(round2);
  }
  const serie_mensal_item: Record<string, Record<string, number[]>> = {};
  for (const [g, itens] of serieByItem) {
    serie_mensal_item[g] = {};
    for (const [nome, arr] of itens) {
      serie_mensal_item[g][nome] = arr.map(round2);
    }
  }
  return {
    total: round2(total),
    grupos,
    labels_mes: meses.map((m) => m.label),
    serie_mensal,
    serie_mensal_item,
  };
}

const round2 = (v: number): number => {
  const r = Math.round(v * 100) / 100;
  return r === 0 ? 0 : r; // normaliza -0
};

const comp = (l: Lancamento): number => l.competencia ?? 0;
const somaSe = (rows: Lancamento[], pred: (l: Lancamento) => boolean): number => {
  let s = 0;
  for (const l of rows) if (pred(l)) s += l.valor;
  return s;
};
const somaAbs = (rows: Lancamento[], pred: (l: Lancamento) => boolean): number => {
  let s = 0;
  for (const l of rows) if (pred(l)) s += Math.abs(l.valor);
  return s;
};

function sortLanc(rows: Lancamento[]): Lancamento[] {
  return [...rows].sort((a, b) => comp(a) - comp(b) || a.data.localeCompare(b.data));
}

// ─── Visão por centro (substitui pessoal/mirai/viagens quando há centro_id) ──

export interface CentroAggregate {
  totalReceitas: number;
  totalDespesas: number;
  liquido: number;
  // Breakdown só das despesas (categoria → descrição) — o que vai no donut/cards
  despesas: BreakdownData;
  // Breakdown das receitas (categoria → descrição/cliente_obs)
  receitas: BreakdownData;
  lancamentosReceitas: Lancamento[];
  lancamentosDespesas: Lancamento[];
  // Série mensal pro demonstrativo (receitas / despesas / líquido)
  serieMensal: {
    labels: string[];
    receitas: number[];
    despesas: number[];
    liquido: number[];
  };
}

/**
 * Agrega lançamentos de um conjunto de centros (centro + descendentes).
 * Separa receitas (eh_receita=true) de despesas e devolve breakdowns
 * prontos pra UI.
 */
export function agregarPorCentro(rows: Lancamento[], centroIds: string[]): CentroAggregate {
  const ids = new Set(centroIds);
  const sub = rows.filter((l) => l.centro_id && ids.has(l.centro_id));
  const receitas = sub.filter((l) => l.eh_receita);
  const despesas = sub.filter((l) => !l.eh_receita);
  const meses = mesesOrdenados(sub);
  const idxByComp = new Map(meses.map((m, i) => [m.competencia, i] as const));

  const labels = meses.map((m) => m.label);
  const recArr = new Array(labels.length).fill(0);
  const despArr = new Array(labels.length).fill(0);
  for (const l of receitas) {
    const i = idxByComp.get(l.competencia ?? 0);
    if (i != null) recArr[i] += Math.abs(l.valor);
  }
  for (const l of despesas) {
    const i = idxByComp.get(l.competencia ?? 0);
    if (i != null) despArr[i] += Math.abs(l.valor);
  }
  const liqArr = recArr.map((r, i) => round2(r - (despArr[i] ?? 0)));

  return {
    totalReceitas: round2(receitas.reduce((s, l) => s + Math.abs(l.valor), 0)),
    totalDespesas: round2(despesas.reduce((s, l) => s + Math.abs(l.valor), 0)),
    liquido: round2(
      receitas.reduce((s, l) => s + Math.abs(l.valor), 0) -
      despesas.reduce((s, l) => s + Math.abs(l.valor), 0),
    ),
    despesas: buildBreakdown(
      despesas,
      (l) => l.categoria ?? '—',
      (l) => l.descricao || '—',
      (l) => l.valor,
    ),
    receitas: buildBreakdown(
      receitas,
      (l) => l.cliente_obs || l.categoria || 'Receitas',
      (l) => l.descricao || '—',
      (l) => l.valor,
    ),
    lancamentosReceitas: sortLanc(receitas),
    lancamentosDespesas: sortLanc(despesas),
    serieMensal: {
      labels,
      receitas: recArr.map(round2),
      despesas: despArr.map(round2),
      liquido: liqArr,
    },
  };
}

export function mesesOrdenados(rows: Lancamento[]): MesInfo[] {
  const map = new Map<number, MesInfo>();
  for (const l of rows) {
    const c = comp(l);
    if (!map.has(c)) {
      map.set(c, { competencia: c, mes: l.mes, ano: l.ano, label: l.ano ? `${l.mes}/${l.ano}` : l.mes });
    }
  }
  return [...map.values()].sort((a, b) => a.competencia - b.competencia);
}

export function overview(rows: Lancamento[]): OverviewData {
  const meses = mesesOrdenados(rows);
  const porTipo: Record<string, number> = {};
  for (const l of rows) porTipo[l.tipo] = round2((porTipo[l.tipo] ?? 0) + l.valor);
  const mensal: MensalLinha[] = meses.map((mm) => ({
    label: mm.label, mes: mm.mes, competencia: mm.competencia,
    receita: round2(somaSe(rows, (l) => l.tipo === 'receita' && comp(l) === mm.competencia)),
    pessoal: round2(somaSe(rows, (l) => l.tipo === 'pessoal' && comp(l) === mm.competencia)),
    viagem: round2(somaSe(rows, (l) => l.tipo === 'viagem' && comp(l) === mm.competencia)),
    mirai: round2(somaSe(rows, (l) => l.tipo === 'mirai' && comp(l) === mm.competencia)),
  }));
  return { por_tipo: porTipo, mensal, meses, n_lancamentos: rows.length };
}

export function pessoal(rows: Lancamento[]): PessoalData {
  const meses = mesesOrdenados(rows);
  const pes = rows.filter((l) => l.tipo === 'pessoal');
  const totais = new Map<string, number>();
  for (const l of pes) {
    const c = l.categoria ?? '—';
    totais.set(c, (totais.get(c) ?? 0) + Math.abs(l.valor));
  }
  const cats = [...totais.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  const porCategoria: CategoriaTotal[] = cats.map((c) => ({ categoria: c, total: round2(totais.get(c) ?? 0) }));
  const porCategoriaMensal: Record<string, number[]> = {};
  for (const c of cats) {
    porCategoriaMensal[c] = meses.map((mm) =>
      round2(somaAbs(pes, (l) => (l.categoria ?? '—') === c && comp(l) === mm.competencia)));
  }
  const comparativo: ComparativoLinha[] = meses.map((mm) => ({
    label: mm.label,
    receita: round2(somaSe(rows, (l) => l.tipo === 'receita' && comp(l) === mm.competencia)),
    gastos: round2(somaAbs(pes, (l) => comp(l) === mm.competencia)),
  }));
  return {
    labels_mes: meses.map((m) => m.label),
    por_categoria: porCategoria,
    por_categoria_mensal: porCategoriaMensal,
    comparativo,
    lancamentos: sortLanc(pes),
    breakdown: buildBreakdown(
      pes,
      (l) => l.categoria ?? '—',
      (l) => l.descricao || '—',
      (l) => l.valor,
    ),
  };
}

export function mirai(rows: Lancamento[]): MiraiData {
  const meses = mesesOrdenados(rows);
  const mir = rows.filter((l) => l.tipo === 'mirai');
  const rec = rows.filter((l) => l.tipo === 'receita');
  const catSoma = (sub: Lancamento[], termo: string): number =>
    -somaSe(sub, (l) => (l.categoria ?? '').toLowerCase().includes(termo));

  const demonstrativo: DemonstrativoLinha[] = meses.map((mm) => {
    const sub = mir.filter((l) => comp(l) === mm.competencia);
    const saas = catSoma(sub, 'saas');
    const colab = catSoma(sub, 'colaborad');
    const outros = catSoma(sub, 'outros');
    const sal = somaSe(rec, (l) => l.is_nexlex && comp(l) === mm.competencia);
    return {
      label: mm.label,
      receita_nexlex: round2(sal + saas + colab + outros),
      saas: round2(saas), colaboradores: round2(colab), outros: round2(outros),
      salario_liquido: round2(sal),
    };
  });

  const saasRows = mir.filter((l) => (l.categoria ?? '').toLowerCase().includes('saas'));
  const sisTot = new Map<string, number>();
  for (const l of saasRows) {
    const s = l.sistema ?? 'Outro';
    sisTot.set(s, (sisTot.get(s) ?? 0) + Math.abs(l.valor));
  }
  const sistemas = [...sisTot.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
  const sistemasMensal: Record<string, number[]> = {};
  const alertas: Alerta[] = [];
  for (const s of sistemas) {
    const serie = meses.map((mm) =>
      round2(somaAbs(saasRows, (l) => (l.sistema ?? 'Outro') === s && comp(l) === mm.competencia)));
    sistemasMensal[s] = serie;
    const nz = serie.filter((v) => v > 0);
    if (nz.length < 2) continue;
    const media = nz.reduce((a, v) => a + v, 0) / nz.length;
    serie.forEach((v, i) => {
      const mm = meses[i];
      if (!mm || v <= 0 || media <= 0) return;
      const desv = (v / media - 1) * 100;
      if (desv >= ALERTA_MARGEM_PCT) {
        alertas.push({ sistema: s, label: mm.label, valor: v, media: round2(media), desvio_pct: Math.round(desv * 10) / 10 });
      }
    });
  }
  alertas.sort((a, b) => b.desvio_pct - a.desvio_pct);

  return {
    labels_mes: meses.map((m) => m.label),
    demonstrativo, sistemas, sistemas_mensal: sistemasMensal, alertas,
    lancamentos: sortLanc(mir),
    breakdown: buildBreakdown(
      mir,
      // Agrupa por categoria (SaaS, Colaboradores, Outros). Item =
      // sistema (quando houver) ou descrição livre.
      (l) => l.categoria ?? '—',
      (l) => l.sistema || l.descricao || '—',
      (l) => l.valor,
    ),
  };
}

export function viagens(rows: Lancamento[]): ViagensData {
  const via = rows.filter((l) => l.tipo === 'viagem');
  const totais = new Map<string, number>();
  for (const l of via) {
    const v = l.viagem ?? 'Outros';
    totais.set(v, (totais.get(v) ?? 0) + Math.abs(l.valor));
  }
  const ordem = [...totais.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
  const porViagem: ViagemTotal[] = ordem.map((v) => {
    const sub = via.filter((l) => (l.viagem ?? 'Outros') === v);
    const scTot = new Map<string, number>();
    for (const l of sub) {
      const sc = l.subcategoria ?? '—';
      scTot.set(sc, (scTot.get(sc) ?? 0) + Math.abs(l.valor));
    }
    const subcategorias: SubcatTotal[] = [...scTot.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([sc, t]) => ({ subcategoria: sc, total: round2(t) }));
    return { viagem: v, total: round2(somaAbs(sub, () => true)), n: sub.length, subcategorias };
  });
  return {
    por_viagem: porViagem,
    comparativo: porViagem.map((x) => ({ viagem: x.viagem, total: x.total })),
    lancamentos: sortLanc(via),
    breakdown: buildBreakdown(
      via,
      (l) => l.viagem ?? 'Outros',
      (l) => l.subcategoria || l.descricao || '—',
      (l) => l.valor,
    ),
  };
}

export function receitas(rows: Lancamento[]): ReceitasData {
  const meses = mesesOrdenados(rows);
  const rec = rows.filter((l) => l.tipo === 'receita');
  const totais = new Map<string, number>();
  for (const l of rec) {
    const c = l.cliente_obs || '—';
    totais.set(c, (totais.get(c) ?? 0) + l.valor);
  }
  const clientes = [...totais.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  const porCliente: ClienteTotal[] = clientes.map((c) => ({ cliente: c, total: round2(totais.get(c) ?? 0) }));
  const clienteMensal: Record<string, number[]> = {};
  for (const c of clientes) {
    clienteMensal[c] = meses.map((mm) =>
      round2(somaSe(rec, (l) => (l.cliente_obs || '—') === c && comp(l) === mm.competencia)));
  }
  return {
    labels_mes: meses.map((m) => m.label),
    por_cliente: porCliente,
    cliente_mensal: clienteMensal,
    lancamentos: sortLanc(rec),
    breakdown: buildBreakdown(
      rec,
      (l) => l.cliente_obs || '—',
      (l) => l.descricao || '—',
      (l) => l.valor,
    ),
  };
}
