import Link from 'next/link';
import { ArrowRight, Plus, Sparkles, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { simulate } from '@planejador/engine';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/Button';
import { SubmitButton, ToastOnSubmit } from '@/components/ui/SubmitButton';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/PageHeader';
import { Sparkline } from '@/components/charts/Sparkline';
import { loadSimulationInput } from '@/lib/loadSimulation';
import { deleteClient, seedMarcelo } from './actions';

const perfilLabel: Record<
  string,
  { label: string; variant: 'default' | 'success' | 'warning' | 'brand' }
> = {
  conservador: { label: 'Conservador', variant: 'default' },
  moderado: { label: 'Moderado', variant: 'brand' },
  arrojado: { label: 'Arrojado', variant: 'warning' },
  custom: { label: 'Custom', variant: 'success' },
};

const brlCompact = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}R$ ${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}R$ ${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}R$ ${(abs / 1e3).toFixed(0)}k`;
  return `${sign}R$ ${abs.toFixed(0)}`;
};

function calcAge(iso: string): number {
  const d = new Date(iso);
  const t = new Date();
  let age = t.getUTCFullYear() - d.getUTCFullYear();
  const before =
    t.getUTCMonth() < d.getUTCMonth() ||
    (t.getUTCMonth() === d.getUTCMonth() && t.getUTCDate() < d.getUTCDate());
  if (before) age -= 1;
  return age;
}

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

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from('clients')
    .select('id, nome_completo, data_nascimento, perfil_carteira, expectativa_vida_anos, created_at, onboarding_step, updated_at')
    .order('created_at', { ascending: false });

  const drafts = (clients ?? []).filter((c) => c.onboarding_step != null);
  const finalClients = (clients ?? []).filter((c) => c.onboarding_step == null);

  // roda simulação leve só nos finalizados (drafts não têm dados consistentes)
  const enriched = await Promise.all(
    finalClients.map(async (c) => {
      const sim = await loadSimulationInput(c.id);
      if (!sim) return { client: c, summary: null, spark: [] as number[] };
      const result = simulate(sim.input);
      return {
        client: c,
        summary: result.summary,
        spark: result.rows.map((r) => r.patrimonio_total),
      };
    }),
  );

  const total = enriched.length;
  const patrimonioTotal = enriched.reduce(
    (acc, e) => acc + (e.summary?.patrimonio_final ?? 0),
    0,
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <PageHeader
        eyebrow="Painel"
        title="Clientes"
        description={
          total === 0
            ? 'Comece carregando um cliente de exemplo para ver o sistema em ação.'
            : `${total} ${total === 1 ? 'cliente' : 'clientes'} ativos · patrimônio final projetado de ${brlCompact(patrimonioTotal)}${
                drafts.length > 0 ? ` · ${drafts.length} em rascunho` : ''
              }.`
        }
        actions={
          <>
            {total > 0 && (
              <form action={seedMarcelo}>
                <SubmitButton variant="outline" size="md" successMessage="Cliente de exemplo carregado">
                  <Sparkles size={14} />
                  + exemplo
                </SubmitButton>
              </form>
            )}
            <Link href="/clients/new">
              <Button variant="primary" size="md">
                <Plus size={15} strokeWidth={2.5} />
                Novo cliente
              </Button>
            </Link>
          </>
        }
      />

      {/* Rascunhos em aberto */}
      {drafts.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-900">
            <Sparkles size={14} />
            <p className="text-sm font-semibold">
              {drafts.length} cliente{drafts.length > 1 ? 's' : ''} em rascunho · continue de onde parou
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {drafts.map((d) => (
              <Link
                key={d.id}
                href={`/clients/new?id=${d.id}`}
                className="rounded-lg border border-amber-200 bg-white p-3 flex items-center justify-between hover:border-amber-400 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {d.nome_completo || 'Sem nome'}
                  </p>
                  <p className="text-[11px] text-amber-700">
                    Passo {d.onboarding_step} de 6
                  </p>
                </div>
                <ArrowRight size={14} className="text-amber-600 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {!finalClients || finalClients.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-soft">
          <div className="absolute inset-0 bg-mesh-brand opacity-60" />
          <div className="relative px-8 py-16 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-sky-600 shadow-glow">
              <Sparkles size={28} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">
              Comece pelo exemplo
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-8 leading-relaxed text-pretty">
              Carregue o caso do <strong className="text-slate-700">Marcelo Castro</strong> — um
              cliente completo com 10 ativos, 10 despesas, 2 eventos e cenário base já configurado.
            </p>
            <form action={seedMarcelo} className="inline">
              <SubmitButton size="lg" successMessage="Cliente Marcelo Castro carregado">
                <Sparkles size={16} />
                Carregar exemplo: Marcelo Castro
                <ArrowRight size={14} />
              </SubmitButton>
            </form>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {enriched.map(({ client: c, summary, spark }) => {
            const age = calcAge(c.data_nascimento);
            const horizonte = c.expectativa_vida_anos - age;
            const perfil = perfilLabel[c.perfil_carteira] ?? perfilLabel.moderado!;
            const palette = avatarPalettes[hashIdx(c.id, avatarPalettes.length)];
            const initials = c.nome_completo
              .split(' ')
              .slice(0, 2)
              .map((p: string) => p[0])
              .join('')
              .toUpperCase();
            const goodOutcome = summary && summary.patrimonio_final > 0;
            const TrendIcon = goodOutcome ? TrendingUp : TrendingDown;

            return (
              <article
                key={c.id}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-soft transition-all hover:shadow-soft-lg hover:-translate-y-0.5"
              >
                <Link href={`/clients/${c.id}`} className="block">
                  <div className="p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`h-11 w-11 rounded-xl bg-gradient-to-br ${palette} text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-sm ring-1 ring-inset ring-white/20`}
                      >
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 truncate group-hover:text-brand-700 transition-colors">
                          {c.nome_completo}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {age} anos · horizonte {horizonte}a
                        </p>
                      </div>
                      <Badge variant={perfil.variant}>{perfil.label}</Badge>
                    </div>

                    {summary && (
                      <>
                        <div className="-mx-2">
                          <Sparkline
                            data={spark}
                            color={goodOutcome ? '#10b981' : '#ef4444'}
                            height={44}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">
                              Patrimônio final
                            </p>
                            <p
                              className={`mt-0.5 text-sm font-bold tabular-nums tracking-tight ${
                                goodOutcome ? 'text-slate-900' : 'text-red-600'
                              }`}
                            >
                              {brlCompact(summary.patrimonio_final)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">
                              Break-even
                            </p>
                            <p className="mt-0.5 text-sm font-bold tabular-nums tracking-tight text-slate-900 flex items-center gap-1">
                              {summary.idade_break_even ?? '—'}
                              {summary.idade_break_even && (
                                <span className="text-[10px] text-slate-400 font-normal">anos</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <span className="text-xs font-medium text-brand-600 flex items-center gap-1.5">
                        <TrendIcon size={12} strokeWidth={2.5} />
                        Abrir simulação
                      </span>
                      <ArrowRight
                        size={14}
                        className="text-slate-300 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all"
                      />
                    </div>
                  </div>
                </Link>
                <form
                  action={deleteClient}
                  className="absolute top-3 right-14 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <input type="hidden" name="id" value={c.id} />
                  <ToastOnSubmit successMessage="Cliente removido" />
                  <button
                    type="submit"
                    className="h-7 w-7 rounded-md bg-white border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-slate-400 flex items-center justify-center shadow-sm"
                    title="Excluir"
                  >
                    <Trash2 size={12} />
                  </button>
                </form>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
