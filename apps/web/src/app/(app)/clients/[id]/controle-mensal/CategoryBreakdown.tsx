'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { BarChart3, List } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { brl } from '@/lib/controle-mensal/format';
import type { BreakdownData, BreakdownGroup } from '@/lib/controle-mensal/analytics';
import { cor, Barras, LinhaMulti } from './charts';

interface KpiTile { label: string; value: string; tone?: 'positive' | 'negative' | 'default'; color?: string; }

interface Props {
  totalLabel: string;
  total?: number;
  data: BreakdownData;
  topKpis?: number;
  itemsPerCard?: number;
  tone?: 'positive' | 'negative' | 'default';
  footer?: ReactNode;
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
  /** Modal state: { grupo, modo } — modo = 'itens' (ver todos) | 'comparacao' */
  const [modal, setModal] = useState<{ idx: number; modo: 'itens' | 'comparacao' } | null>(null);
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
  const grupoModal = modal ? grupos[modal.idx] : null;

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
                <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: k.color }} />
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
                  <span className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: cor(i) }} />
                  <span className="flex-1 text-sm text-slate-800 dark:text-slate-100 truncate">{g.chave}</span>
                  <span className="text-sm font-medium tabular-nums text-slate-900 dark:text-slate-50">{brl(g.total)}</span>
                  <span className="text-[11px] tabular-nums text-slate-500 w-10 text-right">{g.pct.toFixed(1)}%</span>
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
              onVerTodos={() => setModal({ idx: i, modo: 'itens' })}
              onComparacao={() => setModal({ idx: i, modo: 'comparacao' })}
              temSerieMensal={(data.serie_mensal[g.chave]?.length ?? 0) >= 2}
            />
          ))}
        </div>
      </div>

      {footer}

      {/* ─── Modal: ver todos os itens da categoria ──────────────── */}
      {grupoModal && modal?.modo === 'itens' && (
        <Dialog
          open
          onClose={() => setModal(null)}
          size="lg"
          title={
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: cor(modal.idx) }} />
              <span>{grupoModal.chave}</span>
            </div>
          }
          description={
            <span>
              {grupoModal.itens.length} {grupoModal.itens.length === 1 ? 'item' : 'itens'} ·{' '}
              <span className="font-semibold tabular-nums">{brl(grupoModal.total)}</span> ·{' '}
              {grupoModal.pct.toFixed(1)}% do total
            </span>
          }
        >
          <ItensCompletos grupo={grupoModal} />
        </Dialog>
      )}

      {/* ─── Modal: comparação (mensal + rubricas) ────────────────── */}
      {grupoModal && modal?.modo === 'comparacao' && (
        <Dialog
          open
          onClose={() => setModal(null)}
          size="xl"
          title={
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: cor(modal.idx) }} />
              <span>Comparação · {grupoModal.chave}</span>
            </div>
          }
          description="Evolução mensal e composição por rubrica dentro desta categoria"
        >
          <ComparacaoCategoria
            grupo={grupoModal}
            cor={cor(modal.idx)}
            labelsMes={data.labels_mes}
            serieMensal={data.serie_mensal[grupoModal.chave] ?? []}
            todasSeries={data.serie_mensal}
          />
        </Dialog>
      )}
    </div>
  );
}

function GrupoCard({
  grupo,
  cor: corHex,
  percentual,
  maxItens,
  onVerTodos,
  onComparacao,
  temSerieMensal,
}: {
  grupo: BreakdownGroup;
  cor: string;
  percentual: number;
  maxItens: number;
  onVerTodos: () => void;
  onComparacao: () => void;
  temSerieMensal: boolean;
}) {
  const visiveis = grupo.itens.slice(0, maxItens);
  const restantes = grupo.itens.length - visiveis.length;
  const restoSoma = grupo.itens.slice(maxItens).reduce((acc, it) => acc + it.valor, 0);
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
      <div className="px-4 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: corHex }} />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
              {grupo.chave}
            </p>
          </div>
          {temSerieMensal && (
            <button
              type="button"
              onClick={onComparacao}
              className="shrink-0 inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              title="Ver comparação mensal e por rubrica"
            >
              <BarChart3 size={10} />
              Comparação
            </button>
          )}
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-50">{brl(grupo.total)}</p>
          <p className="text-[11px] tabular-nums text-slate-500">{percentual.toFixed(1)}%</p>
        </div>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800 flex-1">
        {visiveis.map((it) => (
          <li key={it.nome} className="flex items-center justify-between gap-3 px-4 py-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-xs text-slate-700 dark:text-slate-200 truncate">{it.nome}</p>
              {it.n > 1 && (
                <span className="text-[10px] text-slate-400 tabular-nums shrink-0">({it.n}x)</span>
              )}
            </div>
            <span className="text-xs font-medium tabular-nums text-slate-700 dark:text-slate-200 shrink-0">
              {brl(it.valor)}
            </span>
          </li>
        ))}
        {restantes > 0 && (
          <li>
            <button
              type="button"
              onClick={onVerTodos}
              className="w-full flex items-center justify-between gap-3 px-4 py-1.5 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
            >
              <span className="flex items-center gap-1.5 text-xs group-hover:text-brand-600 dark:group-hover:text-brand-400">
                <List size={11} />
                +{restantes} {restantes === 1 ? 'restante' : 'restantes'} — ver todos
              </span>
              <span className="text-xs font-medium tabular-nums">{brl(restoSoma)}</span>
            </button>
          </li>
        )}
      </ul>
      <div className="h-1.5 bg-slate-100 dark:bg-slate-800">
        <div className="h-full" style={{ width: `${percentual}%`, backgroundColor: corHex }} />
      </div>
    </div>
  );
}

