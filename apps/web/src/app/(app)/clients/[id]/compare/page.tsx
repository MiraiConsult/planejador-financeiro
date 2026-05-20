import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Crown, TrendingUp, Sigma, AlertTriangle, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CompareChart } from '@/components/charts/CompareChart';
import { loadAllScenarios } from '@/lib/loadAllScenarios';

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const brlCompact = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}R$ ${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}R$ ${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}R$ ${(abs / 1e3).toFixed(0)}k`;
  return brl(n);
};

const cores: Record<string, { line: string; bg: string; text: string; ring: string; label: string }> = {
  base: { line: '#3b82f6', bg: 'bg-brand-50', text: 'text-brand-700', ring: 'ring-brand-200', label: 'Base' },
  otimista: { line: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', label: 'Otimista' },
  pessimista: { line: '#ef4444', bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-200', label: 'Pessimista' },
  personalizado: { line: '#a855f7', bg: 'bg-purple-50', text: 'text-purple-700', ring: 'ring-purple-200', label: 'Personalizado' },
};

type Params = Promise<{ id: string }>;

export default async function ComparePage({ params }: { params: Params }) {
  const { id } = await params;
  const runs = await loadAllScenarios(id);
  if (!runs) notFound();

  // ordena base → otimista → pessimista → resto
  const order: Record<string, number> = { base: 0, otimista: 1, pessimista: 2, personalizado: 3 };
  runs.sort((a, b) => (order[a.scenario.tipo] ?? 4) - (order[b.scenario.tipo] ?? 4));

  const seriesParaGrafico = runs.map((r) => ({
    nome: r.scenario.nome,
    tipo: r.scenario.tipo,
    color: cores[r.scenario.tipo]?.line ?? '#64748b',
    rows: r.result.rows.map((row) => ({ idade: row.idade, patrimonio_total: row.patrimonio_total })),
  }));

  // ranking por patrimônio final
  const ranked = [...runs].sort((a, b) => b.result.summary.patrimonio_final - a.result.summary.patrimonio_final);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <Link href={`/clients/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft size={14} />
            Voltar para o cliente
          </Button>
        </Link>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600">
          Análise comparativa
        </p>
        <h1 className="text-display-sm font-bold tracking-tight text-slate-900 mt-1">
          Comparar cenários
        </h1>
        <p className="text-sm text-slate-500 mt-1 leading-relaxed max-w-2xl">
          {runs.length} cenários simulados sobre os mesmos ativos, despesas e eventos. Cenários
          otimista/pessimista aplicam <strong>retorno ± volatilidade</strong> da carteira.
        </p>
      </div>

      {/* Cards por cenário */}
      <section className="grid lg:grid-cols-3 gap-4">
        {runs.map((r) => {
          const c = cores[r.scenario.tipo] ?? cores.base!;
          const s = r.result.summary;
          return (
            <Card key={r.scenario.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${c.bg} ${c.text} ring-1 ring-inset ${c.ring}`}>
                      {c.label}
                    </span>
                  </div>
                  <span className="h-2 w-2 rounded-full" style={{ background: c.line }} />
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400">Patrimônio final</p>
                  <p
                    className={`text-2xl font-bold tabular-nums tracking-tight mt-1 ${
                      s.patrimonio_final < 0 ? 'text-red-600' : 'text-slate-900'
                    }`}
                  >
                    {brlCompact(s.patrimonio_final)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Pico" value={brlCompact(s.patrimonio_pico)} hint={`aos ${s.patrimonio_pico_idade}`} />
                  <Stat
                    label="Break-even"
                    value={s.idade_break_even ? `${s.idade_break_even}a` : 'nunca'}
                    danger={!!s.idade_break_even}
                  />
                  <Stat label="NPV" value={brlCompact(s.npv_fluxo_liquido)} danger={s.npv_fluxo_liquido < 0} />
                  <Stat
                    label="Drawdown"
                    value={`${(s.drawdown_maximo * 100).toFixed(0)}%`}
                    danger={s.drawdown_maximo > 0.5}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* Gráfico sobreposto */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>Patrimônio total ao longo do tempo</CardTitle>
              <CardDescription>Cada linha = um cenário</CardDescription>
            </div>
            <div className="flex gap-3 text-xs">
              {runs.map((r) => {
                const c = cores[r.scenario.tipo] ?? cores.base!;
                return (
                  <span key={r.scenario.id} className="flex items-center gap-1.5 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c.line }} />
                    {r.scenario.nome}
                  </span>
                );
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <CompareChart series={seriesParaGrafico} />
        </CardContent>
      </Card>

      {/* Ranking */}
      <Card>
        <CardHeader className="border-b border-slate-100/70">
          <CardTitle>Ranking por patrimônio final</CardTitle>
          <CardDescription>Do melhor para o pior desfecho</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm tabular-nums">
            <thead className="bg-slate-50/70">
              <tr className="text-[10px] uppercase tracking-widest text-slate-500">
                <th className="text-left px-5 py-3 font-semibold">#</th>
                <th className="text-left px-5 py-3 font-semibold">Cenário</th>
                <th className="text-right px-5 py-3 font-semibold">Patrimônio final</th>
                <th className="text-right px-5 py-3 font-semibold">Pico</th>
                <th className="text-right px-5 py-3 font-semibold">Break-even</th>
                <th className="text-right px-5 py-3 font-semibold">NPV</th>
                <th className="text-right px-5 py-3 font-semibold">Drawdown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ranked.map((r, idx) => {
                const c = cores[r.scenario.tipo] ?? cores.base!;
                const s = r.result.summary;
                return (
                  <tr key={r.scenario.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 font-semibold text-slate-500">
                      {idx === 0 ? <Trophy size={14} className="text-amber-500 inline" /> : idx + 1}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded ${c.bg} ${c.text}`}>
                        {c.label}
                      </span>
                    </td>
                    <td
                      className={`px-5 py-3 text-right font-bold ${
                        s.patrimonio_final < 0 ? 'text-red-600' : 'text-slate-900'
                      }`}
                    >
                      {brl(s.patrimonio_final)}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600">{brl(s.patrimonio_pico)}</td>
                    <td className={`px-5 py-3 text-right ${s.idade_break_even ? 'text-red-600' : 'text-slate-600'}`}>
                      {s.idade_break_even ? `${s.idade_break_even} anos` : 'nunca'}
                    </td>
                    <td className={`px-5 py-3 text-right ${s.npv_fluxo_liquido < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                      {brl(s.npv_fluxo_liquido)}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600">
                      {(s.drawdown_maximo * 100).toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, hint, danger }: { label: string; value: string; hint?: string; danger?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`text-sm font-bold tabular-nums tracking-tight mt-0.5 ${danger ? 'text-red-600' : 'text-slate-900'}`}>
        {value}
      </p>
      {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}
