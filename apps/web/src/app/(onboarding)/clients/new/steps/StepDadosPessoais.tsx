'use client';

import { Input, Label } from '@/components/ui/Input';
import { StepShell, RadioCard } from '../StepShell';
import type { WizardState } from '../Wizard';

interface Props {
  state: WizardState;
  update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
}

export function StepDadosPessoais({ state, update }: Props) {
  const isCustom = state.perfil_carteira === 'custom';
  return (
    <StepShell
      eyebrow="Passo 1"
      title="Quem é o cliente?"
      description="Comece com nome, idade e horizonte. Esses valores definem o intervalo da simulação."
    >
      <div className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="nome_completo">Nome completo</Label>
            <Input
              id="nome_completo"
              value={state.nome_completo}
              onChange={(e) => update('nome_completo', e.target.value)}
              placeholder="Ex: Marcelo Castro"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="data_nascimento">Data de nascimento</Label>
            <Input
              id="data_nascimento"
              type="date"
              value={state.data_nascimento}
              onChange={(e) => update('data_nascimento', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="expectativa">Expectativa de vida</Label>
            <div className="relative">
              <Input
                id="expectativa"
                type="number"
                min={18}
                max={120}
                value={state.expectativa_vida_anos}
                onChange={(e) => update('expectativa_vida_anos', Number(e.target.value) || 90)}
                className="pr-12 tabular-nums"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                anos
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="aposentadoria">Idade de aposentadoria (opcional)</Label>
            <div className="relative">
              <Input
                id="aposentadoria"
                type="number"
                min={18}
                max={120}
                value={state.idade_aposentadoria ?? ''}
                onChange={(e) =>
                  update('idade_aposentadoria', e.target.value ? Number(e.target.value) : null)
                }
                placeholder="65"
                className="pr-12 tabular-nums"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                anos
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reducao">Redução de trabalho (opcional)</Label>
            <div className="relative">
              <Input
                id="reducao"
                type="number"
                min={18}
                max={120}
                value={state.idade_reducao_trabalho ?? ''}
                onChange={(e) =>
                  update('idade_reducao_trabalho', e.target.value ? Number(e.target.value) : null)
                }
                placeholder="60"
                className="pr-12 tabular-nums"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                anos
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label>Perfil de carteira</Label>
            <p className="text-xs text-slate-500 mt-1">
              Define o retorno esperado e a volatilidade aplicada nos cenários otimista/pessimista.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <RadioCard
              selected={state.perfil_carteira === 'conservador'}
              onSelect={() => update('perfil_carteira', 'conservador')}
              title="Conservador"
              description="Renda fixa + reserva. Menor retorno, menor risco."
              badge="8% a.a."
            />
            <RadioCard
              selected={state.perfil_carteira === 'moderado'}
              onSelect={() => update('perfil_carteira', 'moderado')}
              title="Moderado"
              description="Misto entre renda fixa e variável."
              badge="10% a.a."
            />
            <RadioCard
              selected={state.perfil_carteira === 'arrojado'}
              onSelect={() => update('perfil_carteira', 'arrojado')}
              title="Arrojado"
              description="Mais ações e renda variável."
              badge="13% a.a."
            />
            <RadioCard
              selected={state.perfil_carteira === 'custom'}
              onSelect={() => update('perfil_carteira', 'custom')}
              title="Personalizado"
              description="Defina retorno e volatilidade você mesmo."
            />
          </div>

          {isCustom && (
            <div className="grid sm:grid-cols-2 gap-4 p-5 rounded-xl bg-slate-50/60 border border-slate-200 animate-fade-up">
              <div className="space-y-1.5">
                <Label htmlFor="custom_retorno">Retorno anual esperado</Label>
                <div className="relative">
                  <Input
                    id="custom_retorno"
                    type="number"
                    step="0.1"
                    value={state.custom_retorno_aa != null ? state.custom_retorno_aa * 100 : ''}
                    onChange={(e) =>
                      update('custom_retorno_aa', e.target.value ? Number(e.target.value) / 100 : null)
                    }
                    placeholder="10"
                    className="pr-10 tabular-nums"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                    %
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="custom_vol">Volatilidade anual</Label>
                <div className="relative">
                  <Input
                    id="custom_vol"
                    type="number"
                    step="0.1"
                    value={state.custom_volatilidade_aa != null ? state.custom_volatilidade_aa * 100 : ''}
                    onChange={(e) =>
                      update('custom_volatilidade_aa', e.target.value ? Number(e.target.value) / 100 : null)
                    }
                    placeholder="8"
                    className="pr-10 tabular-nums"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                    %
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </StepShell>
  );
}
