'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface ScenarioSeries {
  nome: string;
  tipo: string;
  color: string;
  rows: { idade: number; patrimonio_total: number }[];
}

interface Props {
  series: ScenarioSeries[];
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

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 backdrop-blur-sm shadow-soft-lg p-3 min-w-[200px]">
      <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">Idade {label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="text-xs font-semibold tabular-nums text-slate-900">{brl(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function CompareChart({ series }: Props) {
  // Merge: idades comuns entre todas as séries → { idade, [serieX]: valor, ... }
  const idades = Array.from(
    new Set(series.flatMap((s) => s.rows.map((r) => r.idade))),
  ).sort((a, b) => a - b);

  const data = idades.map((idade) => {
    const row: Record<string, number> = { idade };
    for (const s of series) {
      const r = s.rows.find((x) => x.idade === idade);
      if (r) row[s.nome] = r.patrimonio_total;
    }
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={360}>
      <LineChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
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
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }}
        />
        {series.map((s) => (
          <Line
            key={s.nome}
            type="monotone"
            dataKey={s.nome}
            stroke={s.color}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: 'white' }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
