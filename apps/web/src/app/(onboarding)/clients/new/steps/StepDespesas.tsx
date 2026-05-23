'use client';

import { useState } from 'react';
import {
  Home,
  UtensilsCrossed,
  Car,
  Heart,
  Gamepad2,
  Sparkles,
  Baby,
  GraduationCap,
  Plane,
  HandHeart,
  Plus,
  Receipt,
  Trash2,
} from 'lucide-react';
import { Input, Label } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { StepShell, EmptyState } from '../StepShell';
import type { WizardState } from '../Wizard';
import type { DraftExpense } from '../types';

interface Props {
  state: WizardState;
  update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
}

const categorias: { cat: DraftExpense['categoria']; label: string; icon: typeof Home; essencial: boolean }[] = [
  { cat: 'moradia', label: 'Moradia', icon: Home, essencial: true },
  { cat: 'alimentacao', label: 'Alimentação', icon: UtensilsCrossed, essencial: true },
  { cat: 'transporte', label: 'Transporte', icon: Car, essencial: true },
  { cat: 'saude', label: 'Saúde', icon: Heart, essencial: true },
  { cat: 'lazer', label: 'Lazer', icon: Gamepad2, essencial: false },
  { cat: 'servicos_dom', label: 'Serviços domésticos', icon: Sparkles, essencial: false },
  { cat: 'filhos', label: 'Filhos', icon: Baby, essencial: true },
  { cat: 'estudos', label: 'Estudos', icon: GraduationCap, essencial: true },
  { cat: 'viagens', label: 'Viagens', icon: Plane, essencial: false },
  { cat: 'cuidado_familia', label: 'Cuidado familiar', icon: HandHeart, essencial: true },
];

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export function StepDespesas({ state, update }: Props) {
  const [cat, setCat] = useState<DraftExpense['categoria']>('moradia');
  const [desc, setDesc] = useState('');
  const [valorMensal, setValorMensal] = useState('');

  function add() {
    const v = Number(valorMensal.replace(/\./g, '').replace(',', '.'));
    if (!desc.trim() || !Number.isFinite(v) || v <= 0) return;
    const meta = categorias.find((c) => c.cat === cat)!;
    const exp: DraftExpense = {
      id: crypto.randomUUID(),
      categoria: cat,
      descricao: desc.trim(),
      valor_mensal: v,
      idade_inicio: state.idade_aposentadoria ?? 60,
      idade_fim: state.expectativa_vida_anos,
      essencial: meta.essencial,
    };
    update('expenses', [...state.expenses, exp]);
    setDesc('');
    setValorMensal('');
  }

  function remove(id: string) {
    update('expenses', state.expenses.filter((e) => e.id !== id));
  }

  // ─── Pacotes prontos: criam vários itens de uma vez ───
  function makeExpense(
    cat: DraftExpense['categoria'],
    descricao: string,
    valor_mensal: number,
  ): DraftExpense {
    const idadeI = idadeFromBirth(state.data_nascimento) ?? 30;
    const meta = categorias.find((c) => c.cat === cat)!;
    return {
      id: crypto.randomUUID(),
      categoria: cat,
      descricao,
      valor_mensal,
      idade_inicio: idadeI,
      idade_fim: state.expectativa_vida_anos,
      essencial: meta.essencial,
    };
  }

  type Pacote = { label: string; detalhe: string; build: () => DraftExpense[] };
  const pacotes: Pacote[] = [
    {
      label: 'Pacote básico (família)',
      detalhe: 'Moradia · Alimentação · Transporte · Saúde · ~R$ 7k/mês',
      build: () => [
        makeExpense('moradia', 'Aluguel + condomínio + IPTU', 2500),
        makeExpense('alimentacao', 'Mercado + restaurantes', 2000),
        makeExpense('transporte', 'Combustível + transporte', 1000),
        makeExpense('saude', 'Plano de saúde', 1500),
      ],
    },
    {
      label: 'Pacote enxuto',
      detalhe: 'Vida mais simples · ~R$ 4k/mês',
      build: () => [
        makeExpense('moradia', 'Aluguel', 1500),
        makeExpense('alimentacao', 'Alimentação', 1200),
        makeExpense('transporte', 'Transporte', 500),
        makeExpense('saude', 'Saúde', 800),
      ],
    },
    {
      label: 'Pacote padrão classe alta',
      detalhe: 'Confortável · ~R$ 15k/mês',
      build: () => [
        makeExpense('moradia', 'Apartamento + condomínio + IPTU', 6000),
        makeExpense('alimentacao', 'Mercado + restaurantes', 3000),
        makeExpense('transporte', 'Carro próprio + gasolina', 1500),
        makeExpense('saude', 'Plano de saúde premium', 2500),
        makeExpense('lazer', 'Lazer e cultura', 2000),
      ],
    },
    {
      label: '+ Com filhos pequenos',
      detalhe: 'Soma escola + atividades · R$ 4.5k/mês extra',
      build: () => [
        makeExpense('filhos', 'Escola particular', 2500),
        makeExpense('filhos', 'Atividades extras + roupas', 1000),
        makeExpense('saude', 'Plano de saúde dos filhos', 1000),
      ],
    },
  ];

  const totalMensal = state.expenses.reduce((acc, e) => acc + e.valor_mensal, 0);

  return (
    <StepShell
      eyebrow="Passo 5"
      title="Quanto sai todo mês?"
      description="Aluguel, mercado, transporte, saúde, lazer… O sistema já anualiza pra você. Marque o que é essencial (não pode cortar) pra simulação saber se há gordura no orçamento."
    >
      <div className="space-y-6">
        {/* PACOTES */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-2">
            Pacotes prontos — toque pra adicionar tudo de uma vez
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {pacotes.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => update('expenses', [...state.expenses, ...p.build()])}
                className="text-left p-3 rounded-xl border border-slate-200 bg-white hover:border-brand-400 hover:bg-brand-50/30 transition-all"
              >
                <p className="text-xs font-semibold text-slate-900">{p.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{p.detalhe}</p>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Adicione um pacote e depois ajuste cada item se precisar. Pode somar mais de um (ex.:
            básico + filhos).
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft space-y-4">
          <div>
            <Label>Categoria</Label>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-5 gap-2">
              {categorias.map(({ cat: c, label, icon: Icon, essencial }) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCat(c)}
                  className={`p-3 rounded-xl border-2 transition-all text-left flex flex-col gap-2 ${
                    cat === c
                      ? 'border-brand-500 bg-brand-50/40 shadow-glow'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center ring-1 ring-inset ${
                      essencial ? 'bg-rose-50 text-rose-600 ring-rose-100' : 'bg-slate-100 text-slate-600 ring-slate-200'
                    }`}
                  >
                    <Icon size={14} />
                  </div>
                  <span className="text-xs font-semibold text-slate-800 leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-[1fr_220px_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="d_desc">Descrição</Label>
              <Input
                id="d_desc"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Ex: Aluguel apartamento"
                onKeyDown={(e) => e.key === 'Enter' && add()}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d_valor">Valor mensal (BRL)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">R$</span>
                <Input
                  id="d_valor"
                  inputMode="decimal"
                  value={valorMensal}
                  onChange={(e) => setValorMensal(e.target.value)}
                  placeholder="3.500"
                  className="pl-9 tabular-nums"
                  onKeyDown={(e) => e.key === 'Enter' && add()}
                />
              </div>
            </div>
            <Button type="button" onClick={add} disabled={!desc.trim() || !valorMensal} size="md">
              <Plus size={14} />
              Adicionar
            </Button>
          </div>
        </div>

        {state.expenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Liste as despesas mensais"
            description="Adicione moradia, alimentação, transporte e demais gastos fixos."
          />
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-soft overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                {state.expenses.length} {state.expenses.length === 1 ? 'despesa' : 'despesas'} cadastradas
              </p>
              <p className="text-sm font-bold tabular-nums text-slate-900">{brl(totalMensal)}/mês</p>
            </div>
            <ul className="divide-y divide-slate-100">
              {state.expenses.map((e) => {
                const meta = categorias.find((c) => c.cat === e.categoria)!;
                const Icon = meta.icon;
                return (
                  <li key={e.id} className="px-5 py-3 flex items-center gap-4 hover:bg-slate-50/60">
                    <div
                      className={`h-9 w-9 rounded-lg flex items-center justify-center ring-1 ring-inset shrink-0 ${
                        meta.essencial ? 'bg-rose-50 text-rose-600 ring-rose-100' : 'bg-slate-100 text-slate-600 ring-slate-200'
                      }`}
                    >
                      <Icon size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{e.descricao}</p>
                      <p className="text-xs text-slate-500">
                        {meta.label}
                        {e.essencial && <span className="ml-1.5 text-rose-500">· essencial</span>}
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums text-red-600">{brl(e.valor_mensal)}/mês</p>
                    <button
                      type="button"
                      onClick={() => remove(e.id)}
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

function idadeFromBirth(iso: string): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let idade = now.getUTCFullYear() - d.getUTCFullYear();
  if (
    now.getUTCMonth() < d.getUTCMonth() ||
    (now.getUTCMonth() === d.getUTCMonth() && now.getUTCDate() < d.getUTCDate())
  )
    idade -= 1;
  return idade;
}
