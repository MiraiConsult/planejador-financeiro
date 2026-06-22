// Análises avançadas do Controle Financeiro: comparações período×dimensão e
// indicadores (resultado, poupança, fixo×variável, Pareto, origem, movers).
// Hierarquia: tipo (área) → centro de custo (categoria) → rubrica (subcategoria).

import type { Lancamento } from './analytics';
import { mesesOrdenados } from './analytics';

const round2 = (v: number): number => {
  const r = Math.round(v * 100) / 100;
  return r === 0 ? 0 : r;
};
const comp = (l: Lancamento): number => l.competencia ?? 0;
const ehDespesa = (l: Lancamento): boolean => l.tipo !== 'receita';

// ─────────────────────────── Comparações ───────────────────────────

export type Eixo = 'mes' | 'ano';
export type Dimensao = 'tipo' | 'centro' | 'rubrica';
export type Escopo = 'despesas' | 'tudo' | 'receita' | 'pessoal' | 'mirai' | 'viagem';

const tipoLabel: Record<string, string> = {
  receita: 'Receita', pessoal: 'Pessoal', mirai: 'Mirai', viagem: 'Viagem',
};

function dimVal(l: Lancamento, d: Dimensao): string {
  if (d === 'tipo') return tipoLabel[l.tipo] ?? l.tipo;
  if (d === 'centro') return l.categoria || '—';
  return l.subcategoria || '—';
}
function noEscopo(l: Lancamento, e: Escopo): boolean {
  if (e === 'tudo') return true;
  if (e === 'despesas') return ehDespesa(l);
  return l.tipo === e;
}
function periodoDe(l: Lancamento, eixo: Eixo): { key: string; ord: number; label: string } {
  if (eixo === 'ano') {
    const a = l.ano ?? 0;
    return { key: String(a), ord: a, label: String(a) };
  }
  const c = comp(l);
  const label = l.ano ? `${(l.mes || '').slice(0, 3)}/${String(l.ano).slice(2)}` : l.mes;
  return { key: String(c), ord: c, label };
}

export interface LinhaComparacao {
  nome: string;
  valores: number[];
  total: number;
  variacao_pct: number | null; // último período vs anterior
}
export interface MatrizComparacao {
  periodos: { key: string; label: string }[];
  linhas: LinhaComparacao[];
  totais: number[];
  total_geral: number;
  max_celula: number;
}

export function comparar(rows: Lancamento[], eixo: Eixo, dimensao: Dimensao, escopo: Escopo): MatrizComparacao {
  const sub = rows.filter((l) => noEscopo(l, escopo));
  const pmap = new Map<string, { key: string; ord: number; label: string }>();
  for (const l of sub) {
    const p = periodoDe(l, eixo);
    if (!pmap.has(p.key)) pmap.set(p.key, p);
  }
  const periodos = [...pmap.values()].sort((a, b) => a.ord - b.ord);
  const pIndex = new Map(periodos.map((p, i) => [p.key, i]));

  const lin = new Map<string, number[]>();
  for (const l of sub) {
    const nome = dimVal(l, dimensao);
    const pi = pIndex.get(periodoDe(l, eixo).key);
    if (pi === undefined) continue;
    if (!lin.has(nome)) lin.set(nome, periodos.map(() => 0));
    lin.get(nome)![pi]! += Math.abs(l.valor);
  }

  let maxCelula = 0;
  const linhas: LinhaComparacao[] = [...lin.entries()]
    .map(([nome, vals]) => {
      const valores = vals.map(round2);
      for (const v of valores) if (v > maxCelula) maxCelula = v;
      const total = round2(valores.reduce((a, v) => a + v, 0));
      const n = valores.length;
      const ult = valores[n - 1] ?? 0;
      const pen = valores[n - 2] ?? 0;
      const variacao_pct = pen > 0 ? round2((ult / pen - 1) * 100) : null;
      return { nome, valores, total, variacao_pct };
    })
    .sort((a, b) => b.total - a.total);

  const totais = periodos.map((_, i) => round2(linhas.reduce((a, l) => a + (l.valores[i] ?? 0), 0)));
  const total_geral = round2(totais.reduce((a, v) => a + v, 0));
  return {
    periodos: periodos.map((p) => ({ key: p.key, label: p.label })),
    linhas,
    totais,
    total_geral,
    max_celula: maxCelula,
  };
}

// ─────────────────────────── Indicadores ───────────────────────────

export interface MesResultado {
  competencia: number;
  label: string;
  receita: number;
  despesa: number; // pessoal + viagem (despesa de vida)
  mirai: number;
  resultado: number;
  taxa_poupanca: number; // %
}
export interface ParetoItem { nome: string; total: number; pct: number; pct_acum: number; }
export interface OrigemItem { origem: string; total: number; }
export interface Mover { nome: string; de: number; para: number; delta: number; delta_pct: number | null; }

