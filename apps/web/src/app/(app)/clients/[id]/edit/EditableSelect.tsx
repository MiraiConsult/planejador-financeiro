'use client';

import { useState, useTransition, type KeyboardEvent } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { Input, Label } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { addCustomCategory } from './actions';

export interface SelectOption {
  value: string;
  label: string;
  /** apenas para asset_tipo: 'estoque' | 'fluxo' */
  natureza?: string;
}

type Kind = 'asset_tipo' | 'expense_categoria' | 'event_tipo' | 'liability_tipo';

interface Props {
  label: string;
  value: string;
  onChange: (value: string, option?: SelectOption) => void;
  builtin: SelectOption[];
  custom: SelectOption[];
  /** Tipo da categoria; controla se pedimos natureza ao criar nova */
  kind: Kind;
  client_id: string;
  className?: string;
}

const NEW_VALUE = '__new__';

export function EditableSelect({
  label,
  value,
  onChange,
  builtin,
  custom,
  kind,
  client_id,
  className,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newNatureza, setNewNatureza] = useState<'estoque' | 'fluxo'>('estoque');
  const [pending, startTransition] = useTransition();

  // Se o `value` atual não está em nenhum dos arrays, mostra como opção
  // fantasma (acontece com items legados ou enquanto migra). Evita "tipo
  // selecionado" sumir do select.
  const allValues = new Set([...builtin, ...custom].map((o) => o.value));
  const orphan = value && !allValues.has(value) ? { value, label: value } : null;

  function handleSelectChange(v: string) {
    if (v === NEW_VALUE) {
      setAdding(true);
      setNewLabel('');
      return;
    }
    const allOptions = [...builtin, ...custom];
    const opt = allOptions.find((o) => o.value === v);
    onChange(v, opt);
  }

  function handleCreate() {
    const labelTrim = newLabel.trim();
    if (!labelTrim) {
      toast.error('Digite um nome');
      return;
    }
    startTransition(async () => {
      const res = await addCustomCategory({
        kind,
        label: labelTrim,
        ...(kind === 'asset_tipo' ? { natureza: newNatureza } : {}),
        client_id,
      });
      if (!res.ok) {
        toast.error(`Falha: ${res.error}`);
        return;
      }
      // Push a opção localmente para já mostrar selecionada (UI otimista
      // — a revalidação do server vai trazer no próximo render).
      const newOpt: SelectOption = {
        value: res.value,
        label: res.label,
        ...(kind === 'asset_tipo' ? { natureza: newNatureza } : {}),
      };
      onChange(res.value, newOpt);
      toast.success(`"${res.label}" criado`);
      setAdding(false);
      setNewLabel('');
    });
  }

  function handleNewKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreate();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setAdding(false);
    }
  }

  return (
    <div className={`space-y-1 ${className ?? ''}`}>
      <Label htmlFor={label}>{label}</Label>
      <select
        id={label}
        value={value}
        onChange={(e) => handleSelectChange(e.target.value)}
        className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-brand-500"
      >
        {orphan && <option value={orphan.value}>{orphan.label}</option>}
        {builtin.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        {custom.length > 0 && (
          <optgroup label="Personalizados">
            {custom.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </optgroup>
        )}
        <option value={NEW_VALUE}>＋ Adicionar novo…</option>
      </select>

      {adding && (
        <div className="mt-2 rounded-lg border border-brand-200 bg-brand-50/40 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-brand-700 uppercase tracking-wider">
              Nova opção
            </p>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X size={13} />
            </button>
          </div>
          <Input
            autoFocus
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={handleNewKey}
            placeholder="Nome (ex.: Pet, Jardinagem, Royalties...)"
            maxLength={60}
          />
          {kind === 'asset_tipo' && (
            <div className="flex gap-2 text-xs">
              <label className="flex items-center gap-1.5 text-slate-700">
                <input
                  type="radio"
                  name="newNatureza"
                  checked={newNatureza === 'estoque'}
                  onChange={() => setNewNatureza('estoque')}
                />
                Patrimônio
              </label>
              <label className="flex items-center gap-1.5 text-slate-700">
                <input
                  type="radio"
                  name="newNatureza"
                  checked={newNatureza === 'fluxo'}
                  onChange={() => setNewNatureza('fluxo')}
                />
                Receita anual
              </label>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAdding(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="button" size="sm" onClick={handleCreate} disabled={pending}>
              {pending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Criar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
