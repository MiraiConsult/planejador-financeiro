'use client';

import { Check, AlertCircle, Loader2 } from 'lucide-react';
import type { SaveStatus } from './useAutoSave';

function formatTime(d: Date): string {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function SaveStatusIndicator({
  status,
  lastSavedAt,
  error,
}: {
  status: SaveStatus;
  lastSavedAt: Date | null;
  error: string | null;
}) {
  if (status === 'saving' || status === 'dirty') {
    return (
      <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
        <Loader2 size={11} className="animate-spin" />
        Salvando…
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="text-[11px] text-red-600 flex items-center gap-1.5" title={error ?? ''}>
        <AlertCircle size={11} />
        Falha — vou tentar de novo
      </span>
    );
  }
  if (status === 'saved' && lastSavedAt) {
    return (
      <span className="text-[11px] text-emerald-600 flex items-center gap-1.5">
        <Check size={11} />
        Salvo às {formatTime(lastSavedAt)}
      </span>
    );
  }
  return null;
}
