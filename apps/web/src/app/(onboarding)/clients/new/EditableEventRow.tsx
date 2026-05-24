'use client';

import { useState, useMemo } from 'react';
import {
  Sparkles,
  ShoppingCart,
  Plane,
  Gift,
  AlertCircle,
  Trash2,
  Copy,
  ChevronDown,
} from 'lucide-react';
import { Input, Label } from '@/components/ui/Input';
import { CurrencyInput, formatBRL } from './helpers';
import { MiniChart } from './MiniChart';
import type { DraftEvent } from './types';

const iconByTipo: Record<DraftEvent['tipo'], typeof Sparkles> = {
  sonho: Sparkles,
  compra: ShoppingCart,
  viagem_pontual: Plane,
  heranca: Gift,
  imprevisto: AlertCircle,
  venda_ativo: Sparkles,
};
const labelTipo: Record<DraftEvent['tipo'], string> = {
  sonho: 'Sonho / objetivo',
  compra: 'Compra grande',
  viagem_pontual: 'Viagem específica',
  heranca: 'Herança a receber',
  imprevisto: 'Reserva imprevisto',
  venda_ativo: 'Venda de ativo',
};

function brl(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '+';
  return `${sign} ${abs.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}`;
}

interface Props {
  ev: DraftEvent;
  onUpdate: (e: DraftEvent) => void;
  onRemove: () => void;
  onDuplicate?: () => void;
  idadeAtual: number;
  expectativaVida: number;
  defaultExpanded?: boolean;
  highlight?: boolean;
}

