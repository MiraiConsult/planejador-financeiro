import Link from 'next/link';
import {
  ArrowRight,
  Users as UsersIcon,
  Wallet,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  PieChart,
} from 'lucide-react';
import { simulate } from '@planejador/engine';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/KpiCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { loadSimulationInput } from '@/lib/loadSimulation';

const brlCompact = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}R$ ${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}R$ ${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}R$ ${(abs / 1e3).toFixed(0)}k`;
  return `${sign}R$ ${abs.toFixed(0)}`;
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

export default async function OverviewPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from('clients')
    .select('id, nome_completo, data_nascimento, perfil_carteira, expectativa_vida_anos, created_at')
    .order('created_at', { ascending: false });

  const enriched = await Promise.all(
    (clients ?? []).map(async (c) => {
      const sim = await loadSimulationInput(c.id);
      if (!sim) return null;
      const r = simulate(sim.input);
      return { client: c, summary: r.summary, input: r.input_summary };
    }),
  );
  const valid = enriched.filter((x): x is NonNullable<typeof x> => x != null);

  const total = valid.length;
  const patrimonioInicial = valid.reduce(
    (acc, e) => acc + e.input.saldo_financeiro_inicial + e.input.patrimonio_iliquido_inicial,
    0,
  );
  const patrimonioFinal = valid.reduce((acc, e) => acc + e.summary.patrimonio_final, 0);
  const comDivida = valid.filter((e) => e.summary.idade_break_even !== null).length;
  const distribuicaoPerfil = valid.reduce<Record<string, number>>((acc, e) => {
    acc[e.client.perfil_carteira] = (acc[e.client.perfil_carteira] ?? 0) + 1;
    return acc;
  }, {});

  if (total === 0) {
    return (
      <div className="max-w-7xl mx-auto space-y-8">
        <PageHeader
          eyebrow="Painel"
          title="Visão geral"
          description="Indicadores agregados de todos os seus clientes."
        />
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-soft">
          <div className="absolute inset-0 bg-mesh-brand opacity-60" />
          <div className="relative px-8 py-16 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-sky-600 shadow-glow">
              <Sparkles size={28} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">
              Cadastre seu primeiro cliente
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-8 leading-relaxed">
              Crie um cliente pelo onboarding guiado ou carregue o exemplo Marcelo Castro.
            </p>
            <div className="flex justify-center gap-2">
              <Link href="/clients/new">
                <Button size="lg">
                  <Sparkles size={16} />
                  Começar onboarding
                </Button>
              </Link>
              <Link href="/clients">
                <Button variant="outline" size="lg">
                  Ver clientes
                  <ArrowRight size={14} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <PageHeader
        eyebrow="Painel"
        title="Visão geral"
        description={`Visão agregada de ${total} ${total === 1 ? 'cliente' : 'clientes'} sob sua gestão.`}
        actions={
          <Link href="/clients/new">
            <Button size="md">
              <Sparkles size={14} />
              Novo cliente
            </Button>
          </Link>
        }
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 px-1">Indicadores globais</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Clientes ativos"
            value={String(total)}
            hint={`${total === 1 ? 'plano gerenciado' : 'planos gerenciados'}`}
            icon={UsersIcon}
            tone="brand"
          />
          <KpiCard
            label="Patrimônio agregado hoje"
            value={brlCompact(patrimonioInicial)}
            hint="soma de financeiro + ilíquido"
            icon={Wallet}
            tone="default"
          />
          <KpiCard
            label="Projeção final agregada"
            value={brlCompact(patrimonioFinal)}
            hint="soma das projeções de patrimônio final"
            icon={TrendingUp}
            tone={patrimonioFinal < 0 ? 'negative' : 'positive'}
          />
          <KpiCard
            label="Em alerta"
            value={`${comDivida}/${total}`}
            hint={comDivida > 0 ? 'clientes podem entrar em dívida' : 'nenhum cliente em risco'}
            icon={AlertTriangle}
            tone={comDivida > 0 ? 'negative' : 'positive'}
          />
        </div>
      </section>

      <section className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Clientes em risco</CardTitle>
            <CardDescription>Quem está em alerta de break-even ou patrimônio negativo</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {valid
                .filter((e) => e.summary.idade_break_even !== null || e.summary.patrimonio_final < 0)
                .slice(0, 6)
                .map((e) => {
                  const perfil = perfilLabel[e.client.perfil_carteira] ?? perfilLabel.moderado!;
                  return (
                    <Link
                      key={e.client.id}
                      href={`/clients/${e.client.id}`}
                      className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-brand-500 to-sky-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {e.client.nome_completo.split(' ').slice(0, 2).map((p: string) => p[0]).join('').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate group-hover:text-brand-700">
                            {e.client.nome_completo}
                          </p>
                          <p className="text-xs text-slate-500">
                            Break-even {e.summary.idade_break_even ?? '—'} anos
                          </p>
                        </div>
                      </div>
                      <Badge variant={perfil.variant}>{perfil.label}</Badge>
                      <div className="text-right shrink-0 hidden sm:block">
                        <p className="text-[10px] uppercase tracking-widest text-slate-400">
                          Patrimônio final
                        </p>
                        <p
                          className={`text-sm font-bold tabular-nums ${
                            e.summary.patrimonio_final < 0 ? 'text-red-600' : 'text-slate-900'
                          }`}
                        >
                          {brlCompact(e.summary.patrimonio_final)}
                        </p>
                      </div>
                      <ArrowRight
                        size={14}
                        className="text-slate-300 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all"
                      />
                    </Link>
                  );
                })}
              {valid.filter((e) => e.summary.idade_break_even !== null || e.summary.patrimonio_final < 0).length === 0 && (
                <div className="px-6 py-12 text-center text-sm text-slate-500">
                  Nenhum cliente em situação de alerta. 🎉
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Por perfil de carteira</CardTitle>
            <CardDescription>Distribuição da base</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(distribuicaoPerfil)
              .sort((a, b) => b[1] - a[1])
              .map(([perfil, qtd]) => {
                const p = perfilLabel[perfil] ?? perfilLabel.moderado!;
                const pct = (qtd / total) * 100;
                return (
                  <div key={perfil}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-slate-700">{p.label}</span>
                      <span className="text-xs tabular-nums text-slate-500">
                        {qtd} · {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-sky-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
              <PieChart size={12} />
              Total: {total} clientes
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
