'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, Plus } from 'lucide-react';

export interface ComboItem {
  id: string;
  nome: string;
}

interface Props {
  value: string | null;
  items: ComboItem[];
  onSelect: (id: string | null) => void;
  onCreate?: (nome: string) => Promise<ComboItem | null>;
  placeholder?: string;
  disabled?: boolean;
  createLabel?: (q: string) => string;
  /** cor da borda esquerda (categoria) */
  accent?: string;
}

export function ComboboxCreate({
  value,
  items,
  onSelect,
  onCreate,
  placeholder = 'Selecionar…',
  disabled = false,
  createLabel = (q) => `Criar "${q}"`,
  accent,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = items.find((i) => i.id === value) ?? null;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? items.filter((i) => i.nome.toLowerCase().includes(q))
    : items;
  const exactExists = items.some((i) => i.nome.trim().toLowerCase() === q);
  const canCreate = !!onCreate && q.length > 0 && !exactExists;

  async function handleCreate() {
    if (!onCreate || !query.trim()) return;
    setCreating(true);
    const novo = await onCreate(query.trim());
    setCreating(false);
    if (novo) {
      onSelect(novo.id);
      setOpen(false);
      setQuery('');
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-1 text-xs rounded-md border border-slate-200 bg-white px-2 py-1 text-left hover:border-slate-300 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
        style={accent ? { borderLeftColor: accent, borderLeftWidth: 3 } : undefined}
      >
        <span className={selected ? 'text-slate-900 truncate' : 'text-slate-400 truncate'}>
          {selected?.nome ?? placeholder}
        </span>
        <ChevronDown size={12} className="text-slate-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-56 max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="sticky top-0 bg-white border-b border-slate-100 p-1.5">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canCreate) {
                  e.preventDefault();
                  void handleCreate();
                }
              }}
              placeholder="Buscar ou criar…"
              className="w-full text-xs rounded border border-slate-200 px-2 py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
            />
          </div>
          <div className="py-1">
            {value && (
              <button
                type="button"
                onClick={() => { onSelect(null); setOpen(false); setQuery(''); }}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-50"
              >
                — limpar —
              </button>
            )}
            {filtered.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => { onSelect(i.id); setOpen(false); setQuery(''); }}
                className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                <span className="truncate">{i.nome}</span>
                {i.id === value && <Check size={12} className="text-brand-600 shrink-0" />}
              </button>
            ))}
            {filtered.length === 0 && !canCreate && (
              <p className="px-3 py-2 text-xs text-slate-400">Nada encontrado</p>
            )}
            {canCreate && (
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50 border-t border-slate-100"
              >
                {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                {createLabel(query.trim())}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
