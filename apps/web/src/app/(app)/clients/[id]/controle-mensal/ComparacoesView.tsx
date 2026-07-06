'use client';

import { useMemo, useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { brl } from '@/lib/controle-mensal/format';
import type { Lancamento } from '@/lib/controle-mensal/analytics';
import { comparar, fluxoDeCaixa, type Eixo, type Dimensao, type Escopo } from '@/lib/controle-mensal/analises';
import { Barras, cor } from './charts';

const EIXOS: { id: Eixo; label: string }[] = [
  { id: 'mes', label: 'Meses' },
  { id: 'ano', label: 'Anos' },
];
const DIMS: { id: Dimensao; label: string }[] = [
  { id: 'tipo', label: 'Tipo' },
  { id: 'centro', label: 'Centro de custo' },
  { id: 'rubrica', label: 'Rubrica' },
];
const ESCOPOS: { id: Escopo; label: string }[] = [
  { id: 'despesas', label: 'Despesas' },
  { id: 'pessoal', label: 'Pessoal' },
  { id: 'mirai', label: 'Mirai' },
  { id: 'viagem', label: 'Viagem' },
  { id: 'receita', label: 'Receita' },
  { id: 'tudo', label: 'Tudo' },
];

function Seg<T extends string>({ opts, value, onChange }: { opts: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-0.5 text-xs">
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            value === o.id
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm font-medium'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

type Modo = 'fluxo' | 'dimensao';

export function ComparacoesView({ rows }: { rows: Lancamento[] }) {
  const [modo, setModo] = useState<Modo>('fluxo');
  const [eixo, setEixo] = useState<Eixo>('mes');
  const [dim, setDim] = useState<Dimensao>('centro');
  const [escopo, setEscopo] = useState<Escopo>('despesas');

  const m = useMemo(() => comparar(rows, eixo, dim, escopo), [rows, eixo, dim, escopo]);
  const fc = useMemo(() => fluxoDeCaixa(rows, eixo), [rows, eixo]);

  const topLinhas = m.linhas.slice(0, 6);
  const chartSeries = topLinhas.map((l, i) => ({ label: l.nome, cor: cor(i), valores: l.valores }));

  if (modo === 'fluxo') {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <CardTitle>Fluxo de caixa</CardTitle>
                <CardDescription>Entradas, saídas e saldo do exercício por período</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Seg
                  opts={[{ id: 'fluxo', label: 'Fluxo de caixa' }, { id: 'dimensao', label: 'Por dimensão' }]}
                  value={modo}
                  onChange={(v) => setModo(v as Modo)}
                />
                <Seg opts={EIXOS} value={eixo} onChange={setEixo} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-800/60">
                <tr className="text-[10px] uppercase tracking-widest text-slate-500">
                  <th className="text-left px-4 py-2.5 font-semibold sticky left-0 bg-slate-50/80 dark:bg-slate-800/60">
                    Demonstrativo
                  </th>
                  {fc.periodos.map((p) => (
                    <th key={p.key} className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">{p.label}</th>
                  ))}
                  <th className="text-right px-4 py-2.5 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {/* Entradas */}
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-2.5 font-medium text-emerald-700 dark:text-emerald-400 sticky left-0 bg-white dark:bg-slate-900">
                    Entradas
                  </td>
                  {fc.entradas.map((v, i) => (
                    <td key={i} className="px-3 py-2.5 text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                      {v ? brl(v) : '·'}
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                    {brl(fc.totalEntradas)}
                  </td>
                </tr>
                {/* Saídas */}
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-2.5 font-medium text-red-600 dark:text-red-400 sticky left-0 bg-white dark:bg-slate-900">
                    Saídas
                  </td>
                  {fc.saidas.map((v, i) => (
                    <td key={i} className="px-3 py-2.5 text-right tabular-nums text-red-600 dark:text-red-400">
                      {v ? `−${brl(v)}` : '·'}
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-red-600 dark:text-red-400">
                    −{brl(fc.totalSaidas)}
                  </td>
                </tr>
                {/* Saldo do Exercício */}
                <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40">
                  <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-50 sticky left-0 bg-slate-50/60 dark:bg-slate-800/40">
                    Saldo do exercício
                  </td>
                  {fc.saldo.map((v, i) => (
                    <td
                      key={i}
                      className={`px-3 py-3 text-right tabular-nums font-semibold ${
                        v < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-50'
                      }`}
                    >
                      {brl(v)}
                    </td>
                  ))}
                  <td
                    className={`px-4 py-3 text-right tabular-nums font-bold ${
                      fc.totalSaldo < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-50'
                    }`}
                  >
                    {brl(fc.totalSaldo)}
                  </td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle>Comparações</CardTitle>
              <CardDescription>Compare períodos por centro de custo ou rubrica</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Seg
                opts={[{ id: 'fluxo', label: 'Fluxo de caixa' }, { id: 'dimensao', label: 'Por dimensão' }]}
                value={modo}
                onChange={(v) => setModo(v as Modo)}
              />
              <Seg opts={EIXOS} value={eixo} onChange={setEixo} />
              <Seg opts={DIMS} value={dim} onChange={setDim} />
              <select
                value={escopo}
                onChange={(e) => setEscopo(e.target.value as Escopo)}
                className="h-8 px-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100"
              >
                {ESCOPOS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-800/60">
              <tr className="text-[10px] uppercase tracking-widest text-slate-500">
                <th className="text-left px-4 py-2.5 font-semibold sticky left-0 bg-slate-50/80 dark:bg-slate-800/60">
                  {dim === 'tipo' ? 'Tipo' : dim === 'centro' ? 'Centro de custo' : 'Rubrica'}
                </th>
                {m.periodos.map((p) => (
                  <th key={p.key} className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">{p.label}</th>
                ))}
                <th className="text-right px-4 py-2.5 font-semibold">Total</th>
                <th className="text-right px-3 py-2.5 font-semibold">Δ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {m.linhas.map((l) => (
                <tr key={l.nome} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-2 text-slate-800 dark:text-slate-100 sticky left-0 bg-white dark:bg-slate-900 max-w-[200px] truncate">{l.nome}</td>
                  {l.valores.map((v, i) => {
                    const op = m.max_celula > 0 ? (v / m.max_celula) * 0.5 : 0;
                    return (
                      <td key={i} className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">
                        <span className="inline-block px-1.5 py-0.5 rounded" style={{ backgroundColor: v > 0 ? `rgba(37,99,235,${op})` : undefined }}>
                          {v ? brl(v) : '·'}
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-4 py-2 text-right tabular-nums font-semibold text-slate-900 dark:text-slate-50">{brl(l.total)}</td>
                  <td className="px-3 py-2 text-right">
                    {l.variacao_pct == null ? (
                      <span className="text-slate-300">·</span>
                    ) : (
                      <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${l.variacao_pct > 0 ? 'text-red-600' : l.variacao_pct < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {l.variacao_pct > 0 ? <ArrowUp size={11} /> : l.variacao_pct < 0 ? <ArrowDown size={11} /> : null}
                        {Math.abs(l.variacao_pct).toFixed(0)}%
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 dark:border-slate-700 font-semibold">
                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-200 sticky left-0 bg-white dark:bg-slate-900">Total</td>
                {m.totais.map((t, i) => (
                  <td key={i} className="px-3 py-2.5 text-right tabular-nums text-slate-900 dark:text-slate-50">{brl(t)}</td>
                ))}
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-900 dark:text-slate-50">{brl(m.total_geral)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {m.periodos.length > 1 && topLinhas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Evolução — top {topLinhas.length}</CardTitle>
            <CardDescription>
              {dim === 'tipo' ? 'Tipos' : dim === 'centro' ? 'Centros de custo' : 'Rubricas'} com maior total ao longo dos períodos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Barras labels={m.periodos.map((p) => p.label)} series={chartSeries} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
