'use client';

import { useMemo, useRef, useState } from 'react';
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
  Tag,
  X,
} from 'lucide-react';
import { Input, Label } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { StepShell, EmptyState } from '../StepShell';
import { CurrencyInput, idadeFromBirth } from '../helpers';
import { EditableExpenseRow } from '../EditableRows';
import { toast } from '@/components/ui/Toast';
import type { WizardState } from '../Wizard';
import type { DraftExpense } from '../types';

interface Props {
  state: WizardState;
  update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
}

type CategoriaMeta = {
  cat: string;
  label: string;
  icon: typeof Home;
  essencial: boolean;
};

const categorias: CategoriaMeta[] = [
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

function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

function fallbackMeta(cat: string): CategoriaMeta {
  // Categoria desconhecida (ex.: vinda do banco, do refine, ou de outro
  // dispositivo): exibe a string capitalizada com ícone neutro.
  const label = cat
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { cat, label, icon: Tag, essencial: false };
}

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export function StepDespesas({ state, update }: Props) {
  const [cat, setCat] = useState<string>('moradia');
  const [desc, setDesc] = useState('');
  const [valorMensal, setValorMensal] = useState<number>(0);
  const listRef = useRef<HTMLDivElement>(null);
  const [lastAddedIds, setLastAddedIds] = useState<Set<string>>(new Set());

  const [customCats, setCustomCats] = useState<CategoriaMeta[]>([]);
  const [addingCat, setAddingCat] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatEssencial, setNewCatEssencial] = useState(false);

  // Categorias visíveis = built-in + customs criados + qualquer categoria
  // já usada por alguma despesa que não está em nenhum dos dois (cobre o
  // caso de despesa importada/refinada com categoria desconhecida).
  const allCategorias = useMemo<CategoriaMeta[]>(() => {
    const known = new Map<string, CategoriaMeta>();
    [...categorias, ...customCats].forEach((c) => known.set(c.cat, c));
    state.expenses.forEach((e) => {
      if (!known.has(e.categoria)) known.set(e.categoria, fallbackMeta(e.categoria));
    });
    return [...known.values()];
  }, [customCats, state.expenses]);

  function metaFor(catId: string): CategoriaMeta {
    return allCategorias.find((c) => c.cat === catId) ?? fallbackMeta(catId);
  }

  function createCategoria() {
    const labelTrim = newCatLabel.trim();
    if (!labelTrim) {
      toast.error('Digite um nome');
      return;
    }
    let slug = slugify(labelTrim) || `custom_${Date.now()}`;
    // Evita colisão com built-in ou outro custom
    const existing = new Set(allCategorias.map((c) => c.cat));
    if (existing.has(slug)) {
      let i = 2;
      while (existing.has(`${slug}_${i}`)) i++;
      slug = `${slug}_${i}`;
    }
    const novo: CategoriaMeta = {
      cat: slug,
      label: labelTrim,
      icon: Tag,
      essencial: newCatEssencial,
    };
    setCustomCats((prev) => [...prev, novo]);
    setCat(slug);
    setAddingCat(false);
    setNewCatLabel('');
    setNewCatEssencial(false);
    toast.success(`Categoria "${labelTrim}" criada`);
  }

  function pushExpenses(items: DraftExpense[], message?: string) {
    update('expenses', [...state.expenses, ...items]);
    const ids = new Set(items.map((i) => i.id));
    setLastAddedIds(ids);
    if (message) toast.success(message);
    requestAnimationFrame(() => {
      listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    setTimeout(() => setLastAddedIds(new Set()), 1600);
  }

  function add() {
    if (!desc.trim() || valorMensal <= 0) return;
    const meta = metaFor(cat);
    const idadeI = idadeFromBirth(state.data_nascimento) ?? 30;
    const exp: DraftExpense = {
      id: crypto.randomUUID(),
      categoria: cat,
      descricao: desc.trim(),
      valor_mensal: valorMensal,
      idade_inicio: idadeI,
      idade_fim: state.expectativa_vida_anos,
      essencial: meta.essencial,
    };
    pushExpenses([exp], `Adicionado: ${exp.descricao}`);
    setDesc('');
    setValorMensal(0);
  }

  function remove(id: string) {
    update('expenses', state.expenses.filter((e) => e.id !== id));
  }

  // ─── Pacotes prontos: criam vários itens de uma vez ───
  function makeExpense(
    cat: string,
    descricao: string,
    valor_mensal: number,
  ): DraftExpense {
    const idadeI = idadeFromBirth(state.data_nascimento) ?? 30;
    const meta = metaFor(cat);
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
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400 mb-2">
            Pacotes prontos — toque pra adicionar tudo de uma vez
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {pacotes.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => pushExpenses(p.build(), `${p.label} adicionado`)}
                className="text-left p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-brand-400 dark:hover:border-brand-600 hover:bg-brand-50/30 dark:hover:bg-brand-950/20 transition-all"
              >
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{p.label}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{p.detalhe}</p>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
            Adicione um pacote e depois ajuste cada item se precisar. Pode somar mais de um (ex.:
            básico + filhos).
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-soft dark:shadow-none space-y-4">
          <div>
            <Label>Categoria</Label>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-5 gap-2">
              {allCategorias.map(({ cat: c, label, icon: Icon, essencial }) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCat(c)}
                  className={`p-3 rounded-xl border-2 transition-all text-left flex flex-col gap-2 ${
                    cat === c
                      ? 'border-brand-500 bg-brand-50/40 dark:bg-brand-950/30 shadow-glow'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center ring-1 ring-inset ${
                      essencial ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 ring-rose-100 dark:ring-rose-800/50' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 ring-slate-200 dark:ring-slate-700'
                    }`}
                  >
                    <Icon size={14} />
                  </div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">{label}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAddingCat(true)}
                className="p-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-brand-400 dark:hover:border-brand-500 hover:bg-brand-50/30 dark:hover:bg-brand-950/20 transition-all text-left flex flex-col gap-2"
              >
                <div className="h-8 w-8 rounded-lg flex items-center justify-center ring-1 ring-inset bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 ring-brand-100 dark:ring-brand-800/50">
                  <Plus size={14} />
                </div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-tight">Nova categoria</span>
              </button>
            </div>
            {addingCat && (
              <div className="mt-3 rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50/40 dark:bg-brand-950/20 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
                    Nova categoria de despesa
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setAddingCat(false);
                      setNewCatLabel('');
                      setNewCatEssencial(false);
                    }}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    aria-label="Cancelar"
                  >
                    <X size={14} />
                  </button>
                </div>
                <Input
                  autoFocus
                  value={newCatLabel}
                  onChange={(e) => setNewCatLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      createCategoria();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setAddingCat(false);
                    }
                  }}
                  placeholder="Ex.: Carro novo, Casa de praia, Pet, Hobby…"
                  maxLength={60}
                />
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={newCatEssencial}
                    onChange={(e) => setNewCatEssencial(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-600"
                  />
                  Essencial (não pode cortar na simulação)
                </label>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAddingCat(false);
                      setNewCatLabel('');
                      setNewCatEssencial(false);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="button" size="sm" onClick={createCategoria} disabled={!newCatLabel.trim()}>
                    <Plus size={13} />
                    Criar
                  </Button>
                </div>
              </div>
            )}
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
                <CurrencyInput
                  id="d_valor"
                  value={valorMensal}
                  onChangeNumber={(n) => setValorMensal(n)}
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
          <div ref={listRef} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-soft dark:shadow-none overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {state.expenses.length} {state.expenses.length === 1 ? 'despesa' : 'despesas'} · {brl(totalMensal)}/mês
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">toque pra editar</p>
            </div>
            <ul>
              {state.expenses.map((e) => {
                const meta = metaFor(e.categoria);
                const Icon = meta.icon;
                const cor = meta.essencial
                  ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 ring-rose-100 dark:ring-rose-800/50'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 ring-slate-200 dark:ring-slate-700';
                return (
                  <EditableExpenseRow
                    key={e.id}
                    e={e}
                    icon={Icon}
                    cor={cor}
                    label={meta.label}
                    expectativaVida={state.expectativa_vida_anos}
                    idadeAtual={idadeFromBirth(state.data_nascimento) ?? 30}
                    defaultExpanded={lastAddedIds.has(e.id) && lastAddedIds.size === 1}
                    highlight={lastAddedIds.has(e.id)}
                    onUpdate={(updated) =>
                      update(
                        'expenses',
                        state.expenses.map((x) => (x.id === e.id ? updated : x)),
                      )
                    }
                    onRemove={() => remove(e.id)}
                    onDuplicate={() => {
                      const copy: DraftExpense = {
                        ...e,
                        id: crypto.randomUUID(),
                        descricao: `${e.descricao} (cópia)`,
                      };
                      const idx = state.expenses.findIndex((x) => x.id === e.id);
                      const next = [...state.expenses];
                      next.splice(idx + 1, 0, copy);
                      update('expenses', next);
                      setLastAddedIds(new Set([copy.id]));
                      setTimeout(() => setLastAddedIds(new Set()), 1600);
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
