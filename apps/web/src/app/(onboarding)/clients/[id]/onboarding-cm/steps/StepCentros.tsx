'use client';

import { useState, useTransition } from 'react';
import { Sparkles, ArrowRight, Wand2, CheckCircle2 } from 'lucide-react';
import * as Lucide from 'lucide-react';
import { Tag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { TEMPLATES, type TemplateCentro } from '@/lib/controle-mensal/centros';
import { aplicarTemplate } from '@/app/(app)/clients/[id]/controle-mensal/centros/actions';

function Icone({ nome, size = 12 }: { nome: string; size?: number }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Cmp = (Lucide as any)[nome] ?? Tag;
  return <Cmp size={size} />;
}

function flattenTpl(centros: TemplateCentro[]): TemplateCentro[] {
  const out: TemplateCentro[] = [];
  const walk = (n: TemplateCentro): void => { out.push(n); n.filhos?.forEach(walk); };
  centros.forEach(walk);
  return out;
}

interface Props {
  clientId: string;
  centrosJaConfigurados: number;
  onConcluido: () => void;
}

export function StepCentros({ clientId, centrosJaConfigurados, onConcluido }: Props) {
  const [selecionado, setSelecionado] = useState<string | null>('solo');
  const [aplicado, setAplicado] = useState(centrosJaConfigurados > 0);
  const [pending, start] = useTransition();

  function aplicar() {
    if (!selecionado) return;
    start(async () => {
      const res = await aplicarTemplate(clientId, selecionado);
      if (res.ok) {
        toast.success('Centros criados');
        setAplicado(true);
      } else {
        toast.error(res.erro ?? 'Falha ao aplicar template');
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
          Passo 1 de 4 · Centros
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
          Como o dinheiro do cliente é dividido?
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
          Centros separam os lançamentos por área — pessoa física, empresa, projeto, família. Cada
          lançamento pertence a um centro e isso permite ver demonstrativos separados. Escolha um modelo
          abaixo (você pode renomear, adicionar e remover depois).
        </p>
      </div>

      {aplicado ? (
        <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/30 p-5 flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
              Centros configurados
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
              {centrosJaConfigurados > 0
                ? `${centrosJaConfigurados} centros já existem pra esse cliente.`
                : 'Template aplicado. Você pode ajustar depois em Controle Financeiro → Centros.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelecionado(t.id)}
                className={`text-left p-4 rounded-2xl border-2 transition-colors bg-white dark:bg-slate-900 ${
                  selecionado === t.id
                    ? 'border-brand-500'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t.nome}</p>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{t.descricao}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {flattenTpl(t.centros).map((c, i) => (
                    <span
                      key={`${c.nome}-${i}`}
                      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium"
                      style={{ backgroundColor: `${c.cor}22`, color: c.cor }}
                    >
                      <Icone nome={c.icone} size={10} />
                      {c.nome}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Não tem certeza? Comece com "Solo" — dá pra adicionar mais centros depois.
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={aplicar}
              disabled={pending || !selecionado}
            >
              <Sparkles size={13} />
              {pending ? 'Aplicando…' : 'Aplicar template'}
            </Button>
          </div>
        </>
      )}

      <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
        <Button
          variant="primary"
          size="md"
          onClick={onConcluido}
          disabled={!aplicado}
        >
          Continuar
          <ArrowRight size={14} />
        </Button>
      </div>
    </div>
  );
}
