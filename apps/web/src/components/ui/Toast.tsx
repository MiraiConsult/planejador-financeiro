'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/cn';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

const BUS_EVENT = 'app:toast';
let nextId = 1;

function emit(kind: ToastKind, message: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(BUS_EVENT, { detail: { kind, message } }));
}

export const toast = {
  success: (msg: string) => emit('success', msg),
  error: (msg: string) => emit('error', msg),
  info: (msg: string) => emit('info', msg),
};

export function ToastViewport() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const onToast = (ev: Event) => {
      const e = ev as CustomEvent<{ kind: ToastKind; message: string }>;
      const t: ToastItem = { id: nextId++, kind: e.detail.kind, message: e.detail.message };
      setItems((prev) => [...prev, t].slice(-4));
      const timeout = e.detail.kind === 'error' ? 5000 : 2500;
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), timeout);
    };
    window.addEventListener(BUS_EVENT, onToast);
    return () => window.removeEventListener(BUS_EVENT, onToast);
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {items.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto rounded-lg border bg-white shadow-lg px-4 py-3 flex items-start gap-3 min-w-[280px] max-w-[400px]',
            'animate-slide-right',
            t.kind === 'success' && 'border-emerald-200',
            t.kind === 'error' && 'border-red-200',
            t.kind === 'info' && 'border-slate-200',
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
          <p className="flex-1 text-sm text-slate-900">{t.message}</p>
          <button
            type="button"
            onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
            className="text-slate-400 hover:text-slate-700 -mr-1"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
