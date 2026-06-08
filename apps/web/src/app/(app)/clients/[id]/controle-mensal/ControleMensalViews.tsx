'use client';

import { useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { Tag, Wallet, TrendingDown, Scale } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { KpiCard } from '@/components/KpiCard';
import { brl } from '@/lib/controle-mensal/format';
import * as analytics from '@/lib/controle-mensal/analytics';
import type { Lancamento } from '@/lib/controle-mensal/analytics';
import { indicadores } from '@/lib/controle-mensal/analises';
import {
  type Centro, type CentroNode, buildTree, descendentes,
} from '@/lib/controle-mensal/centros';
import { LancamentosTable } from './LancamentosTable';
import type { Sugestoes } from './LancamentoForm';
import { GeralDashboard } from './GeralDashboard';
import { ComparacoesView } from './ComparacoesView';
import { AnaliseIAView } from './AnaliseIAView';
import { CategoryBreakdown } from './CategoryBreakdown';
import { PeriodPicker, resolvePeriod, filterByPeriod, type PeriodFilter } from './PeriodPicker';
import { DemonstrativoCentro } from './DemonstrativoCentro';

function Icone({ nome, size = 14 }: { nome: string; size?: number }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Cmp = (Lucide as any)[nome] ?? Tag;
  return <Cmp size={size} />;
}

interface Props {
  rows: Lancamento[];
  clientId: string;
  sugestoes: Sugestoes;
  centros: Centro[];
}

export function ControleMensalViews({ rows, clientId, sugestoes, centros }: Props) {
  const tree = useMemo(() => buildTree(centros.filter((c) => c.ativo)), [centros]);
  const raizes = tree;
  // Tabs: 1 por centro raiz ativo + Resumo
  const [tab, setTab] = useState<string>(() => raizes[0]?.id ?? 'resumo');
  const [periodo, setPeriodo] = useState<PeriodFilter>({ preset: 'tudo', from: null, to: null });

  const availableComps = useMemo(
    () => rows.map((r) => r.competencia ?? 0).filter((c) => c > 0),
    [rows],
  );
  const resolved = useMemo(() => resolvePeriod(periodo, availableComps), [periodo, availableComps]);
  const rowsFiltrados = useMemo(() => filterByPeriod(rows, resolved), [rows, resolved]);

  // KPIs gerais do header (reagem ao filtro)
  const totaisGerais = useMemo(() => {
    let receitas = 0;
    let despesas = 0;
    for (const l of rowsFiltrados) {
      if (l.eh_receita) receitas += Math.abs(l.valor);
      else despesas += Math.abs(l.valor);
    }
    return { receitas, despesas, liquido: receitas - despesas };
  }, [rowsFiltrados]);

  const tabAtiva = useMemo(
    () => raizes.find((r) => r.id === tab) ?? null,
    [raizes, tab],
  );

  return (
    <div className="space-y-4">
      {/* ─── KPIs gerais ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label="Receitas (período)" value={brl(totaisGerais.receitas)} tone="positive" icon={Wallet} />
        <KpiCard label="Despesas (período)" value={brl(totaisGerais.despesas)} tone="negative" icon={TrendingDown} />
        <KpiCard
          label="Resultado"
          value={brl(totaisGerais.liquido)}
          tone={totaisGerais.liquido < 0 ? 'negative' : 'positive'}
          icon={Scale}
        />
      </div>

      {/* ─── Tabs dinâmicas + filtro ───────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-0.5 text-sm">
          {raizes.map((r) => (
            <TabButton key={r.id} active={tab === r.id} onClick={() => setTab(r.id)} cor={r.cor}>
              <Icone nome={r.icone} size={13} />
              {r.nome}
            </TabButton>
          ))}
          <TabButton active={tab === 'resumo'} onClick={() => setTab('resumo')}>
            Resumo
          </TabButton>
        </div>
        <div className="flex items-center gap-2">
          {rowsFiltrados.length !== rows.length && (
            <span className="text-[11px] text-slate-500 tabular-nums">
              {rowsFiltrados.length}/{rows.length} no período
            </span>
          )}
          <PeriodPicker value={periodo} onChange={setPeriodo} availableComps={availableComps} />
        </div>
      </div>

      {rowsFiltrados.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-sm text-slate-500 py-12 text-center">
              Nenhum lançamento no período selecionado. Ajuste o filtro acima.
            </p>
          </CardContent>
        </Card>
      ) : tabAtiva ? (
        <CentroView
          node={tabAtiva}
          rows={rowsFiltrados}
          clientId={clientId}
          sugestoes={sugestoes}
          centrosCfg={centros}
        />
      ) : (
        <ResumoView
          rows={rowsFiltrados}
          centros={centros}
          clientId={clientId}
        />
      )}
    </div>
  );
}

function TabButton({
  active, onClick, children, cor,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  cor?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md transition-colors ${
        active
          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm font-medium'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
      }`}
      style={active && cor ? { boxShadow: `inset 0 -2px 0 ${cor}` } : undefined}
    >
      {children}
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * VIEW DE UM CENTRO — breakdown de despesas e/ou receitas; demonstrativo
 * opcional. Inclui descendentes do centro (hierarquia).
 * ────────────────────────────────────────────────────────────────────── */

type CentroSub = 'despesas' | 'receitas' | 'demonstrativo';

function CentroView({
  node, rows, clientId, sugestoes, centrosCfg,
}: {
  node: CentroNode;
  rows: Lancamento[];
  clientId: string;
  sugestoes: Sugestoes;
  centrosCfg: Centro[];
}) {
  const idsConjunto = useMemo(() => descendentes(node), [node]);
  const agg = useMemo(() => analytics.agregarPorCentro(rows, idsConjunto), [rows, idsConjunto]);

  const temReceitas = agg.totalReceitas > 0;
  const temDespesas = agg.totalDespesas > 0;
  const mostraDemonstrativo = node.tem_demonstrativo && (temReceitas || temDespesas);

  const subsDisponiveis = useMemo(() => {
    const arr: { id: CentroSub; label: string }[] = [];
    if (mostraDemonstrativo) arr.push({ id: 'demonstrativo', label: 'Demonstrativo' });
    if (temDespesas) arr.push({ id: 'despesas', label: 'Despesas' });
    if (temReceitas) arr.push({ id: 'receitas', label: 'Receitas' });
    return arr;
  }, [temReceitas, temDespesas, mostraDemonstrativo]);

  const [sub, setSub] = useState<CentroSub>(subsDisponiveis[0]?.id ?? 'despesas');
  const subAtivo = subsDisponiveis.find((s) => s.id === sub) ? sub : subsDisponiveis[0]?.id;

  if (subsDisponiveis.length === 0) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-slate-500 py-12 text-center">
            Nenhum lançamento neste centro no período selecionado.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sub-toggle (só se houver mais de uma sub-view) */}
      {subsDisponiveis.length > 1 && subAtivo && (
        <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-0.5 text-xs">
          {subsDisponiveis.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setSub(o.id)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                subAtivo === o.id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm font-medium'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      {subAtivo === 'demonstrativo' && (
        <DemonstrativoCentro centro={node} agg={agg} />
      )}

      {subAtivo === 'despesas' && (
        <>
          <CategoryBreakdown
            totalLabel={`Despesas · ${node.nome}`}
            data={agg.despesas}
          />
          <LancamentosTable
            rows={agg.lancamentosDespesas}
            clientId={clientId}
            sugestoes={sugestoes}
            centros={centrosCfg}
            titulo={`Lançamentos · ${node.nome}`}
            mostrarCentro={false}
          />
        </>
      )}

      {subAtivo === 'receitas' && (
        <>
          <CategoryBreakdown
            totalLabel={`Receitas · ${node.nome}`}
            data={agg.receitas}
            tone="positive"
          />
          <LancamentosTable
            rows={agg.lancamentosReceitas}
            clientId={clientId}
            sugestoes={sugestoes}
            centros={centrosCfg}
            titulo={`Receitas · ${node.nome}`}
            mostrarCentro={false}
          />
        </>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * RESUMO — Geral + Comparações + Análise IA consolidando todos os centros
 * ────────────────────────────────────────────────────────────────────── */

const RESUMO_SUB = [
  { id: 'geral',       label: 'Visão geral' },
  { id: 'comparacoes', label: 'Comparações' },
  { id: 'analise',     label: 'Análise IA'  },
] as const;
type ResumoSub = (typeof RESUMO_SUB)[number]['id'];

function ResumoView({
  rows, centros, clientId,
}: {
  rows: Lancamento[];
  centros: Centro[];
  clientId: string;
}) {
  const ind = useMemo(() => indicadores(rows), [rows]);
  const [sub, setSub] = useState<ResumoSub>('geral');
  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-0.5 text-xs">
        {RESUMO_SUB.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setSub(o.id)}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              sub === o.id
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm font-medium'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {sub === 'geral' && (
        <>
          <GeralDashboard ind={ind} />
          <ComparativoPorCentro rows={rows} centros={centros} />
        </>
      )}
      {sub === 'comparacoes' && <ComparacoesView rows={rows} />}
      {sub === 'analise' && <AnaliseIAView clientId={clientId} temDados={rows.length > 0} />}
    </div>
  );
}

/** Tabela com totais por centro (raiz, agregando descendentes). */
function ComparativoPorCentro({
  rows, centros,
}: { rows: Lancamento[]; centros: Centro[] }) {
  const tree = useMemo(() => buildTree(centros.filter((c) => c.ativo)), [centros]);
  const linhas = useMemo(() => {
    return tree.map((r) => {
      const ids = descendentes(r);
      const agg = analytics.agregarPorCentro(rows, ids);
      return {
        centro: r,
        receitas: agg.totalReceitas,
        despesas: agg.totalDespesas,
        liquido: agg.liquido,
      };
    }).filter((l) => l.receitas > 0 || l.despesas > 0);
  }, [tree, rows]);

  if (linhas.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparativo por centro</CardTitle>
        <CardDescription>Receitas, despesas e resultado agregando cada centro raiz e seus filhos</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 dark:bg-slate-800/60">
            <tr className="text-[10px] uppercase tracking-widest text-slate-500">
              <th className="text-left px-4 py-2.5 font-semibold">Centro</th>
              <th className="text-right px-3 py-2.5 font-semibold">Receitas</th>
              <th className="text-right px-3 py-2.5 font-semibold">Despesas</th>
              <th className="text-right px-4 py-2.5 font-semibold">Resultado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {linhas.map((l) => (
              <tr key={l.centro.id}>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-6 w-6 rounded-md flex items-center justify-center"
                      style={{ backgroundColor: `${l.centro.cor}22`, color: l.centro.cor }}
                    >
                      <Icone nome={l.centro.icone} size={12} />
                    </span>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{l.centro.nome}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-emerald-600">{brl(l.receitas)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-red-600">{brl(l.despesas)}</td>
                <td className={`px-4 py-2 text-right tabular-nums font-semibold ${l.liquido < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {brl(l.liquido)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
