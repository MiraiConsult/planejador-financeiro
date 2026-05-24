'use client';

import { useRef, useState } from 'react';
import {
  Building2,
  Plus,
  Banknote,
  Home,
  Car,
  Trees,
  Gift,
  TrendingDown,
  CreditCard,
} from 'lucide-react';
import { Input, Label } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { StepShell, EmptyState } from '../StepShell';
import { CurrencyInput, idadeFromBirth } from '../helpers';
import { EditableAssetEstoqueRow, EditableLiabilityRow } from '../EditableRows';
import { toast } from '@/components/ui/Toast';
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
  const [valor, setValor] = useState<number>(0);
  const ativosRef = useRef<HTMLDivElement>(null);
  const passivosRef = useRef<HTMLDivElement>(null);

  const itens = state.assets.filter((a) => a.natureza === 'estoque');

  function addAsset() {
    if (!nome.trim() || valor <= 0) return;
    const idadeAtual = idadeFromBirth(state.data_nascimento) ?? 30;
    const asset: DraftAsset = {
      id: crypto.randomUUID(),
      nome: nome.trim(),
      tipo,
      natureza: 'estoque',
      valor,
      idade_inicio: idadeAtual,
      idade_fim: state.expectativa_vida_anos,
      indexado_inflacao: true,
    };
    update('assets', [...state.assets, asset]);
    toast.success(`Adicionado: ${asset.nome}`);
    requestAnimationFrame(() => {
      ativosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    setNome('');
    setValor(0);
  }

  function removeAsset(id: string) {
    update('assets', state.assets.filter((a) => a.id !== id));
  }

  // ─── Passivos ───
  const [pTipo, setPTipo] = useState<string>('financiamento_imovel');
  const [pNome, setPNome] = useState('');
  const [pSaldo, setPSaldo] = useState<number>(0);
  const [pParcela, setPParcela] = useState<number>(0);
  const [pJuros, setPJuros] = useState('');

  function addLiability() {
    if (!pNome.trim() || pSaldo <= 0 || pParcela <= 0) return;
    const juros = pJuros ? Number(pJuros) / 100 : null;
    const idadeAtual = idadeFromBirth(state.data_nascimento) ?? 30;
    // Estima quantos anos até quitar: saldo/parcela_anual + pequena margem se há juros
    const parcAnual = pParcela * 12;
    const anosAprox = Math.min(50, Math.ceil(pSaldo / Math.max(parcAnual, 1)) + (juros ? 5 : 0));
    const liability: DraftLiability = {
      id: crypto.randomUUID(),
      nome: pNome.trim(),
      tipo: pTipo,
      saldo_atual: pSaldo,
      juros_aa: juros,
      parcela_mensal: pParcela,
      idade_inicio: idadeAtual,
      idade_fim: Math.min(state.expectativa_vida_anos, idadeAtual + anosAprox),
    };
    update('liabilities', [...state.liabilities, liability]);
    toast.success(`Adicionado: ${liability.nome}`);
    requestAnimationFrame(() => {
      passivosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    setPNome('');
    setPSaldo(0);
    setPParcela(0);
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
                  <CurrencyInput
                    id="asset_valor"
                    value={valor}
                    onChangeNumber={(n) => setValor(n)}
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
            <div ref={ativosRef} className="rounded-2xl border border-slate-200 bg-white shadow-soft overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  {itens.length} {itens.length === 1 ? 'item' : 'itens'} · toque pra editar
                </p>
                <p className="text-sm font-bold tabular-nums text-emerald-600">+ {brl(totalAtivos)}</p>
              </div>
              <ul>
                {itens.map((a) => {
                  const meta = tiposEstoque.find((x) => x.tipo === a.tipo)!;
                  return (
                    <EditableAssetEstoqueRow
                      key={a.id}
                      a={a}
                      icon={meta.icon}
                      cor={meta.cor}
                      expectativaVida={state.expectativa_vida_anos}
                      idadeAtual={idadeFromBirth(state.data_nascimento) ?? 30}
                      onUpdate={(updated) =>
                        update(
                          'assets',
                          state.assets.map((x) => (x.id === a.id ? updated : x)),
                        )
                      }
                      onRemove={() => removeAsset(a.id)}
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
                      }}
                    />
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
                  <CurrencyInput
                    id="liab_saldo"
                    value={pSaldo}
                    onChangeNumber={(n) => setPSaldo(n)}
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
                  <CurrencyInput
                    id="liab_parc"
                    value={pParcela}
                    onChangeNumber={(n) => setPParcela(n)}
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
            <div ref={passivosRef} className="rounded-2xl border border-slate-200 bg-white shadow-soft overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  {state.liabilities.length} {state.liabilities.length === 1 ? 'dívida' : 'dívidas'} · toque pra editar
                </p>
                <p className="text-sm font-bold tabular-nums text-orange-600">− {brl(totalPassivos)}</p>
              </div>
              <ul>
                {state.liabilities.map((l) => {
                  const meta = tiposPassivo.find((x) => x.tipo === l.tipo);
                  return (
                    <EditableLiabilityRow
                      key={l.id}
                      l={l}
                      label={meta?.label ?? l.tipo}
                      expectativaVida={state.expectativa_vida_anos}
                      idadeAtual={idadeFromBirth(state.data_nascimento) ?? 30}
                      onUpdate={(updated) =>
                        update(
                          'liabilities',
                          state.liabilities.map((x) => (x.id === l.id ? updated : x)),
                        )
                      }
                      onRemove={() => removeLiability(l.id)}
                      onDuplicate={() => {
                        const copy: DraftLiability = {
                          ...l,
                          id: crypto.randomUUID(),
                          nome: `${l.nome} (cópia)`,
                        };
                        const idx = state.liabilities.findIndex((x) => x.id === l.id);
                        const next = [...state.liabilities];
                        next.splice(idx + 1, 0, copy);
                        update('liabilities', next);
                      }}
                    />
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
