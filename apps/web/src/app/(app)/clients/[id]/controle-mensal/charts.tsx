'use client';

import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { brl, brlShort } from '@/lib/controle-mensal/format';

export const PALETTE = [
  '#2563eb', '#dc2626', '#059669', '#9333ea', '#f59e0b', '#0d9488',
  '#475569', '#ea580c', '#db2777', '#16a34a', '#7c3aed', '#0891b2',
  '#ca8a04', '#64748b', '#be123c', '#4f46e5',
];
export const cor = (i: number): string => PALETTE[i % PALETTE.length] ?? '#2563eb';

export interface Serie {
  label: string;
  cor: string;
  valores: number[];
}

function montaData(labels: string[], series: Serie[]): Array<Record<string, number | string>> {
  return labels.map((l, i) => {
    const row: Record<string, number | string> = { label: l };
    for (const s of series) row[s.label] = s.valores[i] ?? 0;
    return row;
  });
}

export function Donut({ labels, valores }: { labels: string[]; valores: number[] }) {
  const data = labels.map((l, i) => ({ name: l, value: Math.abs(valores[i] ?? 0) }));
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={68} outerRadius={108} paddingAngle={1}>
          {data.map((_, i) => (
            <Cell key={i} fill={cor(i)} stroke="#fff" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => {
            const v = Number(value);
            return `${brl(v)} (${((v / total) * 100).toFixed(1)}%)`;
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function Barras({
  labels, series, horizontal = false, height,
}: {
  labels: string[];
  series: Serie[];
  horizontal?: boolean;
  height?: number;
}) {
  const data = montaData(labels, series);
  const h = height ?? (horizontal ? Math.max(160, labels.length * 46) : 320);
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={!horizontal} horizontal={!horizontal ? true : false} />
        {horizontal ? (
          <>
            <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={brlShort} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
          </>
        ) : (
          <>
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={brlShort} width={56} axisLine={false} tickLine={false} />
          </>
        )}
        <Tooltip formatter={(value) => brl(Number(value))} cursor={{ fill: 'rgba(59,130,246,0.05)' }} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {series.map((s) => (
          <Bar key={s.label} dataKey={s.label} fill={s.cor} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LinhaMulti({ labels, series }: { labels: string[]; series: Serie[] }) {
  const data = montaData(labels, series);
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={brlShort} width={56} axisLine={false} tickLine={false} />
        <Tooltip formatter={(value) => brl(Number(value))} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {series.map((s) => (
          <Line key={s.label} type="monotone" dataKey={s.label} stroke={s.cor} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function MiniBars({ valores, color }: { valores: number[]; color: string }) {
  const data = valores.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={56}>
      <BarChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <Tooltip formatter={(value) => brl(Number(value))} cursor={{ fill: 'rgba(59,130,246,0.05)' }} />
        <Bar dataKey="v" fill={color} radius={[2, 2, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
