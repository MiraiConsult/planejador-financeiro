'use client';

import { User, Wallet, TrendingUp, Receipt, CalendarHeart, CheckCircle2 } from 'lucide-react';
import { StepShell } from '../StepShell';
import type { WizardState } from '../Wizard';

interface Props {
  state: WizardState;
}

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

const perfilLabels: Record<string, string> = {
  conservador: 'Conservador',
  moderado: 'Moderado',
  arrojado: 'Arrojado',
  custom: 'Personalizado',
};

export function StepRevisao({ state }: Props) {
  const patrimonioTotal = state.assets
    .filter((a) => a.natureza === 'estoque')
    .reduce((acc, a) => acc + a.valor, 0);
  const receitasTotal = state.assets
    .filter((a) => a.natureza === 'fluxo')
    .reduce((acc, a) => acc + a.valor, 0);
  const despesasMensal = state.expenses.reduce((acc, e) => acc + e.valor_mensal, 0);

  return (
    <StepShell
      eyebrow="Passo 6 — Revisão"
      title="Tudo certo para criar?"
      description="Confira os dados abaixo. Você poderá editar tudo depois pela tela do cliente."
    >
      <div className="space-y-4">
        {/* Resumo card */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-brand-50/40 via-white to-sky-50/40 p-6 shadow-soft">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-300 to-transparent" />
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-500 to-sky-600 text-white text-lg font-bold flex items-center justify-center shrink-0 shadow-glow ring-1 ring-inset ring-white/20">
              {state.nome_completo
                ? state.nome_completo
                    .split(' ')
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join('')
                    .toUpperCase()
                : '?'}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {state.nome_completo || '— sem nome —'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Perfil <strong className="text-slate-700">{perfilLabels[state.perfil_carteira]}</strong>
                {' · '}expectativa {state.expectativa_vida_anos} anos
                {state.idade_aposentadoria && ` · aposenta aos ${state.idade_aposentadoria}`}
              </p>
            </div>
          </div>
        </div>

        <ReviewSection
          icon={User}
          title="Dados pessoais"
          items={[
            { label: 'Nome', value: state.nome_completo || '—' },
            { label: 'Nascimento', value: state.data_nascimento ? new Date(state.data_nascimento).toLocaleDateString('pt-BR') : '—' },
            { label: 'Expectativa de vida', value: `${state.expectativa_vida_anos} anos` },
            { label: 'Perfil', value: perfilLabels[state.perfil_carteira] ?? '—' },
          ]}
        />

        <ReviewSection
          icon={Wallet}
          title={`Patrimônio (${state.assets.filter((a) => a.natureza === 'estoque').length} ativos)`}
          items={[
            { label: 'Total', value: brl(patrimonioTotal), highlight: true },
            ...state.assets
              .filter((a) => a.natureza === 'estoque')
              .slice(0, 3)
              .map((a) => ({ label: a.nome, value: brl(a.valor) })),
            ...(state.assets.filter((a) => a.natureza === 'estoque').length > 3
              ? [{ label: `+ ${state.assets.filter((a) => a.natureza === 'estoque').length - 3} mais`, value: '' }]
              : []),
          ]}
        />

        <ReviewSection
          icon={TrendingUp}
          title={`Receitas (${state.assets.filter((a) => a.natureza === 'fluxo').length})`}
          items={[
            { label: 'Total anual', value: brl(receitasTotal), highlight: true },
            ...state.assets
              .filter((a) => a.natureza === 'fluxo')
              .map((a) => ({ label: a.nome, value: `${brl(a.valor)}/ano` })),
          ]}
        />

        <ReviewSection
          icon={Receipt}
          title={`Despesas (${state.expenses.length})`}
          items={[
            { label: 'Total mensal', value: brl(despesasMensal), highlight: true },
            { label: 'Equivalente anual', value: brl(despesasMensal * 12) },
          ]}
        />

        <ReviewSection
          icon={CalendarHeart}
          title={`Eventos (${state.events.length})`}
          items={
            state.events.length === 0
              ? [{ label: '—', value: 'nenhum cadastrado' }]
              : state.events.map((e) => ({
                  label: e.descricao,
                  value: `${brl(e.valor)} · idade ${e.idade_inicio}`,
                }))
          }
        />

        <div className="flex items-start gap-3 rounded-xl bg-emerald-50 border border-emerald-200/60 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            Ao criar, o sistema gera automaticamente um cenário <strong>base</strong>, vincula as premissas
            padrão e roda a simulação. Você pode adicionar cenários alternativos depois.
          </div>
        </div>
      </div>
    </StepShell>
  );
}

function ReviewSection({
  icon: Icon,
  title,
  items,
}: {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  items: { label: string; value: string; highlight?: boolean }[];
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
        <Icon size={14} />
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-600">{title}</h3>
      </div>
      <dl className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <dt className="text-slate-500">{item.label}</dt>
            <dd
              className={`tabular-nums ${
                item.highlight ? 'font-bold text-slate-900' : 'text-slate-700'
              }`}
            >
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
