'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface RowDetalhesSlim {
  receitas_por_ativo: Array<{ asset_id: string; nome: string; valor: number }>;
  despesas_por_categoria: Record<string, number>;
}

interface RowSlim {
  idade: number;
  receitas_total: number;
  despesas_essenciais: number;
  despesas_nao_essenciais: number;
  detalhes: RowDetalhesSlim;
}

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const brlShort = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(0)}k`;
  return String(Math.round(n));
};

// Paletas alternadas pra receitas (verdes) e despesas (vermelhos/laranjas).
const RECEITA_PALETTE = [
  '#059669', // emerald-600
  '#10b981', // emerald-500
  '#34d399', // emerald-400
  '#6ee7b7', // emerald-300
  '#0d9488', // teal-600
  '#14b8a6', // teal-500
];

const DESPESA_PALETTE = [
  '#dc2626', // red-600
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#fb923c', // orange-400
  '#f59e0b', // amber-500
  '#fbbf24', // amber-400
  '#a16207', // yellow-700
  '#ca8a04', // yellow-600
  '#be185d', // pink-700
  '#ec4899', // pink-500
  '#9333ea', // purple-600
];

const CATEGORIA_LABEL: Record<string, string> = {
  moradia: 'Moradia',
  alimentacao: 'Alimentação',
  transporte: 'Transporte',
  saude: 'Saúde',
  lazer: 'Lazer',
  servicos_dom: 'Serviços dom.',
  filhos: 'Filhos',
  estudos: 'Estudos',
  viagens: 'Viagens',
  cuidado_familia: 'Cuidado família',
  outro: 'Outro',
};

type Mode = 'breakdown' | 'comparison';

export function IncomeExpenseChart({ rows }: { rows: RowSlim[] }) {
  const [mode, setMode] = useState<Mode>('breakdown');

  // Coleta os nomes únicos de assets e categorias presentes em algum ano
  const { assetKeys, categoryKeys, data } = useMemo(() => {
    const assetSet = new Map<string, string>(); // key → label
    const catSet = new Map<string, string>();

    for (const r of rows) {
      for (const a of r.detalhes.receitas_por_ativo ?? []) {
        if (!assetSet.has(a.asset_id)) assetSet.set(a.asset_id, a.nome);
      }
      for (const cat of Object.keys(r.detalhes.despesas_por_categoria ?? {})) {
        if (!catSet.has(cat)) catSet.set(cat, CATEGORIA_LABEL[cat] ?? cat);
      }
    }
    const assetKeys = Array.from(assetSet.entries()).map(([id, label]) => ({ id, label }));
    const categoryKeys = Array.from(catSet.entries()).map(([id, label]) => ({ id, label }));

    const data = rows.map((r) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row: any = { idade: r.idade };
      // Receitas positivas
      for (const a of r.detalhes.receitas_por_ativo ?? []) {
        row[`asset:${a.asset_id}`] = a.valor;
      }
      // Despesas negativas (entram abaixo do zero)
      for (const [cat, val] of Object.entries(r.detalhes.despesas_por_categoria ?? {})) {
        row[`cat:${cat}`] = -val;
      }
      row.__receitas_total = r.receitas_total;
      row.__despesas_total = -(r.despesas_essenciais + r.despesas_nao_essenciais);
      row.__fluxo = r.receitas_total - r.despesas_essenciais - r.despesas_nao_essenciais;
      return row;
    });

    return { assetKeys, categoryKeys, data };
  }, [rows]);

  // Tooltip detalhado
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload;
    const receitas: { name: string; v: number; color: string }[] = [];
    const despesas: { name: string; v: number; color: string }[] = [];
    for (const p of payload) {
      const key: string = p.dataKey;
      if (!p.value || p.value === 0) continue;
      if (key.startsWith('asset:')) {
        const id = key.slice(6);
        const meta = assetKeys.find((a) => a.id === id);
        receitas.push({ name: meta?.label ?? id, v: p.value, color: p.color });
      } else if (key.startsWith('cat:')) {
        const id = key.slice(4);
        const meta = categoryKeys.find((c) => c.id === id);
        despesas.push({ name: meta?.label ?? id, v: -p.value, color: p.color });
      }
    }
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-soft-lg p-3 min-w-[240px]">
        <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">Idade {label}</p>
        {receitas.length > 0 && (
          <div className="mb-2">
            <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Receitas</p>
            {receitas.map((r) => (
              <div key={r.name} className="flex items-center gap-2 text-xs">
                <span className="h-2 w-2 rounded-sm" style={{ background: r.color }} />
                <span className="flex-1 truncate text-slate-700 dark:text-slate-200">{r.name}</span>
                <span className="tabular-nums font-medium text-emerald-700 dark:text-emerald-400">+{brl(r.v)}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 mt-1 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold">
              <span className="flex-1 text-slate-500 dark:text-slate-400">Total</span>
              <span className="tabular-nums text-emerald-700 dark:text-emerald-400">+{brl(point.__receitas_total)}</span>
            </div>
          </div>
        )}
        {despesas.length > 0 && (
          <div className="mb-2">
            <p className="text-[11px] font-semibold text-red-700 dark:text-red-400 mb-1">Despesas</p>
            {despesas.map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <span className="h-2 w-2 rounded-sm" style={{ background: d.color }} />
                <span className="flex-1 truncate text-slate-700 dark:text-slate-200">{d.name}</span>
                <span className="tabular-nums font-medium text-red-700 dark:text-red-400">−{brl(d.v)}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 mt-1 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold">
              <span className="flex-1 text-slate-500 dark:text-slate-400">Total</span>
              <span className="tabular-nums text-red-700 dark:text-red-400">−{brl(-point.__despesas_total)}</span>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs font-bold">
          <span className="flex-1 text-slate-700 dark:text-slate-200">Fluxo líquido</span>
          <span className={`tabular-nums ${point.__fluxo >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
            {point.__fluxo >= 0 ? '+' : '−'}{brl(Math.abs(point.__fluxo))}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMode('breakdown')}
            className={`px-3 py-1 rounded-md transition-colors ${
              mode === 'breakdown'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm font-medium'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Detalhado
          </button>
          <button
            type="button"
            onClick={() => setMode('comparison')}
            className={`px-3 py-1 rounded-md transition-colors ${
              mode === 'comparison'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm font-medium'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Total
          </button>
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400">
          {mode === 'breakdown'
            ? 'Barras empilhadas: cada cor = uma origem/categoria'
            : 'Receita vs despesa total por ano'}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={380}>
        <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 8 }} stackOffset="sign">
          <CartesianGrid stroke="#e2e8f0" vertical={false} strokeDasharray="3 3" className="dark:stroke-slate-700" />
          <XAxis
            dataKey="idade"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={brlShort}
            width={56}
          />
          <ReferenceLine y={0} stroke="#94a3b8" />
          <Tooltip content={customTooltip} cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            iconType="square"
            formatter={(value: string) => <span className="text-slate-600 dark:text-slate-400">{value}</span>}
          />
          {mode === 'breakdown' &&
            assetKeys.map((a, i) => (
              <Bar
                key={`asset-${a.id}`}
                dataKey={`asset:${a.id}`}
                stackId="rec"
                fill={RECEITA_PALETTE[i % RECEITA_PALETTE.length]}
                name={a.label}
                isAnimationActive={false}
              />
            ))}
          {mode === 'breakdown' &&
            categoryKeys.map((c, i) => (
              <Bar
                key={`cat-${c.id}`}
                dataKey={`cat:${c.id}`}
                stackId="desp"
                fill={DESPESA_PALETTE[i % DESPESA_PALETTE.length]}
                name={c.label}
                isAnimationActive={false}
              />
            ))}
          {mode === 'comparison' && (
            <Bar
              dataKey="__receitas_total"
              fill="#10b981"
              radius={[3, 3, 0, 0]}
              name="Receitas"
              isAnimationActive={false}
            />
          )}
          {mode === 'comparison' && (
            <Bar
              dataKey="__despesas_total"
              fill="#ef4444"
              radius={[0, 0, 3, 3]}
              name="Despesas"
              isAnimationActive={false}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
