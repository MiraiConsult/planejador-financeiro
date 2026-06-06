'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Wallet,
  Receipt,
  CalendarHeart,
  TrendingUp,
  LineChart as LineChartIcon,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import {
  saveOnboardingDraft,
  finalizeOnboarding,
} from './actions';
import type {
  OnboardingPayload,
  DraftAsset,
  DraftExpense,
  DraftEvent,
  DraftLiability,
  PerfilSubjetivo,
} from './types';
import { StepCapa } from './steps/StepCapa';
import { StepDadosPessoais } from './steps/StepDadosPessoais';
import { StepEventos } from './steps/StepEventos';
import { StepPatrimonio } from './steps/StepPatrimonio';
import { StepReceitas } from './steps/StepReceitas';
import { StepDespesas } from './steps/StepDespesas';
import { StepPreview } from './steps/StepPreview';

export interface WizardState {
  nome_completo: string;
  data_nascimento: string;
  expectativa_vida_anos: number;
  idade_aposentadoria: number | null;
  idade_reducao_trabalho: number | null;
  perfil_carteira: 'conservador' | 'moderado' | 'arrojado' | 'custom';
  custom_retorno_aa: number | null;
  custom_volatilidade_aa: number | null;
  perfil_subjetivo: PerfilSubjetivo;
  assets: DraftAsset[];
  expenses: DraftExpense[];
  events: DraftEvent[];
  liabilities: DraftLiability[];
}

const emptyState: WizardState = {
  nome_completo: '',
  data_nascimento: '',
  expectativa_vida_anos: 90,
  idade_aposentadoria: 65,
  idade_reducao_trabalho: null,
  perfil_carteira: 'moderado',
  custom_retorno_aa: null,
  custom_volatilidade_aa: null,
  perfil_subjetivo: {},
  assets: [],
  expenses: [],
  events: [],
  liabilities: [],
};

const stepsConfig = [
  { id: 1, title: 'Sobre você',  subtitle: 'Quem é o cliente',           icon: User },
  { id: 2, title: 'Sonhos',      subtitle: 'Onde quer chegar',           icon: CalendarHeart },
  { id: 3, title: 'Patrimônio',  subtitle: 'O que tem · o que deve',     icon: Wallet },
  { id: 4, title: 'Receitas',    subtitle: 'O que entra',                icon: TrendingUp },
  { id: 5, title: 'Despesas',    subtitle: 'O que sai',                  icon: Receipt },
  { id: 6, title: 'Preview',     subtitle: 'Olha o futuro',              icon: LineChartIcon },
];

const TOTAL_STEPS = stepsConfig.length;

interface Props {
  initialClientId?: string | null;
  initialState?: WizardState | null;
  initialStep?: number;
}

