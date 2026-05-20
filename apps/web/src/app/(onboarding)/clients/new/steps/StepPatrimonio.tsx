'use client';

import { useState } from 'react';
import { Building2, Plus, Banknote, Home, Car, Trees, Gift, Trash2 } from 'lucide-react';
import { Input, Label } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { StepShell, EmptyState } from '../StepShell';
import type { WizardState } from '../Wizard';
import type { DraftAsset } from '../types';

interface Props {
  state: WizardState;
  update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
}

const tiposEstoque: { tipo: DraftAsset['tipo']; label: string; icon: typeof Banknote; cor: string }[] = [
  { tipo: 'financeiro_liquido', label: 'Aplicação financeira', icon: Banknote, cor: 'bg-emerald-50 text-emerald-600 ring-emerald-100' },
  { tipo: 'imovel', label: 'Imóvel', icon: Home, cor: 'bg-blue-50 text-blue-600 ring-blue-100' },
  { tipo: 'terreno', label: 'Terreno', icon: Trees, cor: 'bg-amber-50 text-amber-600 ring-amber-100' },
  { tipo: 'carro', label: 'Carro / veículo', icon: Car, cor: 'bg-slate-100 text-slate-600 ring-slate-200' },
  { tipo: 'heranca_recebida', label: 'Herança', icon: Gift, cor: 'bg-rose-50 text-rose-600 ring-rose-100' },
  { tipo: 'outro', label: 'Outro', icon: Building2, cor: 'bg-slate-100 text-slate-600 ring-slate-200' },
];

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export function StepPatrimonio({ state, update }: Props) {
  const [tipo, setTipo] = useState<DraftAsset['tipo']>('financeiro_liquido');
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');

  // só ativos de estoque nesse step (financeiros + ilíquidos)
  const itens = state.assets.filter((a) => a.natureza === 'estoque');

  function addAsset() {
    const v = Number(valor.replace(/\./g, '').replace(',', '.'));
    if (!nome.trim() || !Number.isFinite(v) || v <= 0) return;
    const asset: DraftAsset = {
      id: crypto.randomUUID(),
      nome: nome.trim(),
      tipo,
      natureza: 'estoque',
      valor: v,
      idade_inicio: state.idade_aposentadoria ?? 60,
      idade_fim: state.expectativa_vida_anos,
      indexado_inflacao: true,
    };
    update('assets', [...state.assets, asset]);
    setNome('');
    setValor('');
  }

  function remove(id: string) {
    update('assets', state.assets.filter((a) => a.id !== id));
  }

  const total = itens.reduce((acc, a) => acc + a.valor, 0);

  return (
    <StepShell
      eyebrow="Passo 2"
      title="Qual é o patrimônio hoje?"
      description="Liste tudo que o cliente possui: aplicações financeiras, imóveis, terrenos, carros, herança. Apenas os financeiros geram retorno; os demais entram na simulação como patrimônio ilíquido."
    >
      <div className="space-y-6">
        {/* Form de adicionar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft space-y-4">
          <div>
            <Label>Tipo do ativo</Label>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {tiposEstoque.map(({ tipo: t, label, icon: Icon, cor }) => (
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
                  <span className="text-xs font-semibold text-slate-800 leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-[1fr_220px_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="asset_nome">Nome</Label>
              <Input
                id="asset_nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Aplicação no banco X"
                onKeyDown={(e) => e.key === 'Enter' && addAsset()}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="asset_valor">Valor (BRL)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                  R$
                </span>
                <Input
                  id="asset_valor"
                  inputMode="decimal"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="100.000"
                  className="pl-9 tabular-nums"
                  onKeyDown={(e) => e.key === 'Enter' && addAsset()}
                />
              </div>
            </div>
            <Button type="button" onClick={addAsset} disabled={!nome.trim() || !valor} size="md">
              <Plus size={14} />
              Adicionar
            </Button>
          </div>
        </div>

        {/* Lista */}
        {itens.length === 0 ? (
          <EmptyState
            icon={Wallet2}
            title="Comece adicionando os ativos"
            description="Use o formulário acima. Você pode adicionar quantos quiser e voltar depois para ajustar."
          />
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-soft overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                {itens.length} {itens.length === 1 ? 'ativo' : 'ativos'} cadastrados
              </p>
              <p className="text-sm font-bold tabular-nums text-slate-900">{brl(total)}</p>
            </div>
            <ul className="divide-y divide-slate-100">
              {itens.map((a) => {
                const meta = tiposEstoque.find((x) => x.tipo === a.tipo)!;
                const Icon = meta.icon;
                return (
                  <li key={a.id} className="px-5 py-3 flex items-center gap-4 hover:bg-slate-50/60 transition-colors">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center ring-1 ring-inset shrink-0 ${meta.cor}`}>
                      <Icon size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{a.nome}</p>
                      <p className="text-xs text-slate-500">{meta.label}</p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums text-slate-900">{brl(a.valor)}</p>
                    <button
                      type="button"
                      onClick={() => remove(a.id)}
                      className="h-7 w-7 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center"
                      title="Remover"
                    >
                      <Trash2 size={13} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <p className="text-xs text-slate-400">
          Não tem certeza de algum valor? Adicione uma estimativa — você poderá editar depois.
        </p>
      </div>
    </StepShell>
  );
}

function Wallet2({ size, className }: { size?: number; className?: string }) {
  return <Building2 size={size} className={className} />;
}
