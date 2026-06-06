'use client';

import { Brain, Heart, Eye, Sparkles, Anchor } from 'lucide-react';
import { Input, Label } from '@/components/ui/Input';
import { StepShell, RadioCard } from '../StepShell';
import type { WizardState } from '../Wizard';
import type { PerfilSubjetivo } from '../types';

interface Props {
  state: WizardState;
  update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
}

export function StepDadosPessoais({ state, update }: Props) {
  const isCustom = state.perfil_carteira === 'custom';
  return (
    <StepShell
      eyebrow="Passo 1"
      title="Conta pra gente — quem é o cliente?"
      description="Primeiro os dados básicos (nome, data, horizonte). Depois 5 perguntas pra entender o lado humano — sem elas, a simulação fica só com números."
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
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
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
            <div className="grid sm:grid-cols-2 gap-4 p-5 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 animate-fade-up">
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

        {/* ─── Perfil subjetivo: respostas livres pra IA usar no Sonhos ─── */}
        <PerfilSubjetivoSection
          value={state.perfil_subjetivo}
          onChange={(p) => update('perfil_subjetivo', p)}
        />
      </div>
    </StepShell>
  );
}

const reflexoes: {
  key: keyof PerfilSubjetivo;
  icon: typeof Eye;
  cor: string;
  pergunta: string;
  hint: string;
  placeholder: string;
}[] = [
  {
    key: 'visao_30_anos',
    icon: Eye,
    cor: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 ring-blue-100 dark:ring-blue-800/50',
    pergunta: 'Feche os olhos. Em 30 anos, onde você gostaria de estar?',
    hint: 'Não pense em números — fale em sensações, lugares, pessoas ao redor, rotina.',
    placeholder:
      'Ex: Acordo num lugar tranquilo, sem boletos urgentes, vejo meus filhos crescidos e independentes...',
  },
  {
    key: 'medo_principal',
    icon: Anchor,
    cor: 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 ring-red-100 dark:ring-red-800/50',
    pergunta: 'Qual é o seu maior medo em relação a dinheiro?',
    hint: 'Perder tudo, depender dos outros, nunca conseguir parar de trabalhar, faltar pra família?',
    placeholder: 'Ex: Meu maior medo é depender dos filhos quando velho...',
  },
  {
    key: 'significado_dinheiro',
    icon: Heart,
    cor: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 ring-amber-100 dark:ring-amber-800/50',
    pergunta: 'O que dinheiro significa pra você?',
    hint: 'Segurança? Liberdade? Status? Ferramenta pra ajudar outros? Os 4?',
    placeholder: 'Ex: Pra mim dinheiro é liberdade pra escolher como gastar meu tempo...',
  },
  {
    key: 'referencia_dinheiro',
    icon: Brain,
    cor: 'bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 ring-violet-100 dark:ring-violet-800/50',
    pergunta: 'Tem alguma referência (pai, mãe, mentor) que te marcou em relação a dinheiro?',
    hint: 'Como aprendeu sobre dinheiro? Há padrões da família que quer repetir ou evitar?',
    placeholder: 'Ex: Meu pai trabalhou demais e morreu cedo sem aproveitar. Não quero isso...',
  },
  {
    key: 'legado',
    icon: Sparkles,
    cor: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 ring-emerald-100 dark:ring-emerald-800/50',
    pergunta: 'O que você sente que precisa fazer antes de morrer?',
    hint: 'Coisas, experiências, marcas que quer deixar. Pode ser pequeno ou grande.',
    placeholder: 'Ex: Quero conhecer 30 países, deixar casa pra cada filho, criar uma fundação...',
  },
];

function PerfilSubjetivoSection({
  value,
  onChange,
}: {
  value: PerfilSubjetivo;
  onChange: (v: PerfilSubjetivo) => void;
}) {
  return (
    <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-700">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
          Perfil subjetivo
        </p>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-1">
          Antes dos números, o porquê
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
          Cinco perguntas sem resposta certa. Quanto mais aberto for, melhor a simulação dos sonhos
          vai entender o que importa pro cliente.{' '}
          <span className="text-slate-400 dark:text-slate-500">
            Tudo opcional — pode pular qualquer uma.
          </span>
        </p>
      </div>

      <div className="space-y-4">
        {reflexoes.map(({ key, icon: Icon, cor, pergunta, hint, placeholder }) => (
          <div key={key} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-2">
            <div className="flex items-start gap-3">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ring-1 ring-inset shrink-0 ${cor}`}>
                <Icon size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{pergunta}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{hint}</p>
              </div>
            </div>
            <textarea
              value={value[key] ?? ''}
              onChange={(e) => onChange({ ...value, [key]: e.target.value })}
              placeholder={placeholder}
              rows={3}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors resize-y"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
