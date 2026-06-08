'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { brl, brlShort } from '@/lib/controle-mensal/format';
import type { CentroAggregate } from '@/lib/controle-mensal/analytics';
import type { CentroNode } from '@/lib/controle-mensal/centros';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const valColor = (n: number) =>
  n < 0 ? 'text-red-600' : n > 0 ? 'text-emerald-600' : 'text-slate-400';

interface Props {
  centro: CentroNode;
  agg: CentroAggregate;
}

/**
 * Demonstrativo de um centro com receita própria:
 * Receitas − Despesas = Líquido, mês a mês.
 * Substitui a antiga MiraiView específica — agora qualquer centro
 * marcado como `tem_demonstrativo` ganha esse layout.
 */
export function DemonstrativoCentro({ centro, agg }: Props) {
  const { serieMensal, totalReceitas, totalDespesas, liquido } = agg;
  const margem = totalReceitas > 0 ? (liquido / totalReceitas) * 100 : 0;

  const chartData = serieMensal.labels.map((label, i) => ({
    label,
    receitas: serieMensal.receitas[i] ?? 0,
    despesas: -(serieMensal.despesas[i] ?? 0), // negativo pra empilhar abaixo do zero
    liquido: serieMensal.liquido[i] ?? 0,
  }));

  return (
    <div className="space-y-4">
      {/* KPIs do centro */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Receitas (total)" value={brl(totalReceitas)} tone="positive" />
        <Kpi label="Despesas (total)" value={brl(totalDespesas)} tone="negative" />
        <Kpi label="Líquido (total)" value={brl(liquido)} tone={liquido < 0 ? 'negative' : 'positive'} />
        <Kpi
          label="Margem líquida"
          value={`${margem.toFixed(1)}%`}
          tone={margem < 0 ? 'negative' : 'positive'}
        />
      </div>

      {/* Gráfico mensal */}
      <Card>
        <CardHeader>
          <CardTitle>Receita × Despesa × Líquido — mês a mês</CardTitle>
          <CardDescription>
            Demonstrativo do centro <strong>{centro.nome}</strong>. Barras verdes = receita; vermelhas = despesa (empilhadas abaixo do zero pra leitura). Linha azul = líquido (rec − desp).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={brlShort} width={56} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value: number, name) => {
                  const map: Record<string, string> = { receitas: 'Receitas', despesas: 'Despesas', liquido: 'Líquido' };
                  return [brl(Math.abs(value)), map[name as string] ?? name];
                }}
              />
              <Bar dataKey="receitas" stackId="x" fill="#059669" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="despesas" stackId="x" fill="#dc2626" radius={[0, 0, 3, 3]} isAnimationActive={false} />
              <Line type="monotone" dataKey="liquido" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4 }} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabela mensal */}
      <Card>
        <CardHeader>
          <CardTitle>Tabela mensal</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-slate-500">
                <th className="text-left py-2 pr-3 font-semibold" />
                {serieMensal.labels.map((l) => (
                  <th key={l} className="text-right py-2 px-3 font-semibold whitespace-nowrap">{l}</th>
                ))}
                <th className="text-right py-2 px-3 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <Linha label="Receitas" valores={serieMensal.receitas} total={totalReceitas} positive />
              <Linha label="(−) Despesas" valores={serieMensal.despesas.map((v) => -v)} total={-totalDespesas} negative />
              <tr className="font-bold bg-slate-50/60 dark:bg-slate-800/40">
                <td className="py-2 pr-3 text-slate-700 dark:text-slate-200">= Líquido</td>
                {serieMensal.liquido.map((v, i) => (
                  <td key={i} className={`py-2 px-3 text-right ${valColor(v)}`}>{brl(v)}</td>
                ))}
                <td className={`py-2 px-3 text-right ${valColor(liquido)}`}>{brl(liquido)}</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function Linha({
  label, valores, total, positive, negative,
}: {
  label: string; valores: number[]; total: number; positive?: boolean; negative?: boolean;
}) {
  const color = positive ? 'text-emerald-600' : negative ? 'text-red-600' : 'text-slate-700';
  return (
    <tr>
      <td className="py-2 pr-3 text-slate-600 dark:text-slate-300">{label}</td>
      {valores.map((v, i) => (
        <td key={i} className={`py-2 px-3 text-right ${color}`}>{brl(v)}</td>
      ))}
      <td className={`py-2 px-3 text-right font-semibold ${color}`}>{brl(total)}</td>
    </tr>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'positive' | 'negative' }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 shadow-soft dark:shadow-none">
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">{label}</p>
      <p
        className={`mt-1 text-xl font-bold tabular-nums ${
          tone === 'positive' ? 'text-emerald-600' : tone === 'negative' ? 'text-red-600' : 'text-slate-900 dark:text-slate-50'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