export interface Indicadores {
  meses: MesResultado[];
  n_meses: number;
  receita_total: number;
  despesa_total: number;
  mirai_total: number;
  resultado_total: number;
  taxa_poupanca_media: number;
  custo_fixo_mensal: number;
  custo_variavel_mensal: number;
  pareto: ParetoItem[];
  por_origem: OrigemItem[];
  maiores: Lancamento[];
  movers: Mover[];
  run_rate_anual: number;
}

export function indicadores(rows: Lancamento[]): Indicadores {
  const meses = mesesOrdenados(rows);
  const nMeses = Math.max(1, meses.length);

  const linhasMes: MesResultado[] = meses.map((mm) => {
    const noMes = (l: Lancamento) => comp(l) === mm.competencia;
    const receita = round2(rows.filter((l) => l.tipo === 'receita' && noMes(l)).reduce((a, l) => a + l.valor, 0));
    const despesa = round2(rows.filter((l) => (l.tipo === 'pessoal' || l.tipo === 'viagem') && noMes(l)).reduce((a, l) => a + Math.abs(l.valor), 0));
    const mirai = round2(rows.filter((l) => l.tipo === 'mirai' && noMes(l)).reduce((a, l) => a + Math.abs(l.valor), 0));
    const resultado = round2(receita - despesa);
    const taxa = receita > 0 ? round2((resultado / receita) * 100) : 0;
    return { competencia: mm.competencia, label: mm.label, receita, despesa, mirai, resultado, taxa_poupanca: taxa };
  });

  const receitaTotal = round2(linhasMes.reduce((a, m) => a + m.receita, 0));
  const despesaTotal = round2(linhasMes.reduce((a, m) => a + m.despesa, 0));
  const miraiTotal = round2(linhasMes.reduce((a, m) => a + m.mirai, 0));
  const resultadoTotal = round2(receitaTotal - despesaTotal);
  const taxaMedia = receitaTotal > 0 ? round2((resultadoTotal / receitaTotal) * 100) : 0;

  // Fixo × variável: agrupa despesas de vida por rubrica (categoria|subcategoria).
  // Fixo = aparece em ≥60% dos meses E baixa variação (CV < 0,35).
  const despVida = rows.filter((l) => l.tipo === 'pessoal' || l.tipo === 'viagem');
  const grupos = new Map<string, number[]>();
  for (const l of despVida) {
    const key = `${l.categoria ?? '—'}||${l.subcategoria ?? '—'}`;
    if (!grupos.has(key)) grupos.set(key, meses.map(() => 0));
    const pi = meses.findIndex((m) => m.competencia === comp(l));
    if (pi >= 0) grupos.get(key)![pi]! += Math.abs(l.valor);
  }
  let fixoTotal = 0;
  let varTotal = 0;
  for (const serie of grupos.values()) {
    const total = serie.reduce((a, v) => a + v, 0);
    const presentes = serie.filter((v) => v > 0);
    const recorrencia = presentes.length / nMeses;
    const media = presentes.length ? presentes.reduce((a, v) => a + v, 0) / presentes.length : 0;
    const variancia = presentes.length ? presentes.reduce((a, v) => a + (v - media) ** 2, 0) / presentes.length : 0;
    const cv = media > 0 ? Math.sqrt(variancia) / media : 1;
    if (recorrencia >= 0.6 && cv < 0.35) fixoTotal += total;
    else varTotal += total;
  }
  const custoFixoMensal = round2(fixoTotal / nMeses);
  const custoVariavelMensal = round2(varTotal / nMeses);

  // Pareto das rubricas (despesa de vida).
  const porRubrica = new Map<string, number>();
  for (const l of despVida) {
    const nome = l.subcategoria || l.categoria || '—';
    porRubrica.set(nome, (porRubrica.get(nome) ?? 0) + Math.abs(l.valor));
  }
  const rubricasOrd = [...porRubrica.entries()].sort((a, b) => b[1] - a[1]);
  const somaRub = rubricasOrd.reduce((a, [, v]) => a + v, 0) || 1;
  let acum = 0;
  const pareto: ParetoItem[] = rubricasOrd.map(([nome, total]) => {
    acum += total;
    return { nome, total: round2(total), pct: round2((total / somaRub) * 100), pct_acum: round2((acum / somaRub) * 100) };
  });

  // Por origem (despesa de vida).
  const porOrigem = new Map<string, number>();
  for (const l of despVida) {
    const o = l.origem || '—';
    porOrigem.set(o, (porOrigem.get(o) ?? 0) + Math.abs(l.valor));
  }
  const porOrigemArr: OrigemItem[] = [...porOrigem.entries()]
    .map(([origem, total]) => ({ origem, total: round2(total) }))
    .sort((a, b) => b.total - a.total);

  // Maiores gastos individuais.
  const maiores = [...despVida].sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor)).slice(0, 10);

  // Movers: rubrica no último mês vs penúltimo.
  let movers: Mover[] = [];
  if (meses.length >= 2) {
    const ultimo = meses[meses.length - 1]!.competencia;
    const penult = meses[meses.length - 2]!.competencia;
    const somaRubMes = (cmp: number) => {
      const m = new Map<string, number>();
      for (const l of despVida) {
        if (comp(l) !== cmp) continue;
        const nome = l.subcategoria || l.categoria || '—';
        m.set(nome, (m.get(nome) ?? 0) + Math.abs(l.valor));
      }
      return m;
    };
    const mU = somaRubMes(ultimo);
    const mP = somaRubMes(penult);
    const nomes = new Set([...mU.keys(), ...mP.keys()]);
    movers = [...nomes]
      .map((nome) => {
        const de = round2(mP.get(nome) ?? 0);
        const para = round2(mU.get(nome) ?? 0);
        const delta = round2(para - de);
        const delta_pct = de > 0 ? round2((para / de - 1) * 100) : null;
        return { nome, de, para, delta, delta_pct };
      })
      .filter((m) => Math.abs(m.delta) >= 1)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 8);
  }

  const runRate = round2((resultadoTotal / nMeses) * 12);

  return {
    meses: linhasMes,
    n_meses: meses.length,
    receita_total: receitaTotal,
    despesa_total: despesaTotal,
    mirai_total: miraiTotal,
    resultado_total: resultadoTotal,
    taxa_poupanca_media: taxaMedia,
    custo_fixo_mensal: custoFixoMensal,
    custo_variavel_mensal: custoVariavelMensal,
    pareto,
    por_origem: porOrigemArr,
    maiores,
    movers,
    run_rate_anual: runRate,
  };
}