export function EditableEventRow({
  ev,
  onUpdate,
  onRemove,
  onDuplicate,
  idadeAtual,
  expectativaVida,
  defaultExpanded = false,
  highlight = false,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const Icon = iconByTipo[ev.tipo] ?? Sparkles;
  const positivo = ev.valor >= 0;

  // ─── Curva de impacto pra eventos recorrentes ───
  const chartData = useMemo(() => {
    if (ev.padrao_recorrencia === 'unico') return [];
    const inicio = ev.idade_inicio;
    const fim = ev.idade_fim ?? expectativaVida;
    if (fim < inicio) return [];
    const pts: { idade: number; v: number }[] = [];
    for (let idade = idadeAtual; idade <= expectativaVida; idade++) {
      let impactoAno = 0;
      if (idade >= inicio && idade <= fim) {
        if (ev.padrao_recorrencia === 'recorrente_anual') {
          impactoAno = ev.valor;
        } else if (ev.padrao_recorrencia === 'recorrente_espacado') {
          const intervalo = ev.intervalo_anos ?? 0;
          if (intervalo > 0 && (idade - inicio) % intervalo === 0) {
            impactoAno = ev.valor;
          }
        }
      }
      pts.push({ idade, v: impactoAno });
    }
    return pts;
  }, [ev, idadeAtual, expectativaVida]);

  function update<K extends keyof DraftEvent>(k: K, v: DraftEvent[K]) {
    onUpdate({ ...ev, [k]: v });
  }

  const subtitleDetail =
    ev.padrao_recorrencia === 'unico'
      ? `idade ${ev.idade_inicio}`
      : ev.padrao_recorrencia === 'recorrente_anual'
        ? `todo ano · ${ev.idade_inicio}–${ev.idade_fim ?? expectativaVida}`
        : `a cada ${ev.intervalo_anos ?? '?'} anos · ${ev.idade_inicio}–${ev.idade_fim ?? expectativaVida}`;

  return (
    <li
      className={`border-b border-slate-100 last:border-b-0 transition-colors ${
        highlight ? 'bg-brand-50/30' : ''
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-5 py-3 flex items-center gap-4 hover:bg-slate-50/60 transition-colors text-left"
      >
        <ChevronDown
          size={13}
          className={`text-slate-300 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
        <div
          className={`h-9 w-9 rounded-lg flex items-center justify-center ring-1 ring-inset shrink-0 ${
            positivo
              ? 'bg-emerald-50 text-emerald-600 ring-emerald-100'
              : 'bg-amber-50 text-amber-600 ring-amber-100'
          }`}
        >
          <Icon size={15} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-900 truncate">
            {ev.descricao || <span className="text-slate-400 italic">sem descrição</span>}
          </p>
          <p className="text-xs text-slate-500">
            {labelTipo[ev.tipo]} · {subtitleDetail}
          </p>
        </div>
        <p
          className={`text-sm font-semibold tabular-nums shrink-0 ${
            positivo ? 'text-emerald-600' : 'text-red-600'
          }`}
        >
          {brl(ev.valor)}
        </p>
        {onDuplicate && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="h-7 w-7 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-900 flex items-center justify-center shrink-0"
            title="Duplicar"
          >
            <Copy size={13} />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="h-7 w-7 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center shrink-0"
          title="Remover"
        >
          <Trash2 size={13} />
        </button>
      </button>

      {expanded && (
        <div className="px-5 pb-5 pt-2 bg-slate-50/40 space-y-4 border-t border-slate-100">
          {/* Mini-gráfico de impacto recorrente (arrastável verticalmente) */}
          {chartData.length > 0 && (
            <MiniChart
              data={chartData}
              color={positivo ? '#10b981' : '#ef4444'}
              kind="bar"
              caption={`Impacto deste sonho no caixa ano a ano (${
                ev.padrao_recorrencia === 'recorrente_anual'
                  ? 'todo ano'
                  : `a cada ${ev.intervalo_anos ?? '?'} anos`
              })`}
              baseValue={ev.valor}
              onChangeValue={(v) => onUpdate({ ...ev, valor: v })}
            />
          )}

          {/* Form inline */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor={`desc-${ev.id}`}>Descrição</Label>
              <Input
                id={`desc-${ev.id}`}
                value={ev.descricao}
                onChange={(e) => update('descricao', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`valor-${ev.id}`}>Valor (com sinal)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                  R$
                </span>
                <CurrencyInput
                  id={`valor-${ev.id}`}
                  value={ev.valor}
                  onChangeNumber={(n) => update('valor', n)}
                  allowNegative
                  className="pl-9 tabular-nums"
                />
              </div>
              <p className="text-[10px] text-slate-500">
                {positivo ? 'entrada (+)' : 'saída (−)'} de {formatBRL(Math.abs(ev.valor))}
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`idade-${ev.id}`}>Idade do início</Label>
              <Input
                id={`idade-${ev.id}`}
                type="number"
                value={ev.idade_inicio}
                onChange={(e) => update('idade_inicio', Number(e.target.value) || 0)}
                className="tabular-nums"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Frequência</Label>
              <div className="flex gap-2">
                {(['unico', 'recorrente_anual', 'recorrente_espacado'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      onUpdate({
                        ...ev,
                        padrao_recorrencia: r,
                        idade_fim: r === 'unico' ? null : ev.idade_fim ?? expectativaVida,
                        intervalo_anos:
                          r === 'recorrente_espacado' ? ev.intervalo_anos ?? 2 : null,
                      });
                    }}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      ev.padrao_recorrencia === r
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {r === 'unico' && 'Único'}
                    {r === 'recorrente_anual' && 'Todo ano'}
                    {r === 'recorrente_espacado' && 'A cada N anos'}
                  </button>
                ))}
              </div>
            </div>
            {ev.padrao_recorrencia === 'recorrente_espacado' && (
              <div className="space-y-1">
                <Label htmlFor={`int-${ev.id}`}>Intervalo (anos)</Label>
                <Input
                  id={`int-${ev.id}`}
                  type="number"
                  min={1}
                  value={ev.intervalo_anos ?? ''}
                  onChange={(e) =>
                    update('intervalo_anos', e.target.value ? Number(e.target.value) : null)
                  }
                  className="tabular-nums"
                />
              </div>
            )}
            {ev.padrao_recorrencia !== 'unico' && (
              <div className="space-y-1">
                <Label htmlFor={`fim-${ev.id}`}>Idade fim</Label>
                <Input
                  id={`fim-${ev.id}`}
                  type="number"
                  value={ev.idade_fim ?? ''}
                  onChange={(e) =>
                    update('idade_fim', e.target.value ? Number(e.target.value) : null)
                  }
                  placeholder={String(expectativaVida)}
                  className="tabular-nums"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
