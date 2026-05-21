'use client';

import { useEffect, useRef, useState } from 'react';

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

/**
 * Auto-save com debounce. Recebe um valor (snapshot dos campos editáveis)
 * e uma função saver que persiste no banco. Quando o valor muda, espera
 * `debounceMs` (default 800ms) e aciona o saver.
 *
 * Retorna o status atual + timestamp da última gravação. UI lê pra
 * mostrar "Salvando…" / "Salvo às 14:32".
 */
export function useAutoSave<T>(
  value: T,
  saver: (v: T) => Promise<{ ok: boolean; error?: string }>,
  opts: { debounceMs?: number; skip?: (v: T) => boolean } = {},
): { status: SaveStatus; lastSavedAt: Date | null; error: string | null } {
  const { debounceMs = 800, skip } = opts;
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastSavedValueRef = useRef<T>(value);
  const skipFirstRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Não dispara save no primeiro render (valor ainda é o do servidor)
    if (skipFirstRef.current) {
      skipFirstRef.current = false;
      lastSavedValueRef.current = value;
      return;
    }
    if (skip && skip(value)) return;
    setStatus('dirty');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setStatus('saving');
      try {
        const res = await saver(value);
        if (res.ok) {
          lastSavedValueRef.current = value;
          setLastSavedAt(new Date());
          setStatus('saved');
          setError(null);
        } else {
          setStatus('error');
          setError(res.error ?? 'Falha ao salvar');
        }
      } catch (e) {
        console.error('[useAutoSave] saver threw', e);
        setStatus('error');
        setError(e instanceof Error ? e.message : 'Falha ao salvar');
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return { status, lastSavedAt, error };
}
