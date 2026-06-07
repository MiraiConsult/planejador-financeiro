'use client';

import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface RowSlim {
  idade: number;
  saldo_final: number;
  retorno: number;
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

export function InvestimentosChart({ rows }: { rows: RowSlim[] }) {
  const data = useMemo(() => {
    let cumRetorno = 0;
    return rows.map((r) => {
      cumRetorno += r.retorno;
      const saldo = Math.max(0, r.saldo_final);
      // a porção "rendimento" não pode ser maior que o saldo (se o cliente sacou, o
      // rendimento "evaporou" junto). Capamos no saldo atual.
      const rendimento = Math.min(saldo, Math.max(0, cumRetorno));
      const principal = saldo - rendimento;
      return {
        idade: r.idade,
        saldo,
        principal,
        rendimento,
        rendimento_pct: saldo > 0 ? (rendimento / saldo) * 100 : 0,
      };
    });
  }, [rows]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload as (typeof data)[number];
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-soft-lg p-3 min-w-[200px]">
        <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">Idade {label}</p>
        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-700 dark:text-slate-300">Saldo total</span>
            <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {brl(p.saldo)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-brand-500" />
              <span className="text-slate-600 dark:text-slate-400">Principal</span>
            </span>
            <span className="tabular-nums text-slate-700 dark:text-slate-300">
              {brl(p.principal)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-emerald-500" />
              <span className="text-slate-600 dark:text-slate-400">Rendimento acum.</span>
            </span>
            <span className="tabular-nums text-emerald-700 dark:text-emerald-400">
              {brl(p.rendimento)}{' '}
              <span className="text-[10px] text-slate-400">
                ({p.rendimento_pct.toFixed(0)}%)
              </span>
            </span>
          </div>
        </div>
      </div>
    );
  };

  const last = data[data.length - 1];
  const first = data[0];

  return (
    <div>
      {first && last && (
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 mb-3 text-sm">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-slate-400 mr-2">
              Inicial
            </span>
            <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-300">
              {brl(first.saldo)}
            </span>
          </div>
          <span className="text-slate-300 dark:text-slate-600">→</span>
          <div>
            <span className="text-[10px] uppercase tracking-widest text-slate-400 mr-2">
              Final aos {last.idade}
            </span>
            <span className="tabular-nums font-semibold text-brand-700 dark:text-brand-400">
              {brl(last.saldo)}
            </span>
          </div>
          {last.saldo > 0 && (
            <div>
              <span className="text-[10px] uppercase tracking-widest text-slate-400 mr-2">
                Rendimento total
              </span>
              <span className="tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                {brl(last.rendimento)}{' '}
                <span className="text-[11px] text-slate-400 font-normal">
                  ({last.rendimento_pct.toFixed(0)}% do saldo)
                </span>
              </span>
            </div>
          )}
        </div>
      )}

      <ResponsiveContainer width="100%" height={360}>
        <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 8 }}>
          <defs>
            <linearGradient id="invPrincipal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.4} />
            </linearGradient>
            <linearGradient id="invRendimento" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.85} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.35} />
            </linearGradient>
          </defs>
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
          <Tooltip content={customTooltip} cursor={{ stroke: '#cbd5e1', strokeDasharray: '3 3' }} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            iconType="square"
            formatter={(v: string) => (
              <span className="text-slate-600 dark:text-slate-400">{v}</span>
            )}
          />
          <Area
            type="monotone"
            dataKey="principal"
            stackId="inv"
            stroke="#2563eb"
            strokeWidth={1.5}
            fill="url(#invPrincipal)"
            name="Principal"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="rendimento"
            stackId="inv"
            stroke="#059669"
            strokeWidth={1.5}
            fill="url(#invRendimento)"
            name="Rendimento acumulado"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
