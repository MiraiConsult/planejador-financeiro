'use client';

import { useState, type ReactNode } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Card, CardContent } from '@/components/ui/Card';
import { brl } from '@/lib/controle-mensal/format';
import type { BreakdownData, BreakdownGroup } from '@/lib/controle-mensal/analytics';
import { cor } from './charts';

interface KpiTile { label: string; value: string; tone?: 'positive' | 'negative' | 'default'; color?: string; }

interface Props {
  /** Título principal exibido no card de KPI "total". */
  totalLabel: string;
  /** Total geral (override do breakdown.total quando precisa de outro escopo). */
  total?: number;
  data: BreakdownData;
  /** Quantos grupos extras (além do total) mostrar como KPI. Default 3. */
  topKpis?: number;
  /** Quantos itens por card (resto vai num "+N restantes"). */
  itemsPerCard?: number;
  /** Tom do KPI total — default "negative" (gastos). Use "positive" pra receitas. */
  tone?: 'positive' | 'negative' | 'default';
  /** Conteúdo extra abaixo da grade de cards (ex: tabela de demonstrativo). */
  footer?: ReactNode;
  /** Quando true esconde o KPI de total (caso o caller já tenha um). */
  hideTotal?: boolean;
}

export function CategoryBreakdown({
  totalLabel,
  total,
  data,
  topKpis = 3,
  itemsPerCard = 6,
  tone = 'negative',
  footer,
  hideTotal,
}: Props) {
  const totalGeral = total ?? data.total;
  const [hover, setHover] = useState<number | null>(null);
  const grupos = data.grupos;

  if (totalGeral <= 0 || grupos.length === 0) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-slate-500 py-8 text-center">
            Sem dados para exibir nesse recorte.
          </p>
        </CardContent>
      </Card>
    );
  }

  const kpis: KpiTile[] = [];
  if (!hideTotal) kpis.push({ label: totalLabel, value: brl(totalGeral), tone });
  grupos.slice(0, topKpis).forEach((g, i) => {
    kpis.push({ label: g.chave, value: brl(g.total), color: cor(i) });
  });

  const chartData = grupos.map((g) => ({ name: g.chave, value: g.total }));
  const focado = hover != null ? grupos[hover] : null;

  return (
    <div className="space-y-4">
      {/* ─── KPIs no topo ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k, i) => (
          <div
            key={`${k.label}-${i}`}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 shadow-soft dark:shadow-none"
          >
            <div className="flex items-center gap-2">
              {k.color && (
                <span
                  className="h-2.5 w-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: k.color }}
                />
              )}
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                {k.label}
              </p>
            </div>
            <p
              className={`mt-1 text-xl font-bold tabular-nums ${
                k.tone === 'positive'
                  ? 'text-emerald-600'
                  : k.tone === 'negative'
                  ? 'text-red-600'
                  : 'text-slate-900 dark:text-slate-50'
              }`}
            >
              {k.value}
            </p>
          </div>
        ))}
      </div>

      {/* ─── Donut + legenda lateral ───────────────────────────────── */}
      <Card>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 items-center">
            <div className="relative h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={1}
                    isAnimationActive={false}
                    onMouseEnter={(_, idx) => setHover(idx)}
                    onMouseLeave={() => setHover(null)}
                  >
                    {chartData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={cor(i)}
                        stroke="#fff"
                        strokeWidth={2}
                        style={{
                          opacity: hover == null || hover === i ? 1 : 0.35,
                          transition: 'opacity 120ms',
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
                  {brl(focado ? focado.total : totalGeral)}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-[160px] truncate">
                  {focado ? focado.chave : totalLabel.toLowerCase()}
                </p>
                {focado && (
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                    {focado.pct.toFixed(1)}%
                  </p>
                )}
              </div>
            </div>

            <ul className="space-y-1 max-h-[260px] overflow-y-auto pr-1">
              {grupos.map((g, i) => (
                <li
                  key={g.chave}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  className={`flex items-center gap-3 px-2 py-1 rounded-md cursor-default transition-colors ${
                    hover === i ? 'bg-slate-100 dark:bg-slate-800/50' : ''
                  }`}
                >
                  <span
                    className="h-3 w-3 rounded-sm shrink-0"
                    style={{ backgroundColor: cor(i) }}
                  />
                  <span className="flex-1 text-sm text-slate-800 dark:text-slate-100 truncate">
                    {g.chave}
                  </span>
                  <span className="text-sm font-medium tabular-nums text-slate-900 dark:text-slate-50">
                    {brl(g.total)}
                  </span>
                  <span className="text-[11px] tabular-nums text-slate-500 w-10 text-right">
                    {g.pct.toFixed(1)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* ─── Detalhamento por categoria ────────────────────────────── */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
          Detalhamento por categoria
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {grupos.map((g, i) => (
            <GrupoCard
              key={g.chave}
              grupo={g}
              cor={cor(i)}
              maxItens={itemsPerCard}
              percentual={g.pct}
            />
          ))}
        </div>
      </div>

      {footer}
    </div>
  );
}

function GrupoCard({
  grupo,
  cor,
  percentual,
  maxItens,
}: {
  grupo: BreakdownGroup;
  cor: string;
  percentual: number;
  maxItens: number;
}) {
  const visiveis = grupo.itens.slice(0, maxItens);
  const restantes = grupo.itens.length - visiveis.length;
  const restoSoma = grupo.itens.slice(maxItens).reduce((acc, it) => acc + it.valor, 0);
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="px-4 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: cor }} />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
            {grupo.chave}
          </p>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-50">
            {brl(grupo.total)}
          </p>
          <p className="text-[11px] tabular-nums text-slate-500">{percentual.toFixed(1)}%</p>
        </div>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {visiveis.map((it) => (
          <li key={it.nome} className="flex items-center justify-between gap-3 px-4 py-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-xs text-slate-700 dark:text-slate-200 truncate">{it.nome}</p>
              {it.n > 1 && (
                <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
                  ({it.n}x)
                </span>
              )}
            </div>
            <span className="text-xs font-medium tabular-nums text-slate-700 dark:text-slate-200 shrink-0">
              {brl(it.valor)}
            </span>
          </li>
        ))}
        {restantes > 0 && (
          <li className="flex items-center justify-between gap-3 px-4 py-1.5 text-slate-500">
            <p className="text-xs">+{restantes} {restantes === 1 ? 'restante' : 'restantes'}</p>
            <span className="text-xs font-medium tabular-nums">{brl(restoSoma)}</span>
          </li>
        )}
      </ul>
      <div className="h-1.5 bg-slate-100 dark:bg-slate-800">
        <div className="h-full" style={{ width: `${percentual}%`, backgroundColor: cor }} />
      </div>
    </div>
  );
}
