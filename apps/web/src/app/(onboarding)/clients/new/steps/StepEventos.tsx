'use client';

import { useState } from 'react';
import { Bot, LineChart } from 'lucide-react';
import { StepShell } from '../StepShell';
import { idadeFromBirth } from '../helpers';
import { DreamCategories } from '../DreamCategories';
import { DreamsChat } from '../DreamsChat';
import type { WizardState } from '../Wizard';

interface Props {
  state: WizardState;
  update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
}

type Mode = 'chat' | 'manual';

export function StepEventos({ state, update }: Props) {
  const idadeAtual = idadeFromBirth(state.data_nascimento) ?? 30;
  const [mode, setMode] = useState<Mode>('chat');

  return (
    <StepShell
      eyebrow="Passo 2"
      title="Quais são os sonhos?"
      description={
        mode === 'chat'
          ? 'Converse com a IA pra destrinchar o que importa. Ela vai provocar pra entender o que ele quer realmente alcançar e quantificar. Pode pular pra modo manual a qualquer momento.'
          : 'Modo manual: abra as categorias e arraste pontos no gráfico pra criar sonhos em momentos específicos da vida do cliente.'
      }
    >
      {/* Tabs/toggle */}
      <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-1 mb-6">
        <button
          type="button"
          onClick={() => setMode('chat')}
          className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
            mode === 'chat'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Bot size={12} />
          Conversar com IA
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
            mode === 'manual'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <LineChart size={12} />
          Modo manual (gráfico)
        </button>
      </div>

      {mode === 'chat' ? (
        <DreamsChat
          perfil={state.perfil_subjetivo}
          nomeCliente={state.nome_completo}
          dataNascimento={state.data_nascimento}
          expectativaVida={state.expectativa_vida_anos}
          events={state.events}
          onChange={(next) => update('events', next)}
          onSwitchToManual={() => setMode('manual')}
        />
      ) : (
        <DreamCategories
          events={state.events}
          onChange={(next) => update('events', next)}
          idadeAtual={idadeAtual}
          expectativaVida={state.expectativa_vida_anos}
        />
      )}

      {/* Resumo de sonhos já criados (sempre visível) */}
      {state.events.length > 0 && (
        <div className="mt-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/40 px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {state.events.length} sonho{state.events.length > 1 ? 's' : ''}
            </span>{' '}
            cadastrado{state.events.length > 1 ? 's' : ''} no plano
          </p>
        </div>
      )}
    </StepShell>
  );
}
