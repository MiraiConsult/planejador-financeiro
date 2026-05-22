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
import { setOverride, setOverridesBatch, clearOverrides } from '@/app/(app)/clients/[id]/edit/actions';
import { toast } from '@/components/ui/Toast';

type Entity = 'assets' | 'expenses' | 'events' | 'liabilities';

export interface EditablePoint {
  idade: number;
  base: number;
  override?: number;
}

interface Props {
  entity: Entity;
  id: string;
  client_id: string;
  points: EditablePoint[];
  color?: string;
  label?: string;
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

// Margens do LineChart (precisam bater com o que passamos abaixo)
const M_TOP = 8;
const M_RIGHT = 8;
const M_BOTTOM = 8;
const Y_AXIS_W = 60;
const X_AXIS_H = 24;

export function EditableSeriesChart({
  entity,
  id,
  client_id,
  points,
  color = '#2563eb',
  label = 'Valor anual',
  height = 240,
}: Props) {
  const [localOverrides, setLocalOverrides] = useState<Record<number, number>>(() => {
    const o: Record<number, number> = {};
    for (const p of points) if (p.override !== undefined) o[p.idade] = p.override;
    return o;
  });
  const [draggingAge, setDraggingAge] = useState<number | null>(null);
  const [painting, setPainting] = useState(false);
  const [shiftHeld, setShiftHeld] = useState(false);
  const [, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const o: Record<number, number> = {};
    for (const p of points) if (p.override !== undefined) o[p.idade] = p.override;
    setLocalOverrides(o);
  }, [points]);

  // Escuta Shift global pra alternar pointer-events do overlay
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

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

  const { yMin, yMax, ageMin, ageMax } = useMemo(() => {
    const vals = data.map((d) => d.valor);
    const min = Math.min(0, ...vals);
    const max = Math.max(...vals);
    const headroom = (max - min) * 0.25 || max * 0.25 || 1000;
    return {
      yMin: min - headroom,
      yMax: max + headroom,
      ageMin: points[0]?.idade ?? 0,
      ageMax: points[points.length - 1]?.idade ?? 0,
    };
  }, [data, points]);

