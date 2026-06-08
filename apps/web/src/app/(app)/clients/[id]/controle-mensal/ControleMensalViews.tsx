'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { brl } from '@/lib/controle-mensal/format';
import type {
  PessoalData, MiraiData, ViagensData, ReceitasData, Lancamento,
} from '@/lib/controle-mensal/analytics';
import { LinhaMulti, cor } from './charts';
import { LancamentosTable } from './LancamentosTable';
import type { Sugestoes } from './LancamentoForm';
import { GeralDashboard } from './GeralDashboard';
import { ComparacoesView } from './ComparacoesView';
import { AnaliseIAView } from './AnaliseIAView';
import { CategoryBreakdown } from './CategoryBreakdown';
import type { Indicadores } from '@/lib/controle-mensal/analises';

const TABS = [
  { id: 'gastos',   label: 'Gastos'   },
  { id: 'receitas', label: 'Receitas' },
  { id: 'mirai',    label: 'Mirai'    },
  { id: 'resumo',   label: 'Resumo'   },
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
  const [tab, setTab] = useState<TabId>('gastos');
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

      {tab === 'gastos' && (
        <GastosView pessoal={pessoal} viagens={viagens} clientId={clientId} sugestoes={sugestoes} />
      )}
      {tab === 'receitas' && (
        <ReceitasView receitas={receitas} clientId={clientId} sugestoes={sugestoes} />
      )}
      {tab === 'mirai' && (
        <MiraiView mirai={mirai} clientId={clientId} sugestoes={sugestoes} />
      )}
      {tab === 'resumo' && (
        <ResumoView indicadores={indicadores} rows={rows} clientId={clientId} />
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * GASTOS — sub-toggle Pessoal / Viagens
 * ────────────────────────────────────────────────────────────────────── */

const GASTOS_SUB = [
  { id: 'pessoal', label: 'Pessoal' },
  { id: 'viagens', label: 'Viagens' },
] as const;
type GastosSub = (typeof GASTOS_SUB)[number]['id'];

function GastosView({
  pessoal, viagens, clientId, sugestoes,
}: { pessoal: PessoalData; viagens: ViagensData; clientId: string; sugestoes: Sugestoes }) {
  const [sub, setSub] = useState<GastosSub>('pessoal');
  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-0.5 text-xs">
        {GASTOS_SUB.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setSub(o.id)}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              sub === o.id
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm font-medium'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {sub === 'pessoal' ? (
        <>
          <CategoryBreakdown totalLabel="Total gastos pessoais" data={pessoal.breakdown} />
          <LancamentosTable
            rows={pessoal.lancamentos}
            clientId={clientId}
            sugestoes={sugestoes}
            titulo="Lançamentos pessoais"
            mostrarCentro={false}
          />
        </>
      ) : (
        <>
          <CategoryBreakdown totalLabel="Total gastos viagens" data={viagens.breakdown} />
          <LancamentosTable
            rows={viagens.lancamentos}
            clientId={clientId}
            sugestoes={sugestoes}
            titulo="Lançamentos de viagem"
            mostrarCentro={false}
          />
        </>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * RECEITAS
 * ────────────────────────────────────────────────────────────────────── */

function ReceitasView({
  receitas, clientId, sugestoes,
}: { receitas: ReceitasData; clientId: string; sugestoes: Sugestoes }) {
  // Histórico mês-a-mês por cliente continua útil — entra como footer.
  const footer =
    receitas.por_cliente.length > 0 ? (
      <Card>
        <CardHeader>
          <CardTitle>Histórico por cliente — mês a mês</CardTitle>
          <CardDescription>Receita reconhecida por competência</CardDescription>
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
    ) : null;

  return (
    <div className="space-y-4">
      <CategoryBreakdown
        totalLabel="Total receitas"
        data={receitas.breakdown}
        tone="positive"
        footer={footer}
      />
      <LancamentosTable
        rows={receitas.lancamentos}
        clientId={clientId}
        sugestoes={sugestoes}
        titulo="Lançamentos de receita"
        mostrarCentro={false}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * MIRAI — breakdown + demonstrativo + alertas
 * ────────────────────────────────────────────────────────────────────── */

function MiraiView({
  mirai, clientId, sugestoes,
}: { mirai: MiraiData; clientId: string; sugestoes: Sugestoes }) {
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

  const footer = (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Demonstrativo mensal</CardTitle>
          <CardDescription>
            Receita Nexlex (−) SaaS (−) Colaboradores (−) Outros = Salário líquido.
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
    </div>
  );

  return (
    <div className="space-y-4">
      <CategoryBreakdown
        totalLabel="Total despesas Mirai"
        data={mirai.breakdown}
        footer={footer}
      />
      <LancamentosTable
        rows={mirai.lancamentos}
        clientId={clientId}
        sugestoes={sugestoes}
        titulo="Lançamentos Mirai"
        mostrarCentro={false}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * RESUMO — Geral + Comparações + Análise IA num só lugar
 * ────────────────────────────────────────────────────────────────────── */

const RESUMO_SUB = [
  { id: 'geral',       label: 'Visão geral' },
  { id: 'comparacoes', label: 'Comparações' },
  { id: 'analise',     label: 'Análise IA'  },
] as const;
type ResumoSub = (typeof RESUMO_SUB)[number]['id'];

function ResumoView({
  indicadores, rows, clientId,
}: { indicadores: Indicadores; rows: Lancamento[]; clientId: string }) {
  const [sub, setSub] = useState<ResumoSub>('geral');
  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-0.5 text-xs">
        {RESUMO_SUB.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setSub(o.id)}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              sub === o.id
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm font-medium'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {sub === 'geral' && <GeralDashboard ind={indicadores} />}
      {sub === 'comparacoes' && <ComparacoesView rows={rows} />}
      {sub === 'analise' && <AnaliseIAView clientId={clientId} temDados={rows.length > 0} />}
    </div>
  );
}