function ItensCompletos({ grupo }: { grupo: BreakdownGroup }) {
  const max = Math.max(...grupo.itens.map((i) => i.valor), 1);
  return (
    <div className="max-h-[60vh] overflow-y-auto -mx-2">
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {grupo.itens.map((it) => {
          const pct = (it.valor / grupo.total) * 100;
          return (
            <li key={it.nome} className="px-2 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-sm text-slate-800 dark:text-slate-100 truncate">{it.nome}</p>
                  {it.n > 1 && (
                    <span className="text-[10px] text-slate-400 tabular-nums shrink-0">({it.n}x)</span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium tabular-nums text-slate-900 dark:text-slate-50">{brl(it.valor)}</p>
                  <p className="text-[10px] tabular-nums text-slate-400">{pct.toFixed(1)}%</p>
                </div>
              </div>
              <div className="mt-1 h-1 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-brand-500/60" style={{ width: `${(it.valor / max) * 100}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ComparacaoCategoria({
  grupo,
  cor: corHex,
  labelsMes,
  serieMensal,
  todasSeries,
}: {
  grupo: BreakdownGroup;
  cor: string;
  labelsMes: string[];
  serieMensal: number[];
  todasSeries: Record<string, number[]>;
}) {
  // ── KPIs do recorte da categoria ────────────────────────────────────
  const dadosNz = serieMensal.filter((v) => v > 0);
  const media = dadosNz.length ? dadosNz.reduce((a, v) => a + v, 0) / dadosNz.length : 0;
  const maior = serieMensal.length ? Math.max(...serieMensal) : 0;
  const menor = dadosNz.length ? Math.min(...dadosNz) : 0;
  const idxMaior = serieMensal.indexOf(maior);
  const idxMenor = dadosNz.length ? serieMensal.indexOf(menor) : -1;

  // ── Top 6 rubricas pra evolução mensal ─────────────────────────────
  // Como não temos série mensal por *rubrica* (só por grupo), o gráfico
  // de evolução mostra a categoria inteira × a média de todas as outras
  // categorias no mesmo período, pra dar contexto comparativo.
  const outrasMedias = useMemo(() => {
    const out = new Array(labelsMes.length).fill(0);
    const conts = new Array(labelsMes.length).fill(0);
    for (const [g, arr] of Object.entries(todasSeries)) {
      if (g === grupo.chave) continue;
      for (let i = 0; i < labelsMes.length; i++) {
        if ((arr[i] ?? 0) > 0) {
          out[i] += arr[i] ?? 0;
          conts[i] += 1;
        }
      }
    }
    return out.map((v, i) => (conts[i] > 0 ? v / conts[i] : 0));
  }, [labelsMes.length, todasSeries, grupo.chave]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Kpi label="Total" value={brl(grupo.total)} />
        <Kpi label="Média mensal" value={brl(media)} />
        <Kpi
          label="Pico"
          value={brl(maior)}
          sub={idxMaior >= 0 ? labelsMes[idxMaior] : undefined}
          tone="negative"
        />
        <Kpi
          label="Menor"
          value={brl(menor)}
          sub={idxMenor >= 0 ? labelsMes[idxMenor] : undefined}
          tone="positive"
        />
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
          Evolução mensal
        </p>
        <LinhaMulti
          labels={labelsMes}
          series={[
            { label: grupo.chave, cor: corHex, valores: serieMensal },
            { label: 'Média das demais categorias', cor: '#94a3b8', valores: outrasMedias },
          ]}
        />
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
          Composição por rubrica
        </p>
        <Barras
          horizontal
          labels={grupo.itens.slice(0, 12).map((i) => i.nome)}
          series={[{ label: 'Total', cor: corHex, valores: grupo.itens.slice(0, 12).map((i) => i.valor) }]}
        />
        {grupo.itens.length > 12 && (
          <p className="text-[11px] text-slate-500 mt-1">
            Mostrando top 12 de {grupo.itens.length} rubricas.
          </p>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'positive' | 'negative' }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p
        className={`text-base font-bold tabular-nums ${
          tone === 'negative' ? 'text-red-600' : tone === 'positive' ? 'text-emerald-600' : 'text-slate-900 dark:text-slate-50'
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}
