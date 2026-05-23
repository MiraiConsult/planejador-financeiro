'use client';

import { useState, useMemo } from 'react';
import {
  Sparkles,
  ShoppingCart,
  Plane,
  Gift,
  AlertCircle,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Input, Label } from '@/components/ui/Input';
import { CurrencyInput, formatBRL } from './helpers';
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

const brlK = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(abs / 1_000).toFixed(0)}k`;
  return `${abs.toFixed(0)}`;
};

interface Props {
  ev: DraftEvent;
  onUpdate: (e: DraftEvent) => void;
  onRemove: () => void;
  idadeAtual: number;
  expectativaVida: number;
}

export function EditableEventRow({
  ev,
  onUpdate,
  onRemove,
  idadeAtual,
  expectativaVida,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const Icon = iconByTipo[ev.tipo] ?? Sparkles;
  const positivo = ev.valor >= 0;

  // ─── Curva de impacto pra eventos recorrentes ───
  const chartData = useMemo(() => {
    if (ev.padrao_recorrencia === 'unico') return [];
    const inicio = ev.idade_inicio;
    const fim = ev.idade_fim ?? expectativaVida;
    if (fim < inicio) return [];
    const pts: { idade: number; impacto: number }[] = [];
    let acumulado = 0;
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
      acumulado += impactoAno;
      pts.push({ idade, impacto: impactoAno });
    }
    void acumulado;
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
    <li className="border-b border-slate-100 last:border-b-0">
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
          {/* Mini-gráfico de impacto recorrente */}
          {chartData.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-[11px] text-slate-500 mb-2">
                Impacto deste sonho no caixa ano a ano (
                {ev.padrao_recorrencia === 'recorrente_anual'
                  ? 'todo ano'
                  : `a cada ${ev.intervalo_anos ?? '?'} anos`}
                )
              </p>
              <div style={{ height: 140, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="idade"
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={brlK}
                      width={48}
                    />
                    <ReferenceLine y={0} stroke="#cbd5e1" />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const p = payload[0]!.payload as { idade: number; impacto: number };
                        if (p.impacto === 0) return null;
                        return (
                          <div className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-sm">
                            <p className="font-medium text-slate-900">aos {p.idade}</p>
                            <p className={`tabular-nums ${p.impacto >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {brl(p.impacto)}
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="impacto" fill={positivo ? '#10b981' : '#ef4444'} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
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
