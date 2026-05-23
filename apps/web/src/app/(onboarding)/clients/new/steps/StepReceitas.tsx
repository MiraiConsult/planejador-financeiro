'use client';

import { useState } from 'react';
import { Briefcase, Building, Plus, TrendingUp, Trash2 } from 'lucide-react';
import { Input, Label } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { StepShell, EmptyState } from '../StepShell';
import type { WizardState } from '../Wizard';
import type { DraftAsset } from '../types';

interface Props {
  state: WizardState;
  update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
}

const tiposFluxo: { tipo: DraftAsset['tipo']; label: string; icon: typeof Briefcase; cor: string; defaultFim: 'aposentadoria' | 'expectativa' }[] = [
  { tipo: 'salario', label: 'Salário', icon: Briefcase, cor: 'bg-brand-50 text-brand-600 ring-brand-100', defaultFim: 'aposentadoria' },
  { tipo: 'aluguel', label: 'Aluguel / arrendamento', icon: Building, cor: 'bg-emerald-50 text-emerald-600 ring-emerald-100', defaultFim: 'expectativa' },
  { tipo: 'outro', label: 'Outra renda', icon: TrendingUp, cor: 'bg-slate-100 text-slate-600 ring-slate-200', defaultFim: 'expectativa' },
];

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export function StepReceitas({ state, update }: Props) {
  const [tipo, setTipo] = useState<DraftAsset['tipo']>('salario');
  const [nome, setNome] = useState('');
  const [valorAnual, setValorAnual] = useState('');

  const itens = state.assets.filter((a) => a.natureza === 'fluxo');

  function add() {
    const v = Number(valorAnual.replace(/\./g, '').replace(',', '.'));
    if (!nome.trim() || !Number.isFinite(v) || v <= 0) return;
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
      valor: v,
      idade_inicio: state.idade_aposentadoria ? Math.min(state.idade_aposentadoria - 5, 60) : 60,
      idade_fim: idadeFim,
      indexado_inflacao: true,
    };
    update('assets', [...state.assets, asset]);
    setNome('');
    setValorAnual('');
  }

  function remove(id: string) {
    update('assets', state.assets.filter((a) => a.id !== id));
  }

  const total = itens.reduce((acc, a) => acc + a.valor, 0);

  return (
    <StepShell
      eyebrow="Passo 4"
      title="Quanto entra hoje?"
      description="Salário, aluguel recebido, aposentadoria — tudo que entra no caixa de forma recorrente. Sempre o valor ANUAL (multiplica por 12 se for mensal). Pode pular se nenhuma se aplica."
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft space-y-4">
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
                      : 'border-slate-200 hover:border-slate-300'
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
                <Input
                  id="r_valor"
                  inputMode="decimal"
                  value={valorAnual}
                  onChange={(e) => setValorAnual(e.target.value)}
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
          <div className="rounded-2xl border border-slate-200 bg-white shadow-soft overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                {itens.length} {itens.length === 1 ? 'receita' : 'receitas'} cadastradas · {brl(total)}/ano
              </p>
            </div>
            <ul className="divide-y divide-slate-100">
              {itens.map((a) => {
                const meta = tiposFluxo.find((x) => x.tipo === a.tipo) ?? tiposFluxo[2]!;
                const Icon = meta.icon;
                return (
                  <li key={a.id} className="px-5 py-3 flex items-center gap-4 hover:bg-slate-50/60">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center ring-1 ring-inset shrink-0 ${meta.cor}`}>
                      <Icon size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{a.nome}</p>
                      <p className="text-xs text-slate-500">
                        {meta.label} · idades {a.idade_inicio}–{a.idade_fim}
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums text-emerald-600">{brl(a.valor)}/ano</p>
                    <button
                      type="button"
                      onClick={() => remove(a.id)}
                      className="h-7 w-7 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center"
                    >
                      <Trash2 size={13} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </StepShell>
  );
}
