'use client';

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface RowSlim {
  idade: number;
  fluxo_liquido: number;
}

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const brlShort = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(0)}k`;
  return String(n);
};

interface TooltipPayload {
  value: number;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: number }) {
  if (!active || !payload?.length) return null;
  const v = payload[0]!.value;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 backdrop-blur-sm shadow-soft-lg p-3 min-w-[160px]">
      <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Idade {label}</p>
      <p
        className={`text-sm font-semibold tabular-nums ${v < 0 ? 'text-red-600' : 'text-emerald-600'}`}
      >
        {brl(v)}
      </p>
      <p className="text-[10px] text-slate-400 mt-1">Fluxo líquido do ano</p>
    </div>
  );
}

export function FluxoChart({ rows }: { rows: RowSlim[] }) {
  return (
    <ResponsiveContainer width="100%" height={420}>
      <BarChart data={rows} margin={{ top: 10, right: 16, left: 0, bottom: 8 }}>
        <defs>
          <linearGradient id="barPositive" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.6} />
          </linearGradient>
          <linearGradient id="barNegative" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#e2e8f0" vertical={false} strokeDasharray="3 3" />
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
          tickFormatter={(v: number) => brlShort(v)}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }} />
        <Bar dataKey="fluxo_liquido" radius={[4, 4, 0, 0]}>
          {rows.map((r) => (
            <Cell key={r.idade} fill={r.fluxo_liquido >= 0 ? 'url(#barPositive)' : 'url(#barNegative)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
