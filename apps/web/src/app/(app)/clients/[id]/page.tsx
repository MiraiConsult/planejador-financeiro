import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  CircleDollarSign,
  TrendingUp,
  Wallet,
  AlertTriangle,
  Crown,
  Sigma,
  ShieldCheck,
} from 'lucide-react';
import { simulate } from '@planejador/engine';
import { loadSimulationInput } from '@/lib/loadSimulation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { KpiCard } from '@/components/KpiCard';
import { PatrimonioChart } from '@/components/charts/PatrimonioChart';
import { FluxoChart } from '@/components/charts/FluxoChart';
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

type Params = Promise<{ id: string }>;

export default async function ClientDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const loaded = await loadSimulationInput(id);
  if (!loaded) notFound();

  const { client, input } = loaded;
  const result = simulate(input);
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
          <Link href={`/clients/${id}/compare`}>
            <Button variant="outline" size="sm">
              Comparar cenários
            </Button>
          </Link>
          <Link href={`/clients/${id}/edit`}>
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

            {/* Mini stats à direita */}
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
            hint={
              result.summary.idade_break_even ? 'idade em que entra em dívida' : 'patrimônio aguenta'
            }
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
      <section className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Evolução do patrimônio</CardTitle>
                <CardDescription>
                  Patrimônio total e saldo financeiro líquido ao longo dos anos
                </CardDescription>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-br from-brand-400 to-brand-600" />
                  Patrimônio
                </span>
                <span className="flex items-center gap-1.5 text-slate-600">
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
      </section>

      {/* Dados cadastrados (ativos, despesas, eventos) */}
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
                {result.rows.length} anos de simulação · valores em BRL · engine rodando server-side
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

      <p className="text-xs text-slate-400 text-center py-4">
        Próxima iteração: CRUD de ativos/despesas/eventos · múltiplos cenários · análise de
        sensibilidade
      </p>
    </div>
  );
}
