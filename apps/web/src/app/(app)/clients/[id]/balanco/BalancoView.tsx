'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CalendarRange,
  CircleDollarSign,
  Crown,
  ShieldCheck,
  Sigma,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { simulate, type Client, type SimulationInput } from '@planejador/engine';
import { ExcedentePopup } from '../excedente/ExcedentePopup';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { KpiCard } from '@/components/KpiCard';
import { PatrimonioChart } from '@/components/charts/PatrimonioChart';
import { FluxoChart } from '@/components/charts/FluxoChart';
import { IncomeExpenseChart } from '@/components/charts/IncomeExpenseChart';
import { InvestimentosChart } from '@/components/charts/InvestimentosChart';
import { EntityLists } from '@/components/EntityLists';

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

const perfilLabel: Record<
  string,
  { label: string; variant: 'default' | 'success' | 'warning' | 'brand' }
> = {
  conservador: { label: 'Conservador', variant: 'default' },
  moderado: { label: 'Moderado', variant: 'brand' },
  arrojado: { label: 'Arrojado', variant: 'warning' },
  custom: { label: 'Custom', variant: 'success' },
};

const avatarPalettes = [
  'from-brand-500 to-sky-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-sky-500 to-blue-600',
  'from-purple-500 to-fuchsia-600',
];

function hashIdx(s: string, n: number) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % n;
}

interface CmSummary {
  pendente: boolean;
  step: number | null;
  receitaMes: number;
  gastoMes: number;
  lancMes: number;
  mesAtualLabel: string;
}

interface Props {
  clientId: string;
  client: Client;
  input: SimulationInput;
  temControleMensal: boolean;
  cmSummary: CmSummary | null;
  qtdAcoesExcedente: number;
  ativarCmAction: (formData: FormData) => Promise<void>;
}