export function Wizard({ initialClientId = null, initialState = null, initialStep = 0 }: Props) {
  const [step, setStep] = useState(initialStep);
  const [clientId, setClientId] = useState<string | null>(initialClientId);
  const [state, setState] = useState<WizardState>(initialState ?? emptyState);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function update<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function canAdvance(): boolean {
    if (step === 1) {
      return (
        state.nome_completo.trim().length >= 3 &&
        !!state.data_nascimento &&
        state.expectativa_vida_anos > 0
      );
    }
    return true;
  }

  function buildPayload(): OnboardingPayload {
    return {
      nome_completo: state.nome_completo.trim(),
      data_nascimento: state.data_nascimento,
      expectativa_vida_anos: state.expectativa_vida_anos,
      idade_aposentadoria: state.idade_aposentadoria,
      idade_reducao_trabalho: state.idade_reducao_trabalho,
      perfil_carteira: state.perfil_carteira,
      custom_retorno_aa: state.custom_retorno_aa,
      custom_volatilidade_aa: state.custom_volatilidade_aa,
      perfil_subjetivo: state.perfil_subjetivo,
      assets: state.assets,
      expenses: state.expenses,
      events: state.events,
      liabilities: state.liabilities,
    };
  }

  /**
   * Persiste o rascunho no banco e sincroniza o client_id local + URL.
   * Retorna true se gravou com sucesso.
   */
  async function persistDraft(nextStep: number): Promise<boolean> {
    if (!state.nome_completo.trim() || !state.data_nascimento) {
      // Sem dados mínimos não dá pra criar — só permite avançar localmente.
      return true;
    }
    const res = await saveOnboardingDraft({
      client_id: clientId,
      step: nextStep,
      payload: buildPayload(),
    });
    if (!res.ok) {
      toast.error(`Falha ao salvar: ${res.error}`);
      return false;
    }
    if (!clientId) {
      // Primeiro save criou o cliente — atualiza URL pra permitir retomar
      router.replace(`/clients/new?id=${res.client_id}`);
      setClientId(res.client_id);
      toast.success('Rascunho salvo · pode fechar a aba sem perder');
    } else {
      // Saves subsequentes: indicador discreto
      toast.success('Rascunho salvo');
    }
    return true;
  }

  function handleNext() {
    if (step >= TOTAL_STEPS) return;
    startTransition(async () => {
      const nextStep = step + 1;
      const ok = await persistDraft(nextStep);
      if (ok) setStep(nextStep);
    });
  }

  function handleBack() {
    if (step <= 0) return;
    startTransition(async () => {
      const prevStep = Math.max(1, step - 1);
      // grava o estado atual antes de voltar (não perde alterações)
      if (clientId) await persistDraft(step);
      setStep(prevStep);
    });
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      if (!clientId) {
        // edge case: usuário pulou tudo e está finalizando sem salvar nunca
        const saveRes = await saveOnboardingDraft({
          client_id: null,
          step: 6,
          payload: buildPayload(),
        });
        if (!saveRes.ok) {
          setError(saveRes.error);
          toast.error(saveRes.error);
          return;
        }
        setClientId(saveRes.client_id);
        const finRes = await finalizeOnboarding({
          client_id: saveRes.client_id,
          payload: buildPayload(),
        });
        if (!finRes.ok) {
          setError(finRes.error);
          toast.error(finRes.error);
          return;
        }
        toast.success('Cliente criado com sucesso');
        router.push(`/clients/${finRes.client_id}`);
        return;
      }
      const res = await finalizeOnboarding({
        client_id: clientId,
        payload: buildPayload(),
      });
      if (!res.ok) {
        setError(res.error);
        toast.error(res.error);
        return;
      }
      toast.success('Cliente criado com sucesso');
      router.push(`/clients/${res.client_id}`);
    });
  }

  // ─── Capa (step 0): sem progress, sem footer ───
  if (step === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
        <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <Logo />
            <Link href="/clients">
              <Button variant="ghost" size="sm">
                <X size={14} />
                Sair
              </Button>
            </Link>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="max-w-4xl w-full animate-fade-up">
            <StepCapa
              onStart={(prefilledState) => {
                if (prefilledState) {
                  setState(prefilledState);
                }
                setStep(1);
              }}
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo />
          <Link href="/clients">
            <Button variant="ghost" size="sm">
              <X size={14} />
              {clientId ? 'Sair · rascunho salvo' : 'Sair sem salvar'}
            </Button>
          </Link>
        </div>
      </header>

      <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="hidden md:flex items-center justify-between gap-1">
            {stepsConfig.map((s, i) => {
              const Icon = s.icon;
              const done = s.id < step;
              const active = s.id === step;
              return (
                <div key={s.id} className="flex items-center gap-3 flex-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (s.id <= step) setStep(s.id);
                    }}
                    className="flex items-center gap-3 min-w-0 text-left"
                    title={s.title}
                  >
                    <div
                      className={cn(
                        'h-9 w-9 shrink-0 rounded-full flex items-center justify-center transition-all',
                        done && 'bg-brand-600 text-white',
                        active && 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 ring-4 ring-brand-100 dark:ring-brand-800/50',
                        !done && !active && 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500',
                      )}
                    >
                      {done ? <Check size={16} /> : <Icon size={15} />}
                    </div>
                    <div className="min-w-0 hidden lg:block">
                      <p
                        className={cn(
                          'text-xs font-semibold leading-tight truncate',
                          done || active ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500',
                        )}
                      >
                        {s.title}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{s.subtitle}</p>
                    </div>
                  </button>
                  {i < stepsConfig.length - 1 && (
                    <div
                      className={cn(
                        'flex-1 h-px transition-colors',
                        done ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700',
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="md:hidden">
            <div className="flex items-center justify-between mb-2 text-xs">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Passo {step} de {TOTAL_STEPS}
              </span>
              <span className="text-slate-500 dark:text-slate-400">{stepsConfig[step - 1]!.title}</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-500 to-sky-500 transition-all"
                style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 px-6 py-10">
        <div key={step} className="max-w-3xl mx-auto animate-slide-right">
          {step === 1 && <StepDadosPessoais state={state} update={update} />}
          {step === 2 && <StepEventos state={state} update={update} />}
          {step === 3 && <StepPatrimonio state={state} update={update} />}
          {step === 4 && <StepReceitas state={state} update={update} />}
          {step === 5 && <StepDespesas state={state} update={update} />}
          {step === 6 && <StepPreview state={state} />}

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}
        </div>
      </main>

      <footer className="sticky bottom-0 border-t border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={handleBack} disabled={isPending} size="md">
            <ArrowLeft size={14} />
            {step === 1 ? 'Voltar à capa' : 'Voltar'}
          </Button>

          <p className="hidden md:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            {isPending && <Loader2 size={11} className="animate-spin" />}
            {clientId
              ? 'Rascunho salvo · você pode fechar a aba e voltar quando quiser'
              : `Passo ${step} de ${TOTAL_STEPS} — ${stepsConfig[step - 1]!.title}`}
          </p>

          {step < TOTAL_STEPS ? (
            <Button onClick={handleNext} disabled={!canAdvance() || isPending} size="md">
              {isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  {step === 1 ? 'Avançar' : 'Continuar'}
                  <ArrowRight size={14} />
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isPending} size="md">
              {isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Check size={14} />
                  Criar cliente
                </>
              )}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
