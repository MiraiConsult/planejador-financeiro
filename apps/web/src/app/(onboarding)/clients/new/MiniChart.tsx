'use client';

import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const brlK = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(abs / 1_000).toFixed(0)}k`;
  return `${abs.toFixed(0)}`;
};

interface Props {
  data: { idade: number; v: number }[];
  color: string;
  kind: 'line' | 'bar';
  caption: string;
  /**
   * Se passado, o gráfico fica arrastável: clique e segure verticalmente
   * pra ajustar o "valor base" do item. Recebe o NOVO valor (já com sinal)
   * quando o user solta o pointer. Para barras com valores diferentes de
   * zero, refletem o mesmo novo valor enquanto arrasta.
   */
  onChangeValue?: (newValue: number) => void;
  /**
   * Quando onChangeValue é setado, qual o "valor base" do item, pra
   * usarmos como referência (todos os pontos != 0 viram esse valor).
   */
  baseValue?: number;
}

export function MiniChart({ data, color, kind, caption, onChangeValue, baseValue }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingValue, setDraggingValue] = useState<number | null>(null);
  const interactive = !!onChangeValue && baseValue !== undefined;

  if (data.length === 0) return null;

  // Domínio Y com headroom — fixo durante drag pra escala não pular.
  const maxAbs = Math.max(...data.map((d) => Math.abs(d.v)), Math.abs(baseValue ?? 0));
  const head = maxAbs * 1.4 || 1000;
  // Suporta valores negativos sem cortar.
  const hasNegative = data.some((d) => d.v < 0) || (baseValue ?? 0) < 0;
  const yMax = head;
  const yMin = hasNegative ? -head : 0;

  // Aplica valor sendo arrastado: troca o "v" nos pontos != 0 pelo draggingValue.
  const displayData =
    interactive && draggingValue !== null
      ? data.map((d) => (d.v === 0 ? d : { ...d, v: draggingValue }))
      : data;

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!interactive || !containerRef.current) return;
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const plotHeight = Math.max(1, rect.height - 40); // descontando eixo X
    const yRange = yMax - yMin;
    const valuePerPx = yRange / plotHeight;
    const startY = e.clientY;
    const start = baseValue!;
    let last = start;

    const onMove = (ev: PointerEvent) => {
      const dy = ev.clientY - startY;
      last = start - dy * valuePerPx;
      setDraggingValue(last);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setDraggingValue(null);
      // arredonda pra inteiro pra evitar lixo decimal
      onChangeValue!(Math.round(last));
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tooltipContent = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload as { idade: number; v: number };
    if (p.v === 0 && kind === 'bar') return null;
    return (
      <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs shadow-sm">
        <p className="font-medium text-slate-900 dark:text-slate-100">aos {p.idade}</p>
        <p className="tabular-nums text-slate-700">{brl(p.v)}</p>
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
      <div className="flex items-center justify-between mb-2 gap-2">
        <p className="text-[11px] text-slate-500 flex-1">{caption}</p>
        {interactive && (
          <p className="text-[10px] text-brand-600 shrink-0 flex items-center gap-1">
            <span className="inline-block h-2 w-3 rounded-sm border border-brand-300 bg-brand-50" />
            arraste vertical pra ajustar
          </p>
        )}
      </div>
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        style={{
          height: 160,
          width: '100%',
          cursor: interactive ? (draggingValue !== null ? 'ns-resize' : 'grab') : 'default',
          touchAction: interactive ? 'none' : undefined,
          userSelect: interactive ? 'none' : undefined,
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          {kind === 'line' ? (
            <LineChart data={displayData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="idade"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                domain={[yMin, yMax]}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={brlK}
                width={48}
              />
              <ReferenceLine y={0} stroke="#cbd5e1" />
              <Tooltip content={tooltipContent} />
              <Line
                type="monotone"
                dataKey="v"
                stroke={color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          ) : (
            <BarChart data={displayData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="idade"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                domain={[yMin, yMax]}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={brlK}
                width={48}
              />
              <ReferenceLine y={0} stroke="#cbd5e1" />
              <Tooltip content={tooltipContent} />
              <Bar dataKey="v" fill={color} radius={[2, 2, 0, 0]} isAnimationActive={false} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
