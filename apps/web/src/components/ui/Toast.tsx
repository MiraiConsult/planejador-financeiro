'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/cn';

type ToastKind = 'success' | 'error' | 'info';

interface ToastAction {
  label: string;
  onClick: () => void | Promise<void>;
}

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  action?: ToastAction;
  /** ms; default depende do kind */
  duration?: number;
}

interface ToastDetail {
  kind: ToastKind;
  message: string;
  action?: ToastAction;
  duration?: number;
}

const BUS_EVENT = 'app:toast';
let nextId = 1;

function emit(detail: ToastDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(BUS_EVENT, { detail }));
}

export const toast = {
  success: (msg: string) => emit({ kind: 'success', message: msg }),
  error: (msg: string) => emit({ kind: 'error', message: msg }),
  info: (msg: string) => emit({ kind: 'info', message: msg }),
  /**
   * Toast com botão de ação. Usado pra confirmar ações reversíveis
   * (ex.: "Excluído · Desfazer" por 5 segundos).
   */
  withAction: (
    msg: string,
    action: ToastAction,
    opts?: { kind?: ToastKind; durationMs?: number },
  ) =>
    emit({
      kind: opts?.kind ?? 'info',
      message: msg,
      action,
      duration: opts?.durationMs ?? 5000,
    }),
};

export function ToastViewport() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const onToast = (ev: Event) => {
      const e = ev as CustomEvent<ToastDetail>;
      const t: ToastItem = {
        id: nextId++,
        kind: e.detail.kind,
        message: e.detail.message,
        ...(e.detail.action ? { action: e.detail.action } : {}),
        ...(e.detail.duration ? { duration: e.detail.duration } : {}),
      };
      setItems((prev) => [...prev, t].slice(-4));
      const timeout = t.duration ?? (t.kind === 'error' ? 5000 : 2500);
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), timeout);
    };
    window.addEventListener(BUS_EVENT, onToast);
    return () => window.removeEventListener(BUS_EVENT, onToast);
  }, []);

  if (items.length === 0) return null;

  function dismiss(id: number) {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {items.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto rounded-lg border bg-white shadow-lg px-4 py-3 flex items-start gap-3 min-w-[280px] max-w-[400px]',
            'animate-slide-right dark:bg-slate-800',
            t.kind === 'success' && 'border-emerald-200 dark:border-emerald-800',
            t.kind === 'error' && 'border-red-200 dark:border-red-800',
            t.kind === 'info' && 'border-slate-200 dark:border-slate-700',
          )}
        >
          <div
            className={cn(
              'shrink-0 mt-0.5',
              t.kind === 'success' && 'text-emerald-600',
              t.kind === 'error' && 'text-red-600',
              t.kind === 'info' && 'text-slate-600',
            )}
          >
            {t.kind === 'success' && <CheckCircle2 size={18} />}
            {t.kind === 'error' && <AlertCircle size={18} />}
            {t.kind === 'info' && <Info size={18} />}
          </div>
          <p className="flex-1 text-sm text-slate-900 dark:text-slate-100">{t.message}</p>
          {t.action && (
            <button
              type="button"
              onClick={async () => {
                dismiss(t.id);
                await t.action!.onClick();
              }}
              className="shrink-0 text-xs font-semibold text-brand-600 hover:text-brand-700 px-2 py-1 rounded hover:bg-brand-50"
            >
              {t.action.label}
            </button>
          )}
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className="text-slate-400 hover:text-slate-700 -mr-1"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
