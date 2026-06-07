'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { brl } from '@/lib/controle-mensal/format';
import type {
  PessoalData, MiraiData, ViagensData, ReceitasData, Lancamento,
} from '@/lib/controle-mensal/analytics';
import { Donut, Barras, LinhaMulti, MiniBars, cor } from './charts';
import { LancamentosTable } from './LancamentosTable';
import type { Sugestoes } from './LancamentoForm';
import { GeralDashboard } from './GeralDashboard';
import { ComparacoesView } from './ComparacoesView';
import type { Indicadores } from '@/lib/controle-mensal/analises';

const TABS = [
  { id: 'geral', label: 'Visão geral' },
  { id: 'comparacoes', label: 'Comparações' },
  { id: 'lancamentos', label: 'Lançamentos' },
  { id: 'pessoal', label: 'Pessoal' },
  { id: 'mirai', label: 'Mirai Consult' },
  { id: 'viagens', label: 'Viagens' },
  { id: 'receitas', label: 'Receitas' },
] as const;
type TabId = (typeof TABS)[number]['id'];

interface Props {
  rows: Lancamento[];
  clientId: string;
  sugestoes: Sugestoes;
  indicadores: Indicadores;
  pessoal: PessoalData;
  mirai: MiraiData;
  viagens: ViagensData;
  receitas: ReceitasData;
}

const val = (n: number) =>
  n < 0 ? 'text-red-600' : n > 0 ? 'text-emerald-600' : 'text-slate-400';

export function ControleMensalViews({
  rows, clientId, sugestoes, indicadores, pessoal, mirai, viagens, receitas,
}: Props) {
  const [tab, setTab] = useState<TabId>('geral');
  return (
    <div className="space-y-4">
      <div className="inline-flex flex-wrap rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-0.5 text-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-1.5 rounded-md transition-colors ${
              tab === t.id
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm font-medium'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'geral' && <GeralDashboard ind={indicadores} />}
      {tab === 'comparacoes' && <ComparacoesView rows={rows} />}
      {tab === 'lancamentos' && (
        <LancamentosTable rows={rows} clientId={clientId} sugestoes={sugestoes} titulo="Todos os lançamentos" />
      )}
      {tab === 'pessoal' && <PessoalView pessoal={pessoal} clientId={clientId} sugestoes={sugestoes} />}
      {tab === 'mirai' && <MiraiView mirai={mirai} clientId={clientId} sugestoes={sugestoes} />}
      {tab === 'viagens' && <ViagensView viagens={viagens} clientId={clientId} sugestoes={sugestoes} />}
      {tab === 'receitas' && <ReceitasView receitas={receitas} clientId={clientId} sugestoes={sugestoes} />}
    </div>
  );
}

