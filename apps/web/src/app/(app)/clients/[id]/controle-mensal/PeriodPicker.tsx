'use client';

import { useMemo, useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

export type PeriodPreset = 'tudo' | '1m' | '3m' | '6m' | '12m' | 'custom';

export interface PeriodFilter {
  preset: PeriodPreset;
  /** Competências (YYYYMM) — inclusivos. Quando preset != custom, derivadas de presetWindow. */
  from: number | null;
  to: number | null;
}

const PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: 'tudo',   label: 'Todo o período' },
  { id: '1m',     label: 'Último mês'     },
  { id: '3m',     label: 'Últimos 3 meses' },
  { id: '6m',     label: 'Últimos 6 meses' },
  { id: '12m',    label: 'Últimos 12 meses' },
  { id: 'custom', label: 'Personalizado'   },
];

const N_BY_PRESET: Record<Exclude<PeriodPreset, 'tudo' | 'custom'>, number> = {
  '1m': 1, '3m': 3, '6m': 6, '12m': 12,
};

/**
 * Calcula a janela [from, to] de competências (YYYYMM) com base no
 * preset e nas competências disponíveis nos rows. "Tudo" devolve null/null.
 */
export function resolvePeriod(filter: PeriodFilter, availableComps: number[]): PeriodFilter {
  if (filter.preset === 'tudo' || availableComps.length === 0) {
    return { preset: filter.preset, from: null, to: null };
  }
  if (filter.preset === 'custom') return filter;
  const ordered = [...new Set(availableComps)].sort((a, b) => a - b);
  const n = N_BY_PRESET[filter.preset];
  const slice = ordered.slice(-n);
  return { preset: filter.preset, from: slice[0] ?? null, to: slice[slice.length - 1] ?? null };
}

export function filterByPeriod<T extends { competencia: number | null }>(
  rows: T[],
  resolved: PeriodFilter,
): T[] {
  if (resolved.from == null && resolved.to == null) return rows;
  return rows.filter((r) => {
    const c = r.competencia ?? 0;
    if (resolved.from != null && c < resolved.from) return false;
    if (resolved.to != null && c > resolved.to) return false;
    return true;
  });
}

function compToYYYYMM(c: number): string {
  if (!c) return '';
  const s = String(c);
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}
function yyyymmToComp(s: string): number | null {
  if (!/^\d{4}-\d{2}$/.test(s)) return null;
  return Number(s.replace('-', ''));
}

interface Props {
  value: PeriodFilter;
  onChange: (next: PeriodFilter) => void;
  availableComps: number[];
}

export function PeriodPicker({ value, onChange, availableComps }: Props) {
  const [open, setOpen] = useState(false);

  const resolved = useMemo(() => resolvePeriod(value, availableComps), [value, availableComps]);
  const labelAtual = useMemo(() => {
    const base = PRESETS.find((p) => p.id === value.preset)?.label ?? 'Período';
    if (value.preset === 'tudo' || resolved.from == null) return base;
    return `${base} · ${compToYYYYMM(resolved.from)} → ${compToYYYYMM(resolved.to ?? resolved.from)}`;
  }, [value.preset, resolved.from, resolved.to]);

  const ordered = useMemo(() => [...new Set(availableComps)].sort((a, b) => a - b), [availableComps]);
  const minComp = ordered[0];
  const maxComp = ordered[ordered.length - 1];

  function selectPreset(p: PeriodPreset) {
    if (p === 'custom') {
      // Bootstrap personalizado com a janela atualmente vigente (ou tudo).
      onChange({
        preset: 'custom',
        from: resolved.from ?? minComp ?? null,
        to: resolved.to ?? maxComp ?? null,
      });
    } else {
      onChange({ preset: p, from: null, to: null });
      setOpen(false);
    }
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 shadow-soft dark:shadow-none"
      >
        <Calendar size={14} className="text-slate-400" />
        <span className="truncate max-w-[260px]">{labelAtual}</span>
        <ChevronDown size={14} className="text-slate-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 z-40 mt-1 w-72 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-1">
            <ul className="text-sm">
              {PRESETS.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => selectPreset(p.id)}
                    className={`block w-full text-left px-3 py-1.5 rounded-md ${
                      value.preset === p.id
                        ? 'bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300 font-medium'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {p.label}
                  </button>
                </li>
              ))}
            </ul>
            {value.preset === 'custom' && (
              <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-2 px-2 pb-2 space-y-2">
                <label className="block">
                  <span className="text-[11px] text-slate-500">De</span>
                  <input
                    type="month"
                    min={minComp ? compToYYYYMM(minComp) : undefined}
                    max={maxComp ? compToYYYYMM(maxComp) : undefined}
                    value={value.from ? compToYYYYMM(value.from) : ''}
                    onChange={(e) =>
                      onChange({ ...value, from: yyyymmToComp(e.target.value) ?? value.from })
                    }
                    className="mt-0.5 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-sm dark:text-slate-100"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] text-slate-500">Até</span>
                  <input
                    type="month"
                    min={minComp ? compToYYYYMM(minComp) : undefined}
                    max={maxComp ? compToYYYYMM(maxComp) : undefined}
                    value={value.to ? compToYYYYMM(value.to) : ''}
                    onChange={(e) =>
                      onChange({ ...value, to: yyyymmToComp(e.target.value) ?? value.to })
                    }
                    className="mt-0.5 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-sm dark:text-slate-100"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-full rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600"
                >
                  Aplicar
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
