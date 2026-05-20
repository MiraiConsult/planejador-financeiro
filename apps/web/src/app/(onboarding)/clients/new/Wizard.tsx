'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Wallet,
  TrendingUp,
  Receipt,
  CalendarHeart,
  CheckCircle2,
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
import { createClientFromOnboarding } from './actions';
import type { OnboardingPayload, DraftAsset, DraftExpense, DraftEvent } from './types';
import { StepDadosPessoais } from './steps/StepDadosPessoais';
import { StepPatrimonio } from './steps/StepPatrimonio';
import { StepReceitas } from './steps/StepReceitas';
import { StepDespesas } from './steps/StepDespesas';
import { StepEventos } from './steps/StepEventos';
import { StepRevisao } from './steps/StepRevisao';

export interface WizardState {
  // step 1
  nome_completo: string;
  data_nascimento: string;
  expectativa_vida_anos: number;
  idade_aposentadoria: number | null;
  idade_reducao_trabalho: number | null;
  perfil_carteira: 'conservador' | 'moderado' | 'arrojado' | 'custom';
  custom_retorno_aa: number | null;
  custom_volatilidade_aa: number | null;
  // steps 2-5
  assets: DraftAsset[];
  expenses: DraftExpense[];
  events: DraftEvent[];
}

const initialState: WizardState = {
  nome_completo: '',
  data_nascimento: '',
  expectativa_vida_anos: 90,
  idade_aposentadoria: 65,
  idade_reducao_trabalho: null,
  perfil_carteira: 'moderado',
  custom_retorno_aa: null,
  custom_volatilidade_aa: null,
  assets: [],
  expenses: [],
  events: [],
};

const stepsConfig = [
  { id: 1, title: 'Dados pessoais', subtitle: 'Identificação e perfil', icon: User },
  { id: 2, title: 'Patrimônio', subtitle: 'O que você tem hoje', icon: Wallet },
  { id: 3, title: 'Receitas', subtitle: 'O que entra todo mês/ano', icon: TrendingUp },
  { id: 4, title: 'Despesas', subtitle: 'O que sai todo mês', icon: Receipt },
  { id: 5, title: 'Eventos', subtitle: 'Sonhos e gastos pontuais', icon: CalendarHeart },
  { id: 6, title: 'Revisão', subtitle: 'Confirme e salve', icon: CheckCircle2 },
];

export function Wizard() {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function update<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function canAdvance(): boolean {
    if (step === 1) {
      return state.nome_completo.trim().length >= 3 && !!state.data_nascimento && state.expectativa_vida_anos > 0;
    }
    return true; // demais steps podem pular vazios
  }

  function handleNext() {
    if (step < stepsConfig.length) setStep(step + 1);
  }

  function handleBack() {
    if (step > 1) setStep(step - 1);
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const payload: OnboardingPayload = {
        nome_completo: state.nome_completo.trim(),
        data_nascimento: state.data_nascimento,
        expectativa_vida_anos: state.expectativa_vida_anos,
        idade_aposentadoria: state.idade_aposentadoria,
        idade_reducao_trabalho: state.idade_reducao_trabalho,
        perfil_carteira: state.perfil_carteira,
        custom_retorno_aa: state.custom_retorno_aa,
        custom_volatilidade_aa: state.custom_volatilidade_aa,
        assets: state.assets,
        expenses: state.expenses,
        events: state.events,
      };
      const res = await createClientFromOnboarding(payload);
      if (!res.ok) {
        setError(res.error);
        toast.error(res.error);
        return;
      }
      toast.success('Cliente criado com sucesso');
      router.push(`/clients/${res.client_id}`);
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo />
          <Link href="/clients">
            <Button variant="ghost" size="sm">
              <X size={14} />
              Cancelar
            </Button>
          </Link>
        </div>
      </header>

      {/* Progress strip */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="hidden md:flex items-center justify-between gap-1">
            {stepsConfig.map((s, i) => {
              const Icon = s.icon;
              const done = s.id < step;
              const active = s.id === step;
              return (
                <div key={s.id} className="flex items-center gap-3 flex-1">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'h-9 w-9 shrink-0 rounded-full flex items-center justify-center transition-all',
                        done && 'bg-brand-600 text-white',
                        active && 'bg-slate-900 text-white ring-4 ring-brand-100',
                        !done && !active && 'bg-slate-100 text-slate-400',
                      )}
                    >
                      {done ? <Check size={16} /> : <Icon size={15} />}
                    </div>
                    <div className="min-w-0 hidden lg:block">
                      <p
                        className={cn(
                          'text-xs font-semibold leading-tight truncate',
                          (done || active) ? 'text-slate-900' : 'text-slate-400',
                        )}
                      >
                        {s.title}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{s.subtitle}</p>
                    </div>
                  </div>
                  {i < stepsConfig.length - 1 && (
                    <div
                      className={cn(
                        'flex-1 h-px transition-colors',
                        done ? 'bg-brand-500' : 'bg-slate-200',
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile compact */}
          <div className="md:hidden">
            <div className="flex items-center justify-between mb-2 text-xs">
              <span className="font-semibold text-slate-900">
                Passo {step} de {stepsConfig.length}
              </span>
              <span className="text-slate-500">{stepsConfig[step - 1]!.title}</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-500 to-sky-500 transition-all"
                style={{ width: `${(step / stepsConfig.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Step content */}
      <main className="flex-1 px-6 py-10">
        <div key={step} className="max-w-3xl mx-auto animate-slide-right">
          {step === 1 && <StepDadosPessoais state={state} update={update} />}
          {step === 2 && <StepPatrimonio state={state} update={update} />}
          {step === 3 && <StepReceitas state={state} update={update} />}
          {step === 4 && <StepDespesas state={state} update={update} />}
          {step === 5 && <StepEventos state={state} update={update} />}
          {step === 6 && <StepRevisao state={state} />}

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      </main>

      {/* Footer nav */}
      <footer className="sticky bottom-0 border-t border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 1 || isPending}
            size="md"
          >
            <ArrowLeft size={14} />
            Voltar
          </Button>

          <p className="hidden md:block text-xs text-slate-500">
            {step < stepsConfig.length
              ? `Passo ${step} de ${stepsConfig.length} — ${stepsConfig[step - 1]!.title}`
              : 'Última etapa: confira e finalize'}
          </p>

          {step < stepsConfig.length ? (
            <Button onClick={handleNext} disabled={!canAdvance() || isPending} size="md">
              Continuar
              <ArrowRight size={14} />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isPending} size="md">
              {isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Salvando...
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
