'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type PointerEvent as ReactPointerEvent,
} from 'react';
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
import { setOverride, clearOverrides } from '@/app/(app)/clients/[id]/edit/actions';

type Entity = 'assets' | 'expenses' | 'events';

export interface EditablePoint {
  idade: number;
  base: number;          // valor paramétrico naquela idade
  override?: number;     // override salvo (se existir)
}

interface Props {
  entity: Entity;
  id: string;
  client_id: string;
  points: EditablePoint[];
  /** cor da linha; usa hex */
  color?: string;
  /** prefixo da legenda (ex.: "R$") */
  label?: string;
  /** altura do svg */
  height?: number;
}

const brlCompact = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `R$ ${(n / 1_000).toFixed(0)}k`;
  return `R$ ${n.toFixed(0)}`;
};

const brlFull = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function EditableSeriesChart({
  entity,
  id,
  client_id,
  points,
  color = '#2563eb',
  label = 'Valor anual',
  height = 240,
}: Props) {
  // estado local de overrides (otimista). Inicializa a partir das props.
  const [localOverrides, setLocalOverrides] = useState<Record<number, number>>(() => {
    const o: Record<number, number> = {};
    for (const p of points) if (p.override !== undefined) o[p.idade] = p.override;
    return o;
  });
  const [draggingAge, setDraggingAge] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  // ressincroniza se props mudarem (após revalidatePath)
  useEffect(() => {
    const o: Record<number, number> = {};
    for (const p of points) if (p.override !== undefined) o[p.idade] = p.override;
    setLocalOverrides(o);
  }, [points]);

  // série exibida: override > base
  const data = useMemo(
    () =>
      points.map((p) => {
        const v = localOverrides[p.idade] ?? p.base;
        return {
          idade: p.idade,
          valor: v,
          base: p.base,
          isOverride: localOverrides[p.idade] !== undefined,
        };
      }),
    [points, localOverrides],
  );

  // domínio Y com headroom para arrastar
  const { yMin, yMax } = useMemo(() => {
    const vals = data.map((d) => d.valor);
    const min = Math.min(0, ...vals);
    const max = Math.max(...vals);
    const headroom = (max - min) * 0.25 || max * 0.25 || 1000;
    return { yMin: min - headroom, yMax: max + headroom };
  }, [data]);

  function commitOverride(idade: number, valor: number) {
    // se valor está praticamente igual à base, remove override (volta pra curva)
    const base = points.find((p) => p.idade === idade)?.base ?? 0;
    const isSame = Math.abs(valor - base) < Math.max(1, Math.abs(base) * 0.001);
    const newValue = isSame ? null : Math.round(valor);

    setLocalOverrides((prev) => {
      const next = { ...prev };
      if (newValue === null) delete next[idade];
      else next[idade] = newValue;
      return next;
    });

    startTransition(async () => {
      try {
        await setOverride({ entity, id, client_id, idade, value: newValue });
      } catch (e) {
        console.error('setOverride failed', e);
      }
    });
  }

  function handleReset() {
    setLocalOverrides({});
    startTransition(async () => {
      try {
        await clearOverrides({ entity, id, client_id });
      } catch (e) {
        console.error('clearOverrides failed', e);
      }
    });
  }

  // Dot customizado com arraste. Recharts passa cx, cy, payload.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function DraggableDot(props: any) {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined) return null;
    const isOver = payload.isOverride;
    const isDragging = draggingAge === payload.idade;

    function onPointerDown(e: ReactPointerEvent<SVGCircleElement>) {
      e.stopPropagation();
      e.preventDefault();
      const target = e.currentTarget;
      try {
        target.setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
      setDraggingAge(payload.idade);

      const startY = e.clientY;
      const startValue: number = payload.valor;
      const rect = containerRef.current?.getBoundingClientRect();
      const plotHeight = (rect?.height ?? height) - 40; // aproxima a área plotada (sem eixos)
      const valuePerPx = (yMax - yMin) / Math.max(1, plotHeight);

      let lastValue = startValue;
      const onMove = (ev: PointerEvent) => {
        const dy = ev.clientY - startY;
        const v = startValue - dy * valuePerPx;
        lastValue = Math.max(0, v); // não permite negativo (despesa/receita)
        setLocalOverrides((prev) => ({ ...prev, [payload.idade]: Math.round(lastValue) }));
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        setDraggingAge(null);
        commitOverride(payload.idade, lastValue);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    }

    return (
      <g>
        {/* hit area maior (transparente) */}
        <circle
          cx={cx}
          cy={cy}
          r={10}
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

  const overrideCount = Object.keys(localOverrides).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {label}
          <span className="ml-2 text-slate-400">
            arraste qualquer ponto pra ajustar o valor naquele ano
          </span>
        </p>
        {overrideCount > 0 && (
          <button
            type="button"
            onClick={handleReset}
            className="text-[11px] text-slate-500 hover:text-slate-900 flex items-center gap-1"
          >
            <RotateCcw size={11} />
            Resetar {overrideCount} ajuste{overrideCount > 1 ? 's' : ''}
          </button>
        )}
      </div>

      <div
        ref={containerRef}
        style={{ height, width: '100%', touchAction: 'none', userSelect: 'none' }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="idade"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={brlCompact}
              width={60}
            />
            <ReferenceLine y={0} stroke="#cbd5e1" />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0]!.payload as {
                  idade: number;
                  valor: number;
                  base: number;
                  isOverride: boolean;
                };
                return (
                  <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
                    <p className="font-medium text-slate-900">idade {p.idade}</p>
                    <p className="tabular-nums text-slate-700">{brlFull(p.valor)}</p>
                    {p.isOverride && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        ajustado · base {brlFull(p.base)}
                      </p>
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
