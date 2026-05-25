'use client';

import { Sparkles, Clock, Compass, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function StepCapa({ onStart }: { onStart: () => void }) {
  return (
    <div className="space-y-10">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-brand-500 to-sky-600 text-white shadow-glow mb-2">
          <Sparkles size={28} strokeWidth={2.2} />
        </div>
        <h1 className="text-display-md font-bold tracking-tight text-slate-900 dark:text-slate-100 text-balance max-w-2xl mx-auto">
          Vamos montar o plano financeiro do seu cliente
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto text-pretty leading-relaxed">
          São <strong>6 etapas curtas</strong>, na ordem certa pra você não travar.
          Dá pra <strong>pular qualquer parte</strong> e ajustar depois — o sistema te guia.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-2">
          <div className="h-9 w-9 rounded-lg bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 flex items-center justify-center">
            <Clock size={16} />
          </div>
          <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">~10 minutos</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Cada tela pede umas poucas coisas. Sem jargão.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-2">
          <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Compass size={16} />
          </div>
          <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">Começa pelos sonhos</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Antes dos números, o porquê. O resto fica mais fácil depois.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-2">
          <div className="h-9 w-9 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <ShieldCheck size={16} />
          </div>
          <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">Pode errar</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Tudo é ajustável depois. Você nem precisa lembrar de salvar.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 pt-2">
        <Button size="lg" onClick={onStart} className="shadow-lg px-8">
          <Sparkles size={15} />
          Começar
        </Button>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Você poderá voltar a qualquer momento usando a navegação no rodapé.
        </p>
      </div>
    </div>
  );
}
