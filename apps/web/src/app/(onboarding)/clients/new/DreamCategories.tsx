'use client';

import { useState, useMemo, useRef } from 'react';
import {
  Home,
  Plane,
  GraduationCap,
  PartyPopper,
  Car,
  Gift,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { DraggableLineChart } from './DraggableLineChart';
import { formatBRL } from './helpers';
import type { DraftEvent } from './types';

interface CategoryDef {
  key: string;
  label: string;
  singularLabel: string;
  icon: typeof Home;
  cor: string;
  tipo: DraftEvent['tipo'];
  positivo: boolean;
  defaultValor: number;
}

const dreamCategories: CategoryDef[] = [
  {
    key: 'casa',
    label: 'Casas',
    singularLabel: 'casa',
    icon: Home,
    cor: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 ring-blue-100 dark:ring-blue-800/50',
    tipo: 'compra',
    positivo: false,
    defaultValor: -600_000,
  },
  {
    key: 'viagem',
    label: 'Viagens',
    singularLabel: 'viagem',
    icon: Plane,
    cor: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 ring-emerald-100 dark:ring-emerald-800/50',
    tipo: 'viagem_pontual',
    positivo: false,
    defaultValor: -30_000,
  },
  {
    key: 'faculdade',
    label: 'Faculdades / educação',
    singularLabel: 'faculdade',
    icon: GraduationCap,
    cor: 'bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 ring-violet-100 dark:ring-violet-800/50',
    tipo: 'compra',
    positivo: false,
    defaultValor: -200_000,
  },
  {
    key: 'casamento',
    label: 'Casamentos',
    singularLabel: 'casamento',
    icon: PartyPopper,
    cor: 'bg-pink-50 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400 ring-pink-100 dark:ring-pink-800/50',
    tipo: 'compra',
    positivo: false,
    defaultValor: -80_000,
  },
  {
    key: 'carro',
    label: 'Carros',
    singularLabel: 'carro',
    icon: Car,
    cor: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 ring-slate-200 dark:ring-slate-700',
    tipo: 'compra',
    positivo: false,
    defaultValor: -120_000,
  },
  {
    key: 'heranca',
    label: 'Heranças a receber',
    singularLabel: 'herança',
    icon: Gift,
    cor: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 ring-amber-100 dark:ring-amber-800/50',
    tipo: 'heranca',
    positivo: true,
    defaultValor: 500_000,
  },
  {
    key: 'outros',
    label: 'Outros sonhos',
    singularLabel: 'sonho',
    icon: Sparkles,
    cor: 'bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 ring-brand-100 dark:ring-brand-800/50',
    tipo: 'sonho',
    positivo: false,
    defaultValor: -50_000,
  },
];

function categoryKeyOf(ev: DraftEvent): string {
  const desc = ev.descricao.toLowerCase();
  for (const cat of dreamCategories) {
    if (cat.key === 'outros') continue;
    if (desc.startsWith(cat.key) || desc.includes(cat.key)) return cat.key;
  }
  if (ev.tipo === 'heranca') return 'heranca';
  if (ev.tipo === 'viagem_pontual') return 'viagem';
  return 'outros';
}

const brlK = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(abs / 1_000).toFixed(0)}k`;
  return `${abs.toFixed(0)}`;
};

interface Props {
  events: DraftEvent[];
  onChange: (next: DraftEvent[]) => void;
  idadeAtual: number;
  expectativaVida: number;
}

export function DreamCategories({ events, onChange, idadeAtual, expectativaVida }: Props) {
  const [open, setOpen] = useState<Set<string>>(new Set());

  function toggle(key: string) {
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function ensureEvent(cat: CategoryDef): DraftEvent {
    const existing = events.find((e) => categoryKeyOf(e) === cat.key);
    if (existing) return existing;
    const ev: DraftEvent = {
      id: crypto.randomUUID(),
      tipo: cat.tipo,
      descricao: cat.label,
      valor: 0,
      padrao_recorrencia: 'recorrente_anual',
      idade_inicio: idadeAtual,
      idade_fim: expectativaVida,
      intervalo_anos: null,
      indexado_inflacao: true,
      overrides: {},
    };
    onChange([...events, ev]);
    return ev;
  }

  function getEventForCategory(catKey: string): DraftEvent | undefined {
    return events.find((e) => categoryKeyOf(e) === catKey);
  }

  function updateEvent(id: string, patch: Partial<DraftEvent>) {
    onChange(events.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function getActiveYears(ev: DraftEvent | undefined): { count: number; total: number } {
    if (!ev) return { count: 0, total: 0 };
    const ovr = ev.overrides ?? {};
    let count = 0;
    let total = 0;
    for (const [, v] of Object.entries(ovr)) {
      if (v !== 0) {
        count++;
        total += v;
      }
    }
    if (ev.valor !== 0 && count === 0) {
      const inicio = ev.idade_inicio;
      const fim = ev.idade_fim ?? expectativaVida;
      count = fim - inicio + 1;
      total = ev.valor * count;
    }
    return { count, total };
  }

  return (
    <div className="space-y-3">
      {dreamCategories.map((cat) => {
        const ev = getEventForCategory(cat.key);
        const { count, total } = getActiveYears(ev);
        const isOpen = open.has(cat.key);
        const Icon = cat.icon;
        const positivo = total >= 0;
        return (
          <div
            key={cat.key}
            className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-soft dark:shadow-none overflow-hidden"
          >
            <button
              type="button"
              onClick={() => {
                if (!isOpen) ensureEvent(cat);
                toggle(cat.key);
              }}
              className="w-full px-5 py-3 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors"
            >
              <ChevronDown
                size={13}
                className={`text-slate-300 dark:text-slate-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ring-1 ring-inset shrink-0 ${cat.cor}`}>
                <Icon size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {cat.label}
                  {count > 0 && (
                    <span className="ml-2 text-xs font-medium text-slate-400 dark:text-slate-500">
                      ({count} {count === 1 ? cat.singularLabel : cat.label.toLowerCase()})
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {count === 0
                    ? 'Toque pra abrir o gráfico e arrastar nos anos que quiser'
                    : `Arraste pra cima = ${cat.singularLabel} naquele ano · arraste pra baixo = remove`}
                </p>
              </div>
              {count > 0 && (
                <p className={`text-sm font-semibold tabular-nums shrink-0 ${positivo ? 'text-emerald-600' : 'text-red-600'}`}>
                  {positivo ? '+' : '−'} R$ {brlK(Math.abs(total))}
                </p>
              )}
            </button>

            {isOpen && ev && (
              <div className="border-t border-slate-100 dark:border-slate-800 p-4">
                <CategoryChart
                  ev={ev}
                  cat={cat}
                  idadeAtual={idadeAtual}
                  expectativaVida={expectativaVida}
                  onChangePoint={(idade, valor) => {
                    const overrides = { ...(ev.overrides ?? {}) };
                    if (valor === 0) {
                      delete overrides[String(idade)];
                    } else {
                      overrides[String(idade)] = valor;
                    }
                    updateEvent(ev.id, { overrides, valor: 0 });
                  }}
                  onReset={() => {
                    updateEvent(ev.id, { overrides: {}, valor: 0 });
                    toast.info('Gráfico resetado');
                  }}
                />
                <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500 text-center">
                  Cada ponto que sobe = uma {cat.singularLabel} naquele ano · valor = quanto custa ·
                  arraste pra zero = remove
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CategoryChart({
  ev,
  cat,
  idadeAtual,
  expectativaVida,
  onChangePoint,
  onReset,
}: {
  ev: DraftEvent;
  cat: CategoryDef;
  idadeAtual: number;
  expectativaVida: number;
  onChangePoint: (idade: number, valor: number) => void;
  onReset: () => void;
}) {
  const data = useMemo(() => {
    const pts: { idade: number; valor: number }[] = [];
    for (let i = idadeAtual; i <= expectativaVida; i++) {
      const ovr = ev.overrides?.[String(i)];
      pts.push({ idade: i, valor: ovr ?? ev.valor });
    }
    return pts;
  }, [ev, idadeAtual, expectativaVida]);

  const hasOverrides = Object.keys(ev.overrides ?? {}).length > 0 || ev.valor !== 0;

  return (
    <DraggableLineChart
      data={data}
      color={cat.positivo ? '#10b981' : '#ef4444'}
      onChangePoint={onChangePoint}
      onReset={hasOverrides ? onReset : undefined}
      resetLabel="Limpar tudo"
    />
  );
}
