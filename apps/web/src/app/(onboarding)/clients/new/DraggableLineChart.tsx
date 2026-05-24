'use client';

import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { RotateCcw } from 'lucide-react';

interface Point {
  idade: number;
  valor: number;
}

interface Props {
  data: Point[];
  color: string;
  onChangePoint: (idade: number, valor: number) => void;
  onReset?: () => void;
  resetLabel?: string;
}

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const brlK = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `R$ ${(n / 1_000).toFixed(0)}k`;
  return `R$ ${n.toFixed(0)}`;
};

export function DraggableLineChart({ data, color, onChangePoint, onReset, resetLabel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingAge, setDraggingAge] = useState<number | null>(null);
  const [localOverrides, setLocalOverrides] = useState<Record<number, number>>({});

  const displayData = useMemo(
    () =>
      data.map((p) => ({
        idade: p.idade,
        valor: localOverrides[p.idade] ?? p.valor,
        isOverride: localOverrides[p.idade] !== undefined || p.valor !== data[0]?.valor,
      })),
    [data, localOverrides],
  );

  const { yMin, yMax } = useMemo(() => {
    const vals = displayData.map((d) => d.valor);
    const min = Math.min(0, ...vals);
    const max = Math.max(0, ...vals);
    const headroom = Math.max(Math.abs(max - min) * 0.3, Math.abs(max) * 0.3, 1000);
    return { yMin: min - headroom, yMax: max + headroom };
  }, [displayData]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function DraggableDot(props: any) {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined) return null;
    const isOver = payload.isOverride;
    const isDragging = draggingAge === payload.idade;

    function onPointerDown(e: ReactPointerEvent<SVGCircleElement>) {
      e.stopPropagation();
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch { /* noop */ }
      setDraggingAge(payload.idade);

      const startY = e.clientY;
      const startValue: number = payload.valor;
      const rect = containerRef.current?.getBoundingClientRect();
      const plotHeight = (rect?.height ?? 240) - 40;
      const valuePerPx = (yMax - yMin) / Math.max(1, plotHeight);

      let lastValue = startValue;
      const onMove = (ev: PointerEvent) => {
        const dy = ev.clientY - startY;
        lastValue = startValue - dy * valuePerPx;
        setLocalOverrides((prev) => ({ ...prev, [payload.idade]: Math.round(lastValue) }));
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        setDraggingAge(null);
        setLocalOverrides((prev) => {
          const next = { ...prev };
          delete next[payload.idade];
          return next;
        });
        onChangePoint(payload.idade, Math.round(lastValue));
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    }

    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={12}
          fill="transparent"
          style={{ cursor: 'ns-resize', touchAction: 'none' }}
          onPointerDown={onPointerDown}
        />
        <circle
          cx={cx}
          cy={cy}
          r={isDragging ? 6 : isOver ? 5 : 3.5}
          fill={isOver ? color : 'white'}
          stroke={color}
          strokeWidth={isOver ? 2 : 1.5}
          style={{ pointerEvents: 'none' }}
        />
      </g>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Arraste qualquer ponto pra ajustar o valor naquele ano
        </p>
        {onReset && (
          <button
            type="button"
            onClick={() => {
              setLocalOverrides({});
              onReset();
            }}
            className="text-[11px] text-slate-500 hover:text-slate-900 dark:text-slate-100 dark:hover:text-slate-200 flex items-center gap-1 shrink-0"
          >
            <RotateCcw size={11} />
            {resetLabel ?? 'Resetar'}
          </button>
        )}
      </div>

      <div
        ref={containerRef}
        style={{ height: 240, width: '100%', touchAction: 'none', userSelect: 'none' }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={displayData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid stroke="#334155" strokeOpacity={0.2} vertical={false} />
            <XAxis
              dataKey="idade"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={{ stroke: '#334155', strokeOpacity: 0.3 }}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={brlK}
              width={60}
            />
            <ReferenceLine y={0} stroke="#64748b" strokeOpacity={0.3} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const p = (payload[0] as any).payload as { idade: number; valor: number; isOverride: boolean };
                return (
                  <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 px-3 py-2 text-xs shadow-sm">
                    <p className="font-medium text-slate-900 dark:text-slate-100">idade {p.idade}</p>
                    <p className="tabular-nums text-slate-700 dark:text-slate-300">{brl(p.valor)}</p>
                    {p.isOverride && (
                      <p className="text-[10px] text-brand-500 mt-0.5">ajustado</p>
                    )}
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="valor"
              stroke={color}
              strokeWidth={2}
              dot={<DraggableDot />}
              activeDot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
