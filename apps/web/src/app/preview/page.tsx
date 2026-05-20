import Link from 'next/link';
import { ArrowRight, Sparkles, TrendingUp } from 'lucide-react';
import { simulate } from '@planejador/engine';
import { marceloSimulationInput } from '@planejador/engine/src/fixtures/marcelo';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Logo } from '@/components/Logo';
import { Sparkline } from '@/components/charts/Sparkline';

const brlCompact = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}R$ ${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}R$ ${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}R$ ${(abs / 1e3).toFixed(0)}k`;
  return `${sign}R$ ${abs.toFixed(0)}`;
};

export default function PreviewIndex() {
  const result = simulate(marceloSimulationInput);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.06),transparent)]">
      <header className="border-b border-slate-200/70 bg-white/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <Badge variant="warning">
              <Sparkles size={10} /> Preview público
            </Badge>
            <Link href="/login">
              <Button variant="primary" size="sm">
                Entrar
                <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600">
            Demonstração
          </p>
          <h1 className="text-display-md font-bold tracking-tight text-slate-900">
            Como o sistema fica em uso
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
            Esta é a tela de detalhe do cliente <strong>Marcelo Castro</strong> — fixture
            extraída da planilha original. Cards com KPIs, gráficos interativos e tabela
            ano-a-ano. Engine rodando server-side.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <article className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-soft transition-all hover:shadow-soft-lg hover:-translate-y-0.5">
            <Link href="/preview/marcelo" className="block">
              <div className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-brand-500 to-sky-600 text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-sm ring-1 ring-inset ring-white/20">
                    MC
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate group-hover:text-brand-700 transition-colors">
                      Marcelo Castro
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">60 anos · horizonte 31a</p>
                  </div>
                  <Badge variant="brand">Moderado</Badge>
                </div>

                <div className="-mx-2">
                  <Sparkline
                    data={result.rows.map((r) => r.patrimonio_total)}
                    color={result.summary.patrimonio_final > 0 ? '#10b981' : '#ef4444'}
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
                        result.summary.patrimonio_final < 0 ? 'text-red-600' : 'text-slate-900'
                      }`}
                    >
                      {brlCompact(result.summary.patrimonio_final)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">
                      Break-even
                    </p>
                    <p className="mt-0.5 text-sm font-bold tabular-nums tracking-tight text-slate-900 flex items-center gap-1">
                      {result.summary.idade_break_even ?? '—'}
                      {result.summary.idade_break_even && (
                        <span className="text-[10px] text-slate-400 font-normal">anos</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-xs font-medium text-brand-600 flex items-center gap-1.5">
                    <TrendingUp size={12} strokeWidth={2.5} />
                    Abrir simulação
                  </span>
                  <ArrowRight
                    size={14}
                    className="text-slate-300 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all"
                  />
                </div>
              </div>
            </Link>
          </article>
        </div>
      </main>
    </div>
  );
}