// ─────────────────── Contexto agregado pra IA ───────────────────
// Resumo textual compacto (NÃO os lançamentos crus) pra alimentar o LLM.

export function resumoParaIA(rows: Lancamento[]): string {
  const ind = indicadores(rows);
  const L: string[] = [];
  const primeiro = ind.meses[0]?.label ?? '?';
  const ultimo = ind.meses[ind.meses.length - 1]?.label ?? '?';

  L.push(`PERÍODO: ${ind.n_meses} mês(es), de ${primeiro} a ${ultimo}.`);
  L.push(
    `TOTAIS: receita R$ ${ind.receita_total}; despesa de vida R$ ${ind.despesa_total}; ` +
      `Mirai (PJ, à parte) R$ ${ind.mirai_total}; resultado R$ ${ind.resultado_total}; ` +
      `taxa de poupança média ${ind.taxa_poupanca_media}%; run-rate anual R$ ${ind.run_rate_anual}.`,
  );
  L.push(`CUSTO mensal estimado: fixo R$ ${ind.custo_fixo_mensal} · variável R$ ${ind.custo_variavel_mensal}.`);

  L.push('\nRESULTADO POR MÊS (receita / despesa / resultado / poupança%):');
  for (const m of ind.meses) {
    L.push(`  ${m.label}: ${m.receita} / ${m.despesa} / ${m.resultado} / ${m.taxa_poupanca}%`);
  }

  L.push('\nRUBRICAS QUE MAIS PESAM (Pareto):');
  for (const p of ind.pareto.slice(0, 12)) {
    L.push(`  ${p.nome}: R$ ${p.total} (${p.pct}% do total, acumulado ${p.pct_acum}%)`);
  }

  L.push('\nGASTO POR ORIGEM:');
  for (const o of ind.por_origem) L.push(`  ${o.origem}: R$ ${o.total}`);

  if (ind.movers.length) {
    L.push('\nMAIORES VARIAÇÕES (último mês vs anterior):');
    for (const mv of ind.movers) L.push(`  ${mv.nome}: ${mv.de} → ${mv.para} (${mv.delta > 0 ? '+' : ''}${mv.delta})`);
  }

  L.push('\nMAIORES GASTOS INDIVIDUAIS:');
  for (const l of ind.maiores.slice(0, 8)) {
    L.push(`  ${l.descricao} [${l.categoria ?? '—'}]: R$ ${Math.abs(l.valor)} em ${l.data}`);
  }

  const cmp = comparar(rows, 'mes', 'centro', 'despesas');
  L.push('\nDESPESA POR CENTRO DE CUSTO E MÊS:');
  L.push(`  centro | ${cmp.periodos.map((p) => p.label).join(' | ')}`);
  for (const lin of cmp.linhas.slice(0, 10)) {
    L.push(`  ${lin.nome} | ${lin.valores.join(' | ')}`);
  }

  return L.join('\n');
}