  function commitSingleOverride(idade: number, valor: number) {
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
        toast.error('Falha ao salvar ajuste');
      }
    });
  }

  function commitBatch(patch: Record<string, number | null>) {
    if (Object.keys(patch).length === 0) return;
    const n = Object.keys(patch).length;
    startTransition(async () => {
      try {
        await setOverridesBatch({ entity, id, client_id, patch });
        toast.success(`${n} ano${n > 1 ? 's' : ''} ajustado${n > 1 ? 's' : ''}`);
      } catch (e) {
        console.error('setOverridesBatch failed', e);
        toast.error('Falha ao salvar ajustes');
      }
    });
  }

  function handleReset() {
    const n = Object.keys(localOverrides).length;
    setLocalOverrides({});
    startTransition(async () => {
      try {
        await clearOverrides({ entity, id, client_id });
        toast.success(`${n} ajuste${n > 1 ? 's' : ''} removido${n > 1 ? 's' : ''}`);
      } catch (e) {
        console.error('clearOverrides failed', e);
        toast.error('Falha ao resetar ajustes');
      }
    });
  }

  // ─── Pincel (Shift+arrasta horizontal) ───
  function handlePaintPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!e.shiftKey) return;
    e.preventDefault();
    const containerEl = containerRef.current;
    if (!containerEl) return;
    const rect = containerEl.getBoundingClientRect();
    const plotLeft = rect.left + Y_AXIS_W;
    const plotRight = rect.right - M_RIGHT;
    const plotTop = rect.top + M_TOP;
    const plotBottom = rect.bottom - M_BOTTOM - X_AXIS_H;
    const plotW = Math.max(1, plotRight - plotLeft);
    const plotH = Math.max(1, plotBottom - plotTop);
    const totalAges = ageMax - ageMin;
    const yRange = yMax - yMin;

    function clientToAge(clientX: number): number | null {
      const t = (clientX - plotLeft) / plotW;
      if (t < -0.05 || t > 1.05) return null;
      const idx = Math.round(Math.max(0, Math.min(1, t)) * totalAges);
      return ageMin + idx;
    }
    function clientToValue(clientY: number): number {
      const t = (clientY - plotTop) / plotH;
      const v = yMax - Math.max(0, Math.min(1, t)) * yRange;
      return Math.max(0, v);
    }

    setPainting(true);
    const painted: Record<number, number> = {};

    const apply = (ev: PointerEvent | ReactPointerEvent<HTMLDivElement>) => {
      const age = clientToAge(ev.clientX);
      if (age === null) return;
      const v = Math.round(clientToValue(ev.clientY));
      painted[age] = v;
      setLocalOverrides((prev) => ({ ...prev, [age]: v }));
    };

    apply(e);

    const onMove = (ev: PointerEvent) => apply(ev);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setPainting(false);

      // resolve: se valor pintado bate com base, vira null (remove override)
      const patch: Record<string, number | null> = {};
      for (const [ageStr, v] of Object.entries(painted)) {
        const ageN = Number(ageStr);
        const base = points.find((p) => p.idade === ageN)?.base ?? 0;
        const same = Math.abs(v - base) < Math.max(1, Math.abs(base) * 0.001);
        patch[ageStr] = same ? null : v;
      }
      // reflete o "same → null" localmente também
      setLocalOverrides((prev) => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(patch)) {
          const ageN = Number(k);
          if (v === null) delete next[ageN];
          else next[ageN] = v;
        }
        return next;
      });
      commitBatch(patch);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // ─── Dot custom (arrasta um único ano) ───
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function DraggableDot(props: any) {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined) return null;
    const isOver = payload.isOverride;
    const isDragging = draggingAge === payload.idade;

    function onPointerDown(e: ReactPointerEvent<SVGCircleElement>) {
      if (e.shiftKey) return; // deixa o overlay tomar o gesto
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
      const plotHeight = (rect?.height ?? height) - 40;
      const valuePerPx = (yMax - yMin) / Math.max(1, plotHeight);

      let lastValue = startValue;
      const onMove = (ev: PointerEvent) => {
        const dy = ev.clientY - startY;
        const v = startValue - dy * valuePerPx;
        lastValue = Math.max(0, v);
        setLocalOverrides((prev) => ({ ...prev, [payload.idade]: Math.round(lastValue) }));
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        setDraggingAge(null);
        commitSingleOverride(payload.idade, lastValue);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    }

    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={10}
          fill="transparent"
          style={{ cursor: shiftHeld ? 'crosshair' : 'ns-resize', touchAction: 'none' }}
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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-slate-500">
          {label}
          <span className="ml-2 text-slate-400">
            arraste um ponto para ajustar um ano · <kbd className="px-1 py-0.5 rounded border border-slate-200 bg-slate-50 font-mono text-[10px]">Shift</kbd>+arraste horizontal para pintar um trecho
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
        className="relative"
        style={{ height, width: '100%', touchAction: 'none', userSelect: 'none' }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: M_TOP, right: M_RIGHT, left: 0, bottom: M_BOTTOM }}
          >
            <CartesianGrid stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="idade"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              height={X_AXIS_H}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={brlCompact}
              width={Y_AXIS_W}
            />
            <ReferenceLine y={0} stroke="#cbd5e1" />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length || painting) return null;
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

        {/* Overlay do pincel — só captura quando Shift está pressionado */}
        <div
          onPointerDown={handlePaintPointerDown}
          style={{
            position: 'absolute',
            top: M_TOP,
            left: Y_AXIS_W,
            right: M_RIGHT,
            bottom: M_BOTTOM + X_AXIS_H,
            cursor: shiftHeld ? 'crosshair' : 'default',
            pointerEvents: shiftHeld ? 'auto' : 'none',
            background: shiftHeld ? 'rgba(99, 102, 241, 0.04)' : 'transparent',
            transition: 'background 120ms',
          }}
        />

        {shiftHeld && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded bg-slate-900/90 text-white text-[10px] font-medium pointer-events-none">
            modo pincel
          </div>
        )}
      </div>
    </div>
  );
}
