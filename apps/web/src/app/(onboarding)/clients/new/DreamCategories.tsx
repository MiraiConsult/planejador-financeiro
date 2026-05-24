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
  Plus,
} from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { EditableEventRow } from './EditableEventRow';
import type { DraftEvent } from './types';

interface CategoryDef {
  key: string;
  label: string;
  icon: typeof Home;
  cor: string;
  /** match na descrição do evento pra agrupar */
  matchers: string[];
  /** template pra criar nova instância */
  build: (args: { offset: number; idadeAtual: number; expectativaVida: number }) => DraftEvent;
  positivo: boolean;
}

const dreamCategories: CategoryDef[] = [
  {
    key: 'casa',
    label: 'Casas',
    icon: Home,
    cor: 'bg-blue-50 text-blue-600 ring-blue-100',
    matchers: ['casa'],
    positivo: false,
    build: ({ offset, idadeAtual }) => ({
      id: crypto.randomUUID(),
      tipo: 'compra',
      descricao: `Casa ${offset + 1}`,
      valor: -600_000,
      padrao_recorrencia: 'unico',
      idade_inicio: idadeAtual + 5 + offset * 10,
      idade_fim: null,
      intervalo_anos: null,
      indexado_inflacao: true,
    }),
  },
  {
    key: 'viagem',
    label: 'Viagens',
    icon: Plane,
    cor: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    matchers: ['viagem'],
    positivo: false,
    build: ({ offset, idadeAtual }) => ({
      id: crypto.randomUUID(),
      tipo: 'viagem_pontual',
      descricao: `Viagem ${offset + 1}`,
      valor: -30_000,
      padrao_recorrencia: 'unico',
      idade_inicio: idadeAtual + 3 + offset * 4,
      idade_fim: null,
      intervalo_anos: null,
      indexado_inflacao: true,
    }),
  },
  {
    key: 'faculdade',
    label: 'Faculdades / educação',
    icon: GraduationCap,
    cor: 'bg-violet-50 text-violet-600 ring-violet-100',
    matchers: ['faculdade', 'educação', 'curso', 'mba'],
    positivo: false,
    build: ({ offset }) => ({
      id: crypto.randomUUID(),
      tipo: 'compra',
      descricao: `Faculdade ${offset + 1}`,
      valor: -200_000,
      padrao_recorrencia: 'unico',
      idade_inicio: 50 + offset * 4,
      idade_fim: null,
      intervalo_anos: null,
      indexado_inflacao: true,
    }),
  },
  {
    key: 'casamento',
    label: 'Casamentos',
    icon: PartyPopper,
    cor: 'bg-pink-50 text-pink-600 ring-pink-100',
    matchers: ['casamento'],
    positivo: false,
    build: ({ offset, idadeAtual }) => ({
      id: crypto.randomUUID(),
      tipo: 'compra',
      descricao: `Casamento ${offset + 1}`,
      valor: -80_000,
      padrao_recorrencia: 'unico',
      idade_inicio: idadeAtual + 2 + offset * 5,
      idade_fim: null,
      intervalo_anos: null,
      indexado_inflacao: true,
    }),
  },
  {
    key: 'carro',
    label: 'Carros',
    icon: Car,
    cor: 'bg-slate-100 text-slate-600 ring-slate-200',
    matchers: ['carro', 'veículo'],
    positivo: false,
    build: ({ offset, idadeAtual, expectativaVida }) => ({
      id: crypto.randomUUID(),
      tipo: 'compra',
      descricao: `Carro ${offset + 1}`,
      valor: -120_000,
      padrao_recorrencia: 'recorrente_espacado',
      idade_inicio: idadeAtual + 3 + offset * 2,
      idade_fim: expectativaVida,
      intervalo_anos: 8,
      indexado_inflacao: true,
    }),
  },
  {
    key: 'heranca',
    label: 'Heranças a receber',
    icon: Gift,
    cor: 'bg-amber-50 text-amber-600 ring-amber-100',
    matchers: ['herança', 'heranca'],
    positivo: true,
    build: ({ offset }) => ({
      id: crypto.randomUUID(),
      tipo: 'heranca',
      descricao: `Herança ${offset + 1}`,
      valor: 500_000,
      padrao_recorrencia: 'unico',
      idade_inicio: 55 + offset * 5,
      idade_fim: null,
      intervalo_anos: null,
      indexado_inflacao: true,
    }),
  },
  {
    key: 'outros',
    label: 'Outros sonhos',
    icon: Sparkles,
    cor: 'bg-brand-50 text-brand-600 ring-brand-100',
    matchers: [],
    positivo: false,
    build: ({ offset, idadeAtual }) => ({
      id: crypto.randomUUID(),
      tipo: 'sonho',
      descricao: `Sonho ${offset + 1}`,
      valor: -50_000,
      padrao_recorrencia: 'unico',
      idade_inicio: idadeAtual + 5 + offset * 3,
      idade_fim: null,
      intervalo_anos: null,
      indexado_inflacao: true,
    }),
  },
];

