'use client';

import { useRef, useState } from 'react';
import { Briefcase, Building, Plus, TrendingUp } from 'lucide-react';
import { Input, Label } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { StepShell, EmptyState } from '../StepShell';
import { CurrencyInput, idadeFromBirth } from '../helpers';
import { EditableAssetFluxoRow } from '../EditableRows';
import { toast } from '@/components/ui/Toast';
import type { WizardState } from '../Wizard';
import type { DraftAsset } from '../types';

interface Props {
  state: WizardState;
  update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
}

const tiposFluxo: { tipo: DraftAsset['tipo']; label: string; icon: typeof Briefcase; cor: string; defaultFim: 'aposentadoria' | 'expectativa' }[] = [
  { tipo: 'salario', label: 'Salário', icon: Briefcase, cor: 'bg-brand-50 text-brand-600 ring-brand-100', defaultFim: 'aposentadoria' },
  { tipo: 'aluguel', label: 'Aluguel / arrendamento', icon: Building, cor: 'bg-emerald-50 text-emerald-600 ring-emerald-100', defaultFim: 'expectativa' },
  { tipo: 'outro', label: 'Outra renda', icon: TrendingUp, cor: 'bg-slate-100 dark:bg-slate-800 text-slate-600 ring-slate-200', defaultFim: 'expectativa' },
];

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export function StepReceitas({ state, update }: Props) {
  const [tipo, setTipo] = useState<DraftAsset['tipo']>('salario');
  const [nome, setNome] = useState('');
  const [valorAnual, setValorAnual] = useState<number>(0);
  const listRef = useRef<HTMLDivElement>(null);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  const itens = state.assets.filter((a) => a.natureza === 'fluxo');

  function pushAsset(asset: DraftAsset, message?: string) {
    update('assets', [...state.assets, asset]);
    setLastAddedId(asset.id);
    if (message) toast.success(message);
    requestAnimationFrame(() => {
      listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    setTimeout(() => setLastAddedId((curr) => (curr === asset.id ? null : curr)), 1600);
  }

  function add() {
    if (!nome.trim() || valorAnual <= 0) return;
    const meta = tiposFluxo.find((t) => t.tipo === tipo)!;
    const idadeFim =
      meta.defaultFim === 'aposentadoria'
        ? state.idade_aposentadoria ?? state.expectativa_vida_anos
        : state.expectativa_vida_anos;
    const asset: DraftAsset = {
      id: crypto.randomUUID(),
      nome: nome.trim(),
      tipo,
      natureza: 'fluxo',
      valor: valorAnual,
      idade_inicio: idadeFromBirth(state.data_nascimento) ?? 30,
      idade_fim: idadeFim,
      indexado_inflacao: true,
    };
    pushAsset(asset, `Adicionado: ${asset.nome}`);
    setNome('');
    setValorAnual(0);
  }

  function remove(id: string) {
    update('assets', state.assets.filter((a) => a.id !== id));
  }

  const total = itens.reduce((acc, a) => acc + a.valor, 0);

  // ─── Quick-picks: receitas comuns ───
  const quickPicks: { label: string; detalhe: string; build: () => DraftAsset }[] = [
    {
      label: 'Salário CLT',
      detalhe: 'R$ 8.000/mês até aposentar',
      build: () => makeAsset('salario', 'Salário', 8_000 * 12, 'aposentadoria'),
    },
    {
      label: 'Salário executivo',
      detalhe: 'R$ 20.000/mês até aposentar',
      build: () => makeAsset('salario', 'Salário', 20_000 * 12, 'aposentadoria'),
    },
    {
      label: 'Aposentadoria INSS',
      detalhe: 'R$ 3.000/mês a partir dos 65',
      build: () => {
        const idadeApos = state.idade_aposentadoria ?? 65;
        return {
          id: crypto.randomUUID(),
          nome: 'Aposentadoria INSS',
          tipo: 'salario',
          natureza: 'fluxo',
          valor: 3_000 * 12,
          idade_inicio: idadeApos,
          idade_fim: state.expectativa_vida_anos,
          indexado_inflacao: true,
        };
      },
    },
    {
      label: 'Aluguel recebido',
      detalhe: 'R$ 3.500/mês vitalício',
      build: () => makeAsset('aluguel', 'Aluguel recebido', 3_500 * 12, 'expectativa'),
    },
  ];

  function makeAsset(
    tipo: DraftAsset['tipo'],
    nome: string,
    valor: number,
    fim: 'aposentadoria' | 'expectativa',
  ): DraftAsset {
    const idadeAtual = idadeFromBirth(state.data_nascimento) ?? 30;
    const idadeFim =
      fim === 'aposentadoria'
        ? state.idade_aposentadoria ?? state.expectativa_vida_anos
        : state.expectativa_vida_anos;
    return {
      id: crypto.randomUUID(),
      nome,
      tipo,
      natureza: 'fluxo',
      valor,
      idade_inicio: idadeAtual,
      idade_fim: idadeFim,
      indexado_inflacao: true,
    };
  }

  return (
    <StepShell
      eyebrow="Passo 4"
      title="Quanto entra hoje?"
      description="Salário, aluguel recebido, aposentadoria — tudo que entra no caixa de forma recorrente. Sempre o valor ANUAL (multiplica por 12 se for mensal). Pode pular se nenhuma se aplica."
    >
      <div className="space-y-6">
        {/* QUICK-PICKS */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-2">
            Modelos de receita — toque pra usar
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
            {quickPicks.map((pick, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => pushAsset(pick.build(), `Adicionado: ${pick.label}`)}
                className="text-left p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-brand-400 hover:bg-brand-50/30 transition-all"
              >
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{pick.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{pick.detalhe}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-soft dark:shadow-none space-y-4">
          <div>
            <Label>Tipo de receita</Label>
            <div className="mt-2 grid sm:grid-cols-3 gap-2">
              {tiposFluxo.map(({ tipo: t, label, icon: Icon, cor }) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={`p-3 rounded-xl border-2 transition-all text-left flex flex-col gap-2 ${
                    tipo === t
                      ? 'border-brand-500 bg-brand-50/40 shadow-glow'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ring-1 ring-inset ${cor}`}>
                    <Icon size={14} />
                  </div>
                  <span className="text-xs font-semibold text-slate-800">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-[1fr_220px_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="r_nome">Descrição</Label>
              <Input
                id="r_nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Salário CLT"
                onKeyDown={(e) => e.key === 'Enter' && add()}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r_valor">Valor anual (BRL)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">R$</span>
                <CurrencyInput
                  id="r_valor"
                  value={valorAnual}
                  onChangeNumber={(n) => setValorAnual(n)}
                  placeholder="120.000"
                  className="pl-9 tabular-nums"
                  onKeyDown={(e) => e.key === 'Enter' && add()}
                />
              </div>
            </div>
            <Button type="button" onClick={add} disabled={!nome.trim() || !valorAnual} size="md">
              <Plus size={14} />
              Adicionar
            </Button>
          </div>
        </div>

        {itens.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="Sem receitas recorrentes?"
            description="Pode avançar — também é comum em planos pós-aposentadoria."
          />
        ) : (
          <div ref={listRef} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-soft dark:shadow-none overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                {itens.length} {itens.length === 1 ? 'receita' : 'receitas'} · {brl(total)}/ano
              </p>
              <p className="text-[11px] text-slate-400">toque pra editar</p>
            </div>
            <ul>
              {itens.map((a) => {
                const meta = tiposFluxo.find((x) => x.tipo === a.tipo) ?? tiposFluxo[2]!;
                const Icon = meta.icon;
                return (
                  <EditableAssetFluxoRow
                    key={a.id}
                    a={a}
                    icon={Icon}
                    cor={meta.cor}
                    expectativaVida={state.expectativa_vida_anos}
                    idadeAtual={idadeFromBirth(state.data_nascimento) ?? 30}
                    defaultExpanded={a.id === lastAddedId}
                    highlight={a.id === lastAddedId}
                    onUpdate={(updated) =>
                      update(
                        'assets',
                        state.assets.map((x) => (x.id === a.id ? updated : x)),
                      )
                    }
                    onRemove={() => remove(a.id)}
                    onDuplicate={() => {
                      const copy: DraftAsset = {
                        ...a,
                        id: crypto.randomUUID(),
                        nome: `${a.nome} (cópia)`,
                      };
                      const idx = state.assets.findIndex((x) => x.id === a.id);
                      const next = [...state.assets];
                      next.splice(idx + 1, 0, copy);
                      update('assets', next);
                      setLastAddedId(copy.id);
                      setTimeout(
                        () => setLastAddedId((curr) => (curr === copy.id ? null : curr)),
                        1600,
                      );
                    }}
                  />
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </StepShell>
  );
}
