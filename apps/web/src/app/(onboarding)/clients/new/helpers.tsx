'use client';

import { forwardRef, type ChangeEvent, type InputHTMLAttributes } from 'react';
import { Input } from '@/components/ui/Input';

// ─── Formatação BRL (milhares com .) ───

export function formatBRL(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === '') return '';
  const num = typeof n === 'string' ? Number(n) : n;
  if (!Number.isFinite(num)) return '';
  return num.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

/** Aceita "50000", "50.000", "50.000,00" → 50000 */
export function parseBRL(s: string): number {
  if (!s) return 0;
  const clean = s.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
}

// ─── Idade a partir da data de nascimento ───

export function idadeFromBirth(iso: string): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let idade = now.getUTCFullYear() - d.getUTCFullYear();
  if (
    now.getUTCMonth() < d.getUTCMonth() ||
    (now.getUTCMonth() === d.getUTCMonth() && now.getUTCDate() < d.getUTCDate())
  )
    idade -= 1;
  return idade;
}

// ─── CurrencyInput: input que aplica máscara BRL (1.000.000) enquanto digita ───
// O `value` que o pai mantém pode ser number ou string numérica;
// o componente exibe formatado e ao mudar devolve o NÚMERO puro via onChangeNumber.

interface CurrencyInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number | string | null;
  onChangeNumber: (n: number) => void;
  className?: string;
  /** Permitir valores negativos. Default: false. */
  allowNegative?: boolean;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(function CurrencyInput(
  { value, onChangeNumber, className, allowNegative = false, ...rest },
  ref,
) {
  const numericValue =
    value === null || value === undefined || value === ''
      ? null
      : typeof value === 'string'
        ? Number(value.replace(/\./g, '').replace(',', '.'))
        : value;
  const display =
    numericValue === null || !Number.isFinite(numericValue)
      ? ''
      : formatBRL(numericValue);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    // mantém apenas dígitos (e sinal se permitido)
    const sign = allowNegative && raw.trim().startsWith('-') ? -1 : 1;
    const digits = raw.replace(/[^\d]/g, '');
    if (digits === '') {
      onChangeNumber(0);
      return;
    }
    const n = Number(digits) * sign;
    onChangeNumber(n);
  }

  return (
    <Input
      ref={ref}
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      className={className ?? ''}
      {...rest}
    />
  );
});