function categoryOf(ev: DraftEvent): CategoryDef {
  const desc = ev.descricao.toLowerCase();
  for (const cat of dreamCategories) {
    if (cat.matchers.some((m) => desc.startsWith(m))) return cat;
  }
  // fallback por tipo
  if (ev.tipo === 'heranca') return dreamCategories.find((c) => c.key === 'heranca')!;
  if (ev.tipo === 'viagem_pontual') return dreamCategories.find((c) => c.key === 'viagem')!;
  return dreamCategories.find((c) => c.key === 'outros')!;
}

const brl = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '+';
  return `${sign} ${abs.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}`;
};

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
  // agrupa eventos por categoria
  const grouped = useMemo(() => {
    const map = new Map<string, DraftEvent[]>();
    for (const ev of events) {
      const cat = categoryOf(ev);
      const arr = map.get(cat.key) ?? [];
      arr.push(ev);
      map.set(cat.key, arr);
    }
    return map;
  }, [events]);

  // estado de quais categorias estão expandidas
  const [open, setOpen] = useState<Set<string>>(() => {
    // categorias que já têm items começam abertas
    const s = new Set<string>();
    for (const [k, arr] of grouped) {
      if (arr.length > 0) s.add(k);
    }
    return s;
  });
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const groupsRef = useRef<Map<string, HTMLDivElement | null>>(new Map());

  function toggle(key: string) {
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function addToCategory(cat: CategoryDef) {
    const existing = grouped.get(cat.key)?.length ?? 0;
    const novo = cat.build({ offset: existing, idadeAtual, expectativaVida });
    onChange([...events, novo]);
    setOpen((s) => new Set(s).add(cat.key));
    setLastAddedId(novo.id);
    toast.success(`${cat.label.replace(/s$/, '')} adicionada`);
    requestAnimationFrame(() => {
      groupsRef.current.get(cat.key)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    setTimeout(() => setLastAddedId((c) => (c === novo.id ? null : c)), 1600);
  }

  function updateEvent(updated: DraftEvent) {
    onChange(events.map((e) => (e.id === updated.id ? updated : e)));
  }

  function removeEvent(id: string) {
    onChange(events.filter((e) => e.id !== id));
  }

  return (
    <div className="space-y-3">
      {dreamCategories.map((cat) => {
        const items = grouped.get(cat.key) ?? [];
        const isOpen = open.has(cat.key);
        const total = items.reduce((acc, e) => acc + e.valor, 0);
        const positivo = total >= 0;
        const Icon = cat.icon;
        return (
          <div
            key={cat.key}
            ref={(el) => {
              groupsRef.current.set(cat.key, el);
            }}
            className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggle(cat.key)}
              className="w-full px-5 py-3 flex items-center gap-4 hover:bg-slate-50/60 text-left"
            >
              <ChevronDown
                size={13}
                className={`text-slate-300 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ring-1 ring-inset shrink-0 ${cat.cor}`}>
                <Icon size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate">
                  {cat.label}
                  {items.length > 0 && (
                    <span className="ml-2 text-xs font-medium text-slate-400">
                      ({items.length})
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  {items.length === 0
                    ? 'Nenhum cadastrado · toque pra adicionar'
                    : items.length === 1
                      ? '1 item'
                      : `${items.length} itens`}
                </p>
              </div>
              {items.length > 0 && (
                <p className={`text-sm font-semibold tabular-nums shrink-0 ${positivo ? 'text-emerald-600' : 'text-red-600'}`}>
                  {positivo ? '+' : '−'} R$ {brlK(total)}
                </p>
              )}
            </button>

            {isOpen && (
              <div className="border-t border-slate-100">
                {items.length === 0 ? (
                  <div className="px-5 py-6 text-center text-xs text-slate-400">
                    Nada por aqui ainda. Use o botão abaixo pra adicionar a primeira.
                  </div>
                ) : (
                  <ul>
                    {items.map((ev) => (
                      <EditableEventRow
                        key={ev.id}
                        ev={ev}
                        idadeAtual={idadeAtual}
                        expectativaVida={expectativaVida}
                        defaultExpanded={ev.id === lastAddedId}
                        highlight={ev.id === lastAddedId}
                        onUpdate={updateEvent}
                        onRemove={() => removeEvent(ev.id)}
                        onDuplicate={() => {
                          const copy: DraftEvent = {
                            ...ev,
                            id: crypto.randomUUID(),
                            descricao: `${ev.descricao} (cópia)`,
                          };
                          onChange([...events, copy]);
                          setLastAddedId(copy.id);
                          setTimeout(
                            () => setLastAddedId((c) => (c === copy.id ? null : c)),
                            1600,
                          );
                        }}
                      />
                    ))}
                  </ul>
                )}

                <div className="px-5 py-3 bg-slate-50/40 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => addToCategory(cat)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-slate-300 text-xs font-medium text-brand-600 hover:bg-white hover:border-brand-400 transition-colors"
                  >
                    <Plus size={13} />
                    Adicionar {items.length === 0 ? `primeira ${cat.label.replace(/s$/, '').toLowerCase()}` : `outra ${cat.label.replace(/s$/, '').toLowerCase()}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Silencia warning de brl/brlK importados mas só usados condicionalmente.
void brl;
