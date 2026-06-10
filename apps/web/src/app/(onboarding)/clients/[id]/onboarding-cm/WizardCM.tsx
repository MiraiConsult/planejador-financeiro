'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Loader2, Layers, Tag, CalendarDays, Upload } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import {
  finalizarOnboardingCM,
  salvarCategorias,
  salvarLancamentosIniciais,
  setStepCM,
} from './actions';
import { type DraftCategoria, type DraftLancamentoInicial, type WizardCMState } from './types';
import { StepCentros } from './steps/StepCentros';
import { StepCategorias } from './steps/StepCategorias';
import { StepPrimeiroMes } from './steps/StepPrimeiroMes';
import { StepImportacao } from './steps/StepImportacao';

const stepsConfig = [
  { id: 1, title: 'Centros', subtitle: 'Divisões', icon: Layers },
  { id: 2, title: 'Categorias', subtitle: 'Rótulos', icon: Tag },
  { id: 3, title: 'Primeiro mês', subtitle: 'Lançamentos', icon: CalendarDays },
  { id: 4, title: 'Importação', subtitle: 'CSV', icon: Upload },
];

interface Props {
  clientId: string;
  clientName: string;
  initialStep: number; // 1..4
  initialCentrosCount: number;
  initialCategorias: DraftCategoria[];
  bpFinalizado: boolean;
}

export function WizardCM({
  clientId,
  clientName,
  initialStep,
  initialCentrosCount,
  initialCategorias,
  bpFinalizado,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState(initialStep);
  const [state, setStateRaw] = useState<WizardCMState>({
    centros_aplicados: initialCentrosCount > 0,
    categorias: initialCategorias,
    lancamentos: [],
  });
  const [finalizando, startFinalize] = useTransition();

  function updateStep(novoStep: number) {
    setStep(novoStep);
    void setStepCM({ client_id: clientId, step: novoStep });
  }

  async function avancarDeCategorias() {
    if (state.categorias.length > 0) {
      const cats = state.categorias.filter((c) => c.nome.trim().length > 0);
      const res = await salvarCategorias({ client_id: clientId, categorias: cats });
      if (!res.ok) {
        toast.error(res.error ?? 'Falha ao salvar categorias');
        return;
      }
      // mapeia tempIds dos lançamentos pra ids reais (pra step 3)
      // guardamos em window pra usar no salvarLancamentos depois
      // (mais simples que passar via props)
      (window as unknown as { __cmCatMap?: Record<string, string> }).__cmCatMap = res.mapaIds;
    }
    updateStep(3);
  }

  async function avancarDePrimeiroMes() {
    if (state.lancamentos.length > 0) {
      const mapa = (window as unknown as { __cmCatMap?: Record<string, string> }).__cmCatMap;
      const res = await salvarLancamentosIniciais({
        client_id: clientId,
        lancamentos: state.lancamentos,
        mapaCategoriasIds: mapa,
      });
      if (!res.ok) {
        toast.error(res.error ?? 'Falha ao salvar lançamentos');
        return;
      }
      if (res.inseridos && res.inseridos > 0) {
        toast.success(`${res.inseridos} lançamento(s) salvos`);
      }
    }
    updateStep(4);
  }

  function finalizar() {
    startFinalize(async () => {
      const res = await finalizarOnboardingCM(clientId);
      if (!res.ok) {
        toast.error(res.error ?? 'Falha ao finalizar');
        return;
      }
      toast.success('Onboarding do Controle Mensal concluído');
      router.push(`/clients/${clientId}/controle-mensal`);
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Logo />
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
              <span className="font-medium text-slate-900 dark:text-slate-100">{clientName}</span>
              <span className="text-slate-400 mx-2">·</span>
              Controle Mensal
            </p>
          </div>
          <Link href="/clients">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={14} />
              Sair
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Stepper */}
        <div className="flex items-center gap-2">
          {stepsConfig.map((s, i) => {
            const done = step > s.id;
            const active = step === s.id;
            const Icon = s.icon;
            return (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <div
                  className={cn(
                    'flex items-center gap-2 flex-1 rounded-xl px-3 py-2 transition-colors',
                    done && 'bg-emerald-50 dark:bg-emerald-950/30',
                    active && 'bg-brand-50 dark:bg-brand-950/30 ring-1 ring-brand-200 dark:ring-brand-800',
                    !done && !active && 'bg-slate-50 dark:bg-slate-900',
                  )}
                >
                  <div
                    className={cn(
                      'h-7 w-7 rounded-lg flex items-center justify-center shrink-0',
                      done && 'bg-emerald-500 text-white',
                      active && 'bg-brand-500 text-white',
                      !done && !active && 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400',
                    )}
                  >
                    {done ? <Check size={13} /> : <Icon size={13} />}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={cn(
                        'text-xs font-semibold truncate',
                        done && 'text-emerald-900 dark:text-emerald-100',
                        active && 'text-brand-900 dark:text-brand-100',
                        !done && !active && 'text-slate-600 dark:text-slate-400',
                      )}
                    >
                      {s.title}
                    </p>
                  </div>
                </div>
                {i < stepsConfig.length - 1 && (
                  <div className="h-px w-2 bg-slate-200 dark:bg-slate-700 shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 lg:p-8">
          {step === 1 && (
            <StepCentros
              clientId={clientId}
              centrosJaConfigurados={initialCentrosCount}
              onConcluido={() => {
                setStateRaw((s) => ({ ...s, centros_aplicados: true }));
                updateStep(2);
              }}
            />
          )}
          {step === 2 && (
            <StepCategorias
              clientId={clientId}
              bpFinalizado={bpFinalizado}
              categorias={state.categorias}
              onChange={(cats) => setStateRaw((s) => ({ ...s, categorias: cats }))}
              onPrev={() => updateStep(1)}
              onNext={() => void avancarDeCategorias()}
            />
          )}
          {step === 3 && (
            <StepPrimeiroMes
              lancamentos={state.lancamentos}
              categorias={state.categorias}
              onChange={(l) => setStateRaw((s) => ({ ...s, lancamentos: l }))}
              onPrev={() => updateStep(2)}
              onNext={() => void avancarDePrimeiroMes()}
            />
          )}
          {step === 4 && (
            <StepImportacao
              clientId={clientId}
              onPrev={() => updateStep(3)}
              onFinalizar={finalizar}
              finalizando={finalizando}
            />
          )}
        </div>
      </main>
      {finalizando && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 pointer-events-none">
          <div className="rounded-xl bg-white dark:bg-slate-900 px-6 py-3 shadow-xl flex items-center gap-3">
            <Loader2 size={18} className="animate-spin text-brand-600" />
            <span className="text-sm font-medium">Finalizando…</span>
          </div>
        </div>
      )}
    </div>
  );
}
