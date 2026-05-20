'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface RowSlim {
  idade: number;
  ano_calendario: number;
  patrimonio_total: number;
  saldo_final: number;
}

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const brlShort = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(0)}k`;
  return String(n);
};

interface TooltipPayload {
  value: number;
  dataKey: string;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 backdrop-blur-sm shadow-soft-lg p-3 min-w-[180px]">
      <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">Idade {label}</p>
      {payload.map((p) => {
        const color = p.dataKey === 'patrimonio_total' ? '#3b82f6' : '#10b981';
        const label = p.dataKey === 'patrimonio_total' ? 'Patrimônio total' : 'Saldo financeiro';
        return (
          <div key={p.dataKey} className="flex items-center justify-between gap-4 py-0.5">
            <span className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="h-2 w-2 rounded-full" style={{ background: color }} />
              {label}
            </span>
            <span className="text-xs font-semibold tabular-nums text-slate-900">{brl(p.value)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function PatrimonioChart({ rows }: { rows: RowSlim[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={rows} margin={{ top: 10, right: 16, left: 0, bottom: 8 }}>
        <defs>
          <linearGradient id="fillPatrimonio" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fillSaldo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
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
          width={56}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }} />
        <Area
          type="monotone"
          dataKey="patrimonio_total"
          stroke="#3b82f6"
          strokeWidth={2.5}
          fill="url(#fillPatrimonio)"
          activeDot={{ r: 5, strokeWidth: 2, stroke: 'white' }}
        />
        <Area
          type="monotone"
          dataKey="saldo_final"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#fillSaldo)"
          activeDot={{ r: 4, strokeWidth: 2, stroke: 'white' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
