'use client';

import { useState } from 'react';
import {
  Building2,
  Plus,
  Banknote,
  Home,
  Car,
  Trees,
  Gift,
  Trash2,
  TrendingDown,
  CreditCard,
} from 'lucide-react';
import { Input, Label } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { StepShell, EmptyState } from '../StepShell';
import type { WizardState } from '../Wizard';
import type { DraftAsset, DraftLiability } from '../types';

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

const tiposPassivo: { tipo: string; label: string }[] = [
  { tipo: 'financiamento_imovel', label: 'Financiamento imóvel' },
  { tipo: 'financiamento_veiculo', label: 'Financiamento veículo' },
  { tipo: 'emprestimo_pessoal', label: 'Empréstimo pessoal' },
  { tipo: 'consignado', label: 'Consignado' },
  { tipo: 'cartao_credito', label: 'Cartão de crédito' },
  { tipo: 'outro', label: 'Outro' },
];

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export function StepPatrimonio({ state, update }: Props) {
  const [tipo, setTipo] = useState<DraftAsset['tipo']>('financeiro_liquido');
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');

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

  function removeAsset(id: string) {
    update('assets', state.assets.filter((a) => a.id !== id));
  }

  // ─── Passivos ───
  const [pTipo, setPTipo] = useState<string>('financiamento_imovel');
  const [pNome, setPNome] = useState('');
  const [pSaldo, setPSaldo] = useState('');
  const [pParcela, setPParcela] = useState('');
  const [pJuros, setPJuros] = useState('');

  function addLiability() {
    const saldo = Number(pSaldo.replace(/\./g, '').replace(',', '.'));
    const parcela = Number(pParcela.replace(/\./g, '').replace(',', '.'));
    if (!pNome.trim() || !Number.isFinite(saldo) || saldo <= 0 || !Number.isFinite(parcela) || parcela <= 0) return;
    const juros = pJuros ? Number(pJuros) / 100 : null;
    const idadeAtual = idadeFromBirth(state.data_nascimento) ?? 30;
    // Estima quantos anos até quitar: saldo/parcela_anual + pequena margem se há juros
    const parcAnual = parcela * 12;
    const anosAprox = Math.min(50, Math.ceil(saldo / Math.max(parcAnual, 1)) + (juros ? 5 : 0));
    const liability: DraftLiability = {
      id: crypto.randomUUID(),
      nome: pNome.trim(),
      tipo: pTipo,
      saldo_atual: saldo,
      juros_aa: juros,
      parcela_mensal: parcela,
      idade_inicio: idadeAtual,
      idade_fim: Math.min(state.expectativa_vida_anos, idadeAtual + anosAprox),
    };
    update('liabilities', [...state.liabilities, liability]);
    setPNome('');
    setPSaldo('');
    setPParcela('');
    setPJuros('');
  }

  function removeLiability(id: string) {
    update('liabilities', state.liabilities.filter((l) => l.id !== id));
  }

  const totalAtivos = itens.reduce((acc, a) => acc + a.valor, 0);
  const totalPassivos = state.liabilities.reduce((acc, l) => acc + l.saldo_atual, 0);
  const patrimonioLiquido = totalAtivos - totalPassivos;

  return (
    <StepShell
      eyebrow="Passo 3"
      title="Onde você está hoje?"
      description="Conta tudo que o cliente tem (aplicações, imóvel, carro…) e o que deve (financiamentos, empréstimos). Sem certeza? Coloca uma estimativa — dá pra ajustar depois."
    >
      <div className="space-y-8">
        {/* RESUMO LÍQUIDO */}
        {(itens.length > 0 || state.liabilities.length > 0) && (
          <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50/60 to-sky-50/40 p-5">
            <p className="text-[10px] uppercase tracking-widest text-brand-700 font-semibold mb-1">
              Patrimônio líquido estimado
            </p>
            <p
              className={`text-3xl font-bold tabular-nums ${patrimonioLiquido < 0 ? 'text-red-600' : 'text-slate-900'}`}
            >
              {brl(patrimonioLiquido)}
            </p>
            <p className="text-xs text-slate-600 mt-1.5">
              {brl(totalAtivos)} em ativos − {brl(totalPassivos)} em dívidas
            </p>
          </div>
        )}

        {/* ─── ATIVOS ─── */}
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Building2 size={16} className="text-emerald-600" />
              O que tem
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Aplicações, imóveis, veículos, herança recebida.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft space-y-4">
            <div>
              <Label>Tipo</Label>
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

          {itens.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Nada cadastrado ainda"
              description="Use o formulário acima ou pule esse passo se o cliente não tiver ativos."
            />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-soft overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  {itens.length} {itens.length === 1 ? 'item' : 'itens'}
                </p>
                <p className="text-sm font-bold tabular-nums text-emerald-600">+ {brl(totalAtivos)}</p>
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
                        onClick={() => removeAsset(a.id)}
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
        </section>

        {/* ─── PASSIVOS ─── */}
        <section className="space-y-4 pt-4 border-t border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <TrendingDown size={16} className="text-orange-600" />
              O que deve
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Financiamentos, empréstimos, cartão. Se não tem dívida, pode pular.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft space-y-4">
            <div>
              <Label>Tipo da dívida</Label>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {tiposPassivo.map(({ tipo: t, label }) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPTipo(t)}
                    className={`p-3 rounded-xl border-2 transition-all text-left flex flex-col gap-2 ${
                      pTipo === t
                        ? 'border-orange-500 bg-orange-50/40 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center ring-1 ring-inset bg-orange-50 text-orange-600 ring-orange-100">
                      <CreditCard size={14} />
                    </div>
                    <span className="text-xs font-semibold text-slate-800 leading-tight">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="liab_nome">Nome</Label>
                <Input
                  id="liab_nome"
                  value={pNome}
                  onChange={(e) => setPNome(e.target.value)}
                  placeholder="Ex: Financiamento apartamento"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="liab_saldo">Saldo devedor hoje</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                    R$
                  </span>
                  <Input
                    id="liab_saldo"
                    inputMode="decimal"
                    value={pSaldo}
                    onChange={(e) => setPSaldo(e.target.value)}
                    placeholder="250.000"
                    className="pl-9 tabular-nums"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="liab_parc">Parcela mensal</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                    R$
                  </span>
                  <Input
                    id="liab_parc"
                    inputMode="decimal"
                    value={pParcela}
                    onChange={(e) => setPParcela(e.target.value)}
                    placeholder="2.300"
                    className="pl-9 tabular-nums"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="liab_juros">Juros a.a. (opcional)</Label>
                <div className="relative">
                  <Input
                    id="liab_juros"
                    type="number"
                    step="0.1"
                    value={pJuros}
                    onChange={(e) => setPJuros(e.target.value)}
                    placeholder="10"
                    className="pr-8 tabular-nums"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                    %
                  </span>
                </div>
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <Button
                  type="button"
                  onClick={addLiability}
                  disabled={!pNome.trim() || !pSaldo || !pParcela}
                  size="md"
                  variant="outline"
                >
                  <Plus size={14} />
                  Adicionar dívida
                </Button>
              </div>
            </div>
          </div>

          {state.liabilities.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-soft overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  {state.liabilities.length} {state.liabilities.length === 1 ? 'dívida' : 'dívidas'}
                </p>
                <p className="text-sm font-bold tabular-nums text-orange-600">− {brl(totalPassivos)}</p>
              </div>
              <ul className="divide-y divide-slate-100">
                {state.liabilities.map((l) => {
                  const meta = tiposPassivo.find((x) => x.tipo === l.tipo);
                  return (
                    <li key={l.id} className="px-5 py-3 flex items-center gap-4 hover:bg-slate-50/60 transition-colors">
                      <div className="h-9 w-9 rounded-lg flex items-center justify-center ring-1 ring-inset shrink-0 bg-orange-50 text-orange-600 ring-orange-100">
                        <CreditCard size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{l.nome}</p>
                        <p className="text-xs text-slate-500">
                          {meta?.label ?? l.tipo} · {brl(l.parcela_mensal)}/mês
                        </p>
                      </div>
                      <p className="text-sm font-semibold tabular-nums text-orange-600">{brl(l.saldo_atual)}</p>
                      <button
                        type="button"
                        onClick={() => removeLiability(l.id)}
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
        </section>
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