function PessoalView({ pessoal, clientId, sugestoes }: { pessoal: PessoalData; clientId: string; sugestoes: Sugestoes }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Gastos por categoria</CardTitle>
            <CardDescription>Sem Mirai e sem Viagens</CardDescription>
          </CardHeader>
          <CardContent>
            <Donut
              labels={pessoal.por_categoria.map((c) => c.categoria)}
              valores={pessoal.por_categoria.map((c) => c.total)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Receita × Gastos pessoais</CardTitle>
            <CardDescription>Comparativo mês a mês</CardDescription>
          </CardHeader>
          <CardContent>
            <Barras
              labels={pessoal.comparativo.map((m) => m.label)}
              series={[
                { label: 'Receita', cor: '#059669', valores: pessoal.comparativo.map((m) => m.receita) },
                { label: 'Gastos', cor: '#2563eb', valores: pessoal.comparativo.map((m) => m.gastos) },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Categorias</CardTitle>
          <CardDescription>Total e evolução mensal por categoria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pessoal.por_categoria.map((c, i) => (
              <div key={c.categoria} className="rounded-xl border border-slate-200/70 dark:border-slate-700/70 p-3">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{c.categoria}</p>
                <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-50">{brl(c.total)}</p>
                <MiniBars valores={pessoal.por_categoria_mensal[c.categoria] ?? []} color={cor(i)} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <LancamentosTable rows={pessoal.lancamentos} clientId={clientId} sugestoes={sugestoes} titulo="Lançamentos pessoais" mostrarCentro={false} />
    </div>
  );
}

function MiraiView({ mirai, clientId, sugestoes }: { mirai: MiraiData; clientId: string; sugestoes: Sugestoes }) {
  const linhas: Array<{
    rot: string;
    k: Exclude<keyof MiraiData['demonstrativo'][number], 'label'>;
    neg?: boolean;
    destaque?: boolean;
  }> = [
    { rot: 'Receita Nexlex (bruta)', k: 'receita_nexlex' },
    { rot: '(−) Sistemas SaaS', k: 'saas', neg: true },
    { rot: '(−) Colaboradores', k: 'colaboradores', neg: true },
    { rot: '(−) Outros', k: 'outros', neg: true },
    { rot: '= Salário líquido', k: 'salario_liquido', destaque: true },
  ];
  const topSistemas = mirai.sistemas.slice(0, 7);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Demonstrativo mensal</CardTitle>
          <CardDescription>
            Receita Nexlex (−) SaaS (−) Colaboradores (−) Outros = Salário líquido. A Receita Nexlex é
            reconstruída a partir do salário líquido informado + despesas.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-slate-500">
                <th className="text-left py-2 pr-3 font-semibold" />
                {mirai.demonstrativo.map((d) => (
                  <th key={d.label} className="text-right py-2 px-3 font-semibold">{d.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {linhas.map((ln) => (
                <tr key={ln.rot} className={ln.destaque ? 'font-bold bg-slate-50/60 dark:bg-slate-800/40' : ''}>
                  <td className="py-2 pr-3 text-slate-600 dark:text-slate-300">{ln.rot}</td>
                  {mirai.demonstrativo.map((d) => {
                    const raw = d[ln.k];
                    const v = ln.neg ? -Math.abs(raw) : raw;
                    return (
                      <td key={d.label} className={`py-2 px-3 text-right ${val(v)}`}>{brl(v)}</td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Evolução dos custos por sistema</CardTitle>
            <CardDescription>Top {topSistemas.length} sistemas SaaS</CardDescription>
          </CardHeader>
          <CardContent>
            <LinhaMulti
              labels={mirai.labels_mes}
              series={topSistemas.map((s, i) => ({ label: s, cor: cor(i), valores: mirai.sistemas_mensal[s] ?? [] }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Alertas</CardTitle>
            <CardDescription>Acima da média do próprio sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {mirai.alertas.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum sistema acima da média neste período. 👍</p>
            ) : (
              mirai.alertas.map((a, i) => (
                <div
                  key={`${a.sistema}-${a.label}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{a.sistema}</p>
                      <p className="text-[11px] text-slate-500">
                        {a.label} · {brl(a.valor)} (média {brl(a.media)})
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-red-600 shrink-0">+{a.desvio_pct}%</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <LancamentosTable rows={mirai.lancamentos} clientId={clientId} sugestoes={sugestoes} titulo="Lançamentos Mirai" mostrarCentro={false} />
    </div>
  );
}

function ViagensView({ viagens, clientId, sugestoes }: { viagens: ViagensData; clientId: string; sugestoes: Sugestoes }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Comparativo entre viagens</CardTitle>
          <CardDescription>Total por viagem</CardDescription>
        </CardHeader>
        <CardContent>
          <Barras
            horizontal
            labels={viagens.comparativo.map((v) => v.viagem)}
            series={[{ label: 'Total', cor: '#9333ea', valores: viagens.comparativo.map((v) => v.total) }]}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {viagens.por_viagem.map((t) => (
          <Card key={t.viagem}>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t.viagem}</p>
                <Badge variant="brand">{t.n}</Badge>
              </div>
              <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-50">{brl(t.total)}</p>
              <ul className="space-y-1 pt-1">
                {t.subcategorias.map((s) => (
                  <li key={s.subcategoria} className="flex justify-between text-xs border-t border-dashed border-slate-200/70 dark:border-slate-700/70 pt-1">
                    <span className="text-slate-500">{s.subcategoria}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">{brl(s.total)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <LancamentosTable rows={viagens.lancamentos} clientId={clientId} sugestoes={sugestoes} titulo="Lançamentos de viagem" mostrarCentro={false} />
    </div>
  );
}

function ReceitasView({ receitas, clientId, sugestoes }: { receitas: ReceitasData; clientId: string; sugestoes: Sugestoes }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Receitas por cliente</CardTitle>
            <CardDescription>Participação no total</CardDescription>
          </CardHeader>
          <CardContent>
            <Donut
              labels={receitas.por_cliente.map((c) => c.cliente)}
              valores={receitas.por_cliente.map((c) => c.total)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total acumulado por cliente</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {receitas.por_cliente.map((c) => (
                  <tr key={c.cliente}>
                    <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-200">{c.cliente}</td>
                    <td className={`py-1.5 text-right font-medium ${val(c.total)}`}>{brl(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico por cliente — mês a mês</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-slate-500">
                <th className="text-left py-2 pr-3 font-semibold">Cliente</th>
                {receitas.labels_mes.map((l) => (
                  <th key={l} className="text-right py-2 px-3 font-semibold">{l}</th>
                ))}
                <th className="text-right py-2 px-3 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {receitas.por_cliente.map((c) => {
                const serie = receitas.cliente_mensal[c.cliente] ?? [];
                return (
                  <tr key={c.cliente}>
                    <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-200">{c.cliente}</td>
                    {serie.map((v, i) => (
                      <td key={i} className={`py-1.5 px-3 text-right ${v ? val(v) : 'text-slate-300'}`}>
                        {v ? brl(v) : '·'}
                      </td>
                    ))}
                    <td className={`py-1.5 px-3 text-right font-medium ${val(c.total)}`}>{brl(c.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <LancamentosTable rows={receitas.lancamentos} clientId={clientId} sugestoes={sugestoes} titulo="Lançamentos de receita" mostrarCentro={false} />
    </div>
  );
}
