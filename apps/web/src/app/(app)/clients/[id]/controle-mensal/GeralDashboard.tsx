'use client';

import { Wallet, TrendingDown, Scale, PiggyBank, Lock, CalendarRange, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { KpiCard } from '@/components/KpiCard';
import { brl, fmtData } from '@/lib/controle-mensal/format';
import type { Indicadores } from '@/lib/controle-mensal/analises';
import { Barras, Donut, cor } from './charts';

const val = (n: number) => (n < 0 ? 'text-red-600' : n > 0 ? 'text-emerald-600' : 'text-slate-400');
const pct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;

export function GeralDashboard({ ind }: { ind: Indicadores }) {
  const labels = ind.meses.map((m) => m.label);
  const custoTotalMensal = ind.custo_fixo_mensal + ind.custo_variavel_mensal || 1;
  const pctFixo = Math.round((ind.custo_fixo_mensal / custoTotalMensal) * 100);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard label="Receita (período)" value={brl(ind.receita_total)} tone="positive" icon={Wallet} />
        <KpiCard label="Despesa de vida" value={brl(ind.despesa_total)} tone="negative" icon={TrendingDown} />
        <KpiCard label="Resultado" value={brl(ind.resultado_total)} tone={ind.resultado_total < 0 ? 'negative' : 'positive'} icon={Scale} />
        <KpiCard label="Taxa de poupança" value={`${ind.taxa_poupanca_media.toFixed(1)}%`} tone={ind.taxa_poupanca_media < 0 ? 'negative' : 'positive'} icon={PiggyBank} />
        <KpiCard label="Custo fixo / mês" value={brl(ind.custo_fixo_mensal)} tone="default" icon={Lock} />
        <KpiCard label="Run-rate anual" value={brl(ind.run_rate_anual)} tone={ind.run_rate_anual < 0 ? 'negative' : 'positive'} icon={CalendarRange} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Receita × Despesa por mês</CardTitle>
            <CardDescription>Despesa de vida (pessoal + viagem). Mirai fica à parte.</CardDescription>
          </CardHeader>
          <CardContent>
            <Barras
              labels={labels}
              series={[
                { label: 'Receita', cor: '#059669', valores: ind.meses.map((m) => m.receita) },
                { label: 'Despesa', cor: '#dc2626', valores: ind.meses.map((m) => m.despesa) },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resultado e poupança por mês</CardTitle>
            <CardDescription>Sobra/déficit do mês e % da receita poupada</CardDescription>
          </CardHeader>
          <CardContent>
            <Barras
              labels={labels}
              series={[{ label: 'Resultado', cor: '#2563eb', valores: ind.meses.map((m) => m.resultado) }]}
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
              {ind.meses.map((m) => (
                <div key={m.competencia} className="rounded-lg bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1.5">
                  <p className="text-[10px] text-slate-500">{m.label}</p>
                  <p className={`text-sm font-semibold tabular-nums ${val(m.taxa_poupanca)}`}>{m.taxa_poupanca.toFixed(0)}%</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Fixo x variável */}
        <Card>
          <CardHeader>
            <CardTitle>Custo fixo × variável</CardTitle>
            <CardDescription>Média mensal estimada</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <p className="text-[11px] text-slate-500 flex items-center gap-1"><Lock size={11} /> Fixo</p>
                <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-50">{brl(ind.custo_fixo_mensal)}</p>
              </div>
              <div className="flex-1">
                <p className="text-[11px] text-slate-500">Variável</p>
                <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-50">{brl(ind.custo_variavel_mensal)}</p>
              </div>
            </div>
            <div className="h-3 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex">
              <div className="bg-brand-500" style={{ width: `${pctFixo}%` }} />
              <div className="bg-amber-400" style={{ width: `${100 - pctFixo}%` }} />
            </div>
            <p className="text-[11px] text-slate-500">{pctFixo}% do seu custo mensal é fixo (recorrente e estável).</p>
          </CardContent>
        </Card>

        {/* Por origem */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Gasto por origem</CardTitle>
            <CardDescription>Onde o dinheiro saiu (PIX, Cartão, Débito…)</CardDescription>
          </CardHeader>
          <CardContent>
            <Donut labels={ind.por_origem.map((o) => o.origem)} valores={ind.por_origem.map((o) => o.total)} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Maiores gastos */}
        <Card>
          <CardHeader>
            <CardTitle>Maiores gastos</CardTitle>
            <CardDescription>Top 10 lançamentos individuais</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {ind.maiores.map((l, i) => (
                <li key={l.id ?? i} className="flex items-center justify-between gap-3 px-4 py-2">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-800 dark:text-slate-100 truncate">{l.descricao}</p>
                    <p className="text-[11px] text-slate-500">{fmtData(l.data)} · {l.categoria ?? '—'}</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-red-600 shrink-0">{brl(l.valor)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Movers */}
        <Card>
          <CardHeader>
            <CardTitle>Maiores variações</CardTitle>
            <CardDescription>Rubricas que mais mudaram no último mês</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {ind.movers.length === 0 ? (
              <p className="text-sm text-slate-500 px-4 py-6">Precisa de pelo menos 2 meses pra comparar.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {ind.movers.map((m) => {
                  const subiu = m.delta > 0;
                  return (
                    <li key={m.nome} className="flex items-center justify-between gap-3 px-4 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {subiu ? <ArrowUp size={14} className="text-red-500 shrink-0" /> : <ArrowDown size={14} className="text-emerald-500 shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-sm text-slate-800 dark:text-slate-100 truncate">{m.nome}</p>
                          <p className="text-[11px] text-slate-500">{brl(m.de)} → {brl(m.para)}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-semibold tabular-nums shrink-0 ${subiu ? 'text-red-600' : 'text-emerald-600'}`}>
                        {subiu ? '+' : ''}{brl(m.delta)}
                        {m.delta_pct != null && <span className="text-[10px] font-normal text-slate-400 ml-1">{pct(m.delta_pct)}</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pareto */}
      <Card>
        <CardHeader>
          <CardTitle>Concentração de gastos (Pareto)</CardTitle>
          <CardDescription>Rubricas ordenadas — onde mora a maior parte do gasto</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {ind.pareto.slice(0, 12).map((p, i) => (
              <div key={p.nome} className="flex items-center gap-3">
                <span className="w-40 shrink-0 text-xs text-slate-600 dark:text-slate-300 truncate">{p.nome}</span>
                <div className="flex-1 h-4 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full rounded" style={{ width: `${p.pct}%`, backgroundColor: cor(i) }} />
                </div>
                <span className="w-24 text-right text-xs tabular-nums text-slate-700 dark:text-slate-200">{brl(p.total)}</span>
                <span className="w-12 text-right text-[11px] tabular-nums text-slate-400">{p.pct_acum.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