export function BalancoView({
  clientId,
  client,
  input,
  temControleMensal,
  cmSummary,
  qtdAcoesExcedente,
  ativarCmAction,
}: Props) {
  // Simula no browser: tira ~80% do tempo de servidor desta página.
  const result = useMemo(() => simulate(input), [input]);

  const linhaPrimeiroExcedente = result.rows.find((r) => r.consumo_excedente > 0);
  const totalExcedente = result.rows.reduce((s, r) => s + r.consumo_excedente, 0);
  const mostrarPopupExcedente = totalExcedente > 0 && qtdAcoesExcedente === 0;

  const perfil = perfilLabel[client.perfil_carteira] ?? perfilLabel.moderado!;
  const palette = avatarPalettes[hashIdx(client.id, avatarPalettes.length)];
  const initials = client.nome_completo
    .split(' ')
    .slice(0, 2)
    .map((p: string) => p[0])
    .join('')
    .toUpperCase();

  const patrimonioInicial =
    result.input_summary.saldo_financeiro_inicial + result.input_summary.patrimonio_iliquido_inicial;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Top nav */}
      <div className="flex items-center justify-between">
        <Link href="/clients">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={14} />
            Voltar para clientes
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Link href={`/clients/${clientId}/transcript`}>
            <Button variant="outline" size="sm">
              Refinar via transcrição
            </Button>
          </Link>
          <Link href={`/clients/${clientId}/compare`}>
            <Button variant="outline" size="sm">
              Comparar cenários
            </Button>
          </Link>
          <Link href={`/clients/${clientId}/edit`}>
            <Button variant="primary" size="sm">
              Editar dados
            </Button>
          </Link>
        </div>
      </div>

      {/* Hero card */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-soft">
        <div className="absolute inset-0 bg-mesh-brand opacity-50" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-300 to-transparent" />

        <div className="relative p-8 lg:p-10">
          <div className="flex items-start gap-6 flex-wrap">
            <div
              className={`h-20 w-20 rounded-2xl bg-gradient-to-br ${palette} text-white text-2xl font-bold flex items-center justify-center shrink-0 shadow-glow ring-1 ring-inset ring-white/20`}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge variant={perfil.variant}>Perfil {perfil.label}</Badge>
                <Badge variant="default">
                  <Calendar size={10} />
                  {result.input_summary.idade_inicial}–{result.input_summary.idade_final} anos
                </Badge>
                <Badge variant="default">Cenário {result.input_summary.cenario}</Badge>
                <Badge variant="success">
                  <ShieldCheck size={10} />
                  Ativo
                </Badge>
              </div>
              <h1 className="text-display-md font-bold tracking-tight text-slate-900 text-balance">
                {client.nome_completo}
              </h1>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                {input.assets.length} ativos · {input.expenses.length} despesas · {input.events.length}{' '}
                eventos · simulação cobrindo {result.rows.length} anos
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 md:gap-6 self-start">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Patrimônio hoje
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-slate-900">
                  {brlCompact(patrimonioInicial)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Projeção final
                </p>
                <p
                  className={`mt-1 text-2xl font-bold tabular-nums tracking-tight ${
                    result.summary.patrimonio_final < 0 ? 'text-red-600' : 'text-emerald-700'
                  }`}
                >
                  {brlCompact(result.summary.patrimonio_final)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card pra ativar Controle Financeiro */}
      {!temControleMensal && (
        <form action={ativarCmAction}>
          <input type="hidden" name="id" value={clientId} />
          <button
            type="submit"
            className="w-full text-left rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors p-5 flex items-center gap-4 group"
          >
            <div className="h-11 w-11 rounded-2xl bg-slate-100 group-hover:bg-emerald-500 group-hover:text-white text-slate-500 flex items-center justify-center shrink-0 transition-colors">
              <CalendarRange size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 group-hover:text-emerald-900">
                Ativar Controle Financeiro
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Acompanhar lançamentos reais mês a mês (categorias, centros, importação de extratos)
              </p>
            </div>
            <ArrowRight size={16} className="text-slate-400 group-hover:text-emerald-600 shrink-0" />
          </button>
        </form>
      )}

      {cmSummary && (
        <Link
          href={cmSummary.pendente ? `/clients/${clientId}/onboarding-cm` : `/clients/${clientId}/controle-mensal`}
          className={`block rounded-3xl border-2 p-6 transition-all hover:-translate-y-0.5 shadow-soft hover:shadow-soft-lg ${
            cmSummary.pendente
              ? 'border-amber-200 bg-amber-50/40 hover:border-amber-300'
              : 'border-emerald-200/70 bg-gradient-to-br from-emerald-50/30 to-white hover:border-emerald-300'
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${
                cmSummary.pendente ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
              }`}
            >
              <CalendarRange size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-700">
                  Controle Financeiro
                </p>
                {cmSummary.pendente && (
                  <Badge variant="warning">Onboarding pendente · passo {cmSummary.step}/4</Badge>
                )}
              </div>
              {cmSummary.pendente ? (
                <>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    Termine o onboarding pra começar a lançar
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Faltam alguns passos — centros, categorias e primeiros lançamentos.
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{cmSummary.mesAtualLabel}</p>
                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm tabular-nums">
                    <span className="text-emerald-700 font-semibold">+{brlCompact(cmSummary.receitaMes)}</span>
                    <span className="text-red-600 font-semibold">−{brlCompact(cmSummary.gastoMes)}</span>
                    <span className="text-slate-900 font-bold">
                      Saldo {brlCompact(cmSummary.receitaMes - cmSummary.gastoMes)}
                    </span>
                    <span className="text-slate-500">
                      · {cmSummary.lancMes} lançamento{cmSummary.lancMes === 1 ? '' : 's'}
                    </span>
                  </div>
                </>
              )}
            </div>
            <ArrowRight size={18} className="text-slate-400 shrink-0 mt-1" />
          </div>
        </Link>
      )}

      {/* KPIs principais */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 px-1">Indicadores principais</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Patrimônio inicial"
            value={brlCompact(patrimonioInicial)}
            hint={`${brlCompact(result.input_summary.saldo_financeiro_inicial)} líquido + ${brlCompact(result.input_summary.patrimonio_iliquido_inicial)} ilíquido`}
            icon={Wallet}
            tone="brand"
          />
          <KpiCard
            label="Patrimônio pico"
            value={brlCompact(result.summary.patrimonio_pico)}
            hint={`atinge aos ${result.summary.patrimonio_pico_idade} anos`}
            icon={Crown}
            tone="positive"
            trend="up"
          />
          <KpiCard
            label="Patrimônio final"
            value={brlCompact(result.summary.patrimonio_final)}
            hint={`aos ${result.input_summary.idade_final} anos`}
            icon={TrendingUp}
            tone={result.summary.patrimonio_final < 0 ? 'negative' : 'default'}
            trend={result.summary.patrimonio_final < 0 ? 'down' : 'flat'}
          />
          <KpiCard
            label="Break-even"
            value={result.summary.idade_break_even ? `${result.summary.idade_break_even} anos` : 'nunca'}
            hint={result.summary.idade_break_even ? 'idade em que entra em dívida' : 'patrimônio aguenta'}
            icon={AlertTriangle}
            tone={result.summary.idade_break_even ? 'negative' : 'positive'}
          />
        </div>
      </section>

      {/* KPIs secundários */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 px-1">Performance & risco</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <KpiCard
            label="NPV fluxo líquido"
            value={brlCompact(result.summary.npv_fluxo_liquido)}
            hint="valor presente dos fluxos futuros"
            icon={Sigma}
            tone={result.summary.npv_fluxo_liquido < 0 ? 'negative' : 'default'}
          />
          <KpiCard
            label="Drawdown máximo"
            value={`${(result.summary.drawdown_maximo * 100).toFixed(1)}%`}
            hint="queda do pico ao vale"
            icon={CircleDollarSign}
            tone={result.summary.drawdown_maximo > 0.5 ? 'negative' : 'default'}
          />
          <KpiCard
            label="Preservação"
            value={`${(result.summary.indice_preservacao * 100).toFixed(0)}%`}
            hint="patrimônio final / pico"
            icon={TrendingUp}
            tone={result.summary.indice_preservacao < 0 ? 'negative' : 'positive'}
          />
        </div>
      </section>

      {/* Gráficos */}
      <section className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Evolução do patrimônio</CardTitle>
                <CardDescription>
                  Patrimônio total e saldo financeiro líquido ao longo dos anos
                </CardDescription>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-br from-brand-400 to-brand-600" />
                  Patrimônio
                </span>
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-br from-emerald-400 to-emerald-600" />
                  Saldo
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <PatrimonioChart rows={result.rows} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fluxo líquido</CardTitle>
            <CardDescription>Entradas − saídas por ano</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <FluxoChart rows={result.rows} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receitas vs despesas</CardTitle>
            <CardDescription>
              Composição ano a ano — receitas acima do zero, despesas abaixo. Passe o mouse pra ver a divisão por origem/categoria
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <IncomeExpenseChart rows={result.rows} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Investimentos</CardTitle>
            <CardDescription>
              Saldo financeiro líquido projetado · azul = principal acumulado, verde = rendimento sobre o capital
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <InvestimentosChart rows={result.rows} />
          </CardContent>
        </Card>
      </section>

      {/* Dados cadastrados */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 px-1">Dados cadastrados</h2>
        <EntityLists assets={input.assets} expenses={input.expenses} events={input.events} />
      </section>

      {/* Tabela */}
      <Card>
        <CardHeader className="border-b border-slate-100/70">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>Fluxo de caixa ano a ano</CardTitle>
              <CardDescription>
                {result.rows.length} anos de simulação · valores em BRL
              </CardDescription>
            </div>
            <Badge variant="default">
              <Sigma size={10} />
              {result.rows.length} linhas
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm tabular-nums">
            <thead className="bg-slate-50/70 sticky top-0 z-10">
              <tr className="text-[10px] uppercase tracking-widest text-slate-500">
                <th className="text-left px-5 py-3.5 font-semibold">Idade</th>
                <th className="text-left px-5 py-3.5 font-semibold">Ano</th>
                <th className="text-right px-5 py-3.5 font-semibold">Saldo inicial</th>
                <th className="text-right px-5 py-3.5 font-semibold">Receitas</th>
                <th className="text-right px-5 py-3.5 font-semibold">Despesas</th>
                <th className="text-right px-5 py-3.5 font-semibold">Eventos −</th>
                <th className="text-right px-5 py-3.5 font-semibold">Fluxo líq.</th>
                <th className="text-right px-5 py-3.5 font-semibold">Retorno</th>
                <th className="text-right px-5 py-3.5 font-semibold">Saldo final</th>
                <th className="text-right px-5 py-3.5 font-semibold">Dívida</th>
                <th className="text-right px-5 py-3.5 font-semibold bg-slate-100/50">Patrimônio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {result.rows.map((row) => {
                const despesas = row.despesas_essenciais + row.despesas_nao_essenciais;
                return (
                  <tr key={row.idade} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="px-5 py-3 font-semibold text-slate-900">{row.idade}</td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{row.ano_calendario}</td>
                    <td className="px-5 py-3 text-right text-slate-700">{brl(row.saldo_inicial)}</td>
                    <td className="px-5 py-3 text-right text-emerald-600 font-medium">
                      {brl(row.receitas_total)}
                    </td>
                    <td className="px-5 py-3 text-right text-red-600 font-medium">
                      {brl(-despesas)}
                    </td>
                    <td className="px-5 py-3 text-right text-red-600">
                      {row.eventos_negativos ? brl(-row.eventos_negativos) : <span className="text-slate-300">—</span>}
                    </td>
                    <td
                      className={`px-5 py-3 text-right font-semibold ${
                        row.fluxo_liquido < 0 ? 'text-red-600' : 'text-emerald-600'
                      }`}
                    >
                      {brl(row.fluxo_liquido)}
                    </td>
                    <td className="px-5 py-3 text-right text-emerald-600">
                      {row.retorno ? brl(row.retorno) : <span className="text-slate-300">—</span>}
                    </td>
                    <td
                      className={`px-5 py-3 text-right ${
                        row.saldo_final < 0 ? 'text-red-600 font-medium' : 'text-slate-900'
                      }`}
                    >
                      {brl(row.saldo_final)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {row.saldo_divida > 0 ? (
                        <span className="text-red-600 font-medium">{brl(-row.saldo_divida)}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td
                      className={`px-5 py-3 text-right font-bold bg-slate-50/30 group-hover:bg-slate-100/40 transition-colors ${
                        row.patrimonio_total < 0 ? 'text-red-600' : 'text-slate-900'
                      }`}
                    >
                      {brl(row.patrimonio_total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <ExcedentePopup
        clientId={clientId}
        open={mostrarPopupExcedente}
        idadeReferencia={linhaPrimeiroExcedente?.idade ?? null}
        totalExcedente={totalExcedente}
      />
    </div>
  );
}
