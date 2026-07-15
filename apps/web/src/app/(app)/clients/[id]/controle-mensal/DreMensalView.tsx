'use client';

import { useMemo } from 'react';
import * as Lucide from 'lucide-react';
import { Tag, Crown, TrendingDown, Wallet, Scale, PiggyBank } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { KpiCard } from '@/components/KpiCard';
import { brl } from '@/lib/controle-mensal/format';
import type { Lancamento } from '@/lib/controle-mensal/analytics';
import { dreMensal } from '@/lib/controle-mensal/analises';
import { buildTree, type Centro } from '@/lib/controle-mensal/centros';

function Icone({ nome, size = 13 }: { nome: string; size?: number }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Cmp = (Lucide as any)[nome] ?? Tag;
  return <Cmp size={size} />;
}

const valColor = (n: number) => (n < 0 ? 'text-red-600' : n > 0 ? 'text-emerald-600' : 'text-slate-400');

export function DreMensalView({ rows, centros }: { rows: Lancamento[]; centros: Centro[] }) {
  const raizes = useMemo(() => buildTree(centros.filter((c) => c.ativo)), [centros]);
  const dre = useMemo(() => dreMensal(rows, raizes), [rows, raizes]);

  if (dre.periodos.length === 0) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-slate-500 py-12 text-center">
            Nenhum lançamento no período selecionado.
          </p>
        </CardContent>
      </Card>
    );
  }

  const melhor = dre.idxMelhor != null ? dre.periodos[dre.idxMelhor] : null;
  const pior = dre.idxPior != null ? dre.periodos[dre.idxPior] : null;
  const colClass = (i: number) =>
    i === dre.idxMelhor ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : i === dre.idxPior ? 'bg-red-50/60 dark:bg-red-950/20' : '';

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Receita total" value={brl(dre.receitaTotal)} tone="positive" icon={Wallet} />
        <KpiCard label="Despesa total" value={brl(dre.despesaTotalGeral)} tone="negative" icon={TrendingDown} />
        <KpiCard label="Resultado total" value={brl(dre.resultadoTotal)} tone={dre.resultadoTotal < 0 ? 'negative' : 'positive'} icon={Scale} />
        <KpiCard label="Margem média" value={`${dre.margemMedia.toFixed(1)}%`} tone={dre.margemMedia < 0 ? 'negative' : 'positive'} icon={PiggyBank} />
      </div>

      {/* Melhor / pior mês */}
      {(melhor || pior) && (
        <div className="flex flex-wrap gap-3">
          {melhor && dre.idxMelhor != null && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/20 px-4 py-2.5">
              <Crown size={16} className="text-emerald-600 shrink-0" />
              <div>
                <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">Melhor mês</p>
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                  {melhor.label} · {brl(dre.resultado[dre.idxMelhor]!)}
                </p>
              </div>
            </div>
          )}
          {pior && dre.idxPior != null && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-900 bg-red-50/60 dark:bg-red-950/20 px-4 py-2.5">
              <TrendingDown size={16} className="text-red-600 shrink-0" />
              <div>
                <p className="text-[11px] font-medium text-red-700 dark:text-red-400">Pior mês</p>
                <p className="text-sm font-semibold text-red-900 dark:text-red-200">
                  {pior.label} · {brl(dre.resultado[dre.idxPior]!)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabela DRE */}
      <Card>
        <CardHeader>
          <CardTitle>DRE mensal (sintético)</CardTitle>
          <CardDescription>
            Receita, principais contas de despesa e resultado, mês a mês. Coluna verde = melhor mês; vermelha = pior mês.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm tabular-nums">
            <thead className="bg-slate-50/80 dark:bg-slate-800/60">
              <tr className="text-[10px] uppercase tracking-widest text-slate-500">
                <th className="text-left px-4 py-2.5 font-semibold sticky left-0 bg-slate-50/80 dark:bg-slate-800/60">
                  Conta
                </th>
                {dre.periodos.map((p, i) => (
                  <th key={p.key} className={`text-right px-3 py-2.5 font-semibold whitespace-nowrap ${colClass(i)}`}>
                    <span className="inline-flex items-center gap-1">
                      {i === dre.idxMelhor && <Crown size={11} className="text-emerald-600" />}
                      {i === dre.idxPior && <TrendingDown size={11} className="text-red-600" />}
                      {p.label}
                    </span>
                  </th>
                ))}
                <th className="text-right px-4 py-2.5 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {/* Receita bruta */}
              <tr>
                <td className="px-4 py-2 font-medium text-emerald-700 dark:text-emerald-400 sticky left-0 bg-white dark:bg-slate-900">
                  Receita bruta
                </td>
                {dre.receita.map((v, i) => (
                  <td key={i} className={`px-3 py-2 text-right text-emerald-700 dark:text-emerald-400 ${colClass(i)}`}>
                    {v ? brl(v) : '·'}
                  </td>
                ))}
                <td className="px-4 py-2 text-right font-semibold text-emerald-700 dark:text-emerald-400">
                  {brl(dre.receitaTotal)}
                </td>
              </tr>

              {/* Principais contas de despesa (centros raiz) */}
              {dre.contas.map((c) => (
                <tr key={c.centroId}>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-200 sticky left-0 bg-white dark:bg-slate-900">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="h-4 w-4 rounded flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${c.cor}22`, color: c.cor }}
                      >
                        <Icone nome={c.icone} size={10} />
                      </span>
                      (−) {c.nome}
                    </span>
                  </td>
                  {c.valores.map((v, i) => (
                    <td key={i} className={`px-3 py-2 text-right text-red-600 dark:text-red-400 ${colClass(i)}`}>
                      {v ? `−${brl(v)}` : '·'}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right font-semibold text-red-600 dark:text-red-400">
                    −{brl(c.total)}
                  </td>
                </tr>
              ))}

              {/* Resultado */}
              <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 font-bold">
                <td className="px-4 py-3 text-slate-900 dark:text-slate-50 sticky left-0 bg-slate-50/60 dark:bg-slate-800/40">
                  (=) Resultado
                </td>
                {dre.resultado.map((v, i) => (
                  <td key={i} className={`px-3 py-3 text-right ${valColor(v)} ${colClass(i)}`}>{brl(v)}</td>
                ))}
                <td className={`px-4 py-3 text-right ${valColor(dre.resultadoTotal)}`}>{brl(dre.resultadoTotal)}</td>
              </tr>

              {/* Margem */}
              <tr>
                <td className="px-4 py-2 text-[11px] text-slate-500 sticky left-0 bg-white dark:bg-slate-900">
                  Margem (% da receita)
                </td>
                {dre.margem.map((v, i) => (
                  <td key={i} className={`px-3 py-2 text-right text-[11px] ${valColor(v)} ${colClass(i)}`}>
                    {v.toFixed(0)}%
                  </td>
                ))}
                <td className={`px-4 py-2 text-right text-[11px] ${valColor(dre.margemMedia)}`}>
                  {dre.margemMedia.toFixed(0)}%
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
