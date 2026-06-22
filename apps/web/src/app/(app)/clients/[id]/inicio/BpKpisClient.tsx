'use client';

import { useMemo } from 'react';
import { Calendar, CircleDollarSign, TrendingUp, Wallet } from 'lucide-react';
import { simulate, type SimulationInput } from '@planejador/engine';

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const brlCompact = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}R$ ${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}R$ ${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}R$ ${(abs / 1e3).toFixed(0)}k`;
  return brl(n);
};

interface Props {
  input: SimulationInput;
}

/**
 * KPIs do BP no /inicio: a simulação roda no browser pra eliminar
 * o tempo de CPU do server na navegação.
 */
export function BpKpisClient({ input }: Props) {
  const result = useMemo(() => simulate(input), [input]);
  const patrimonioHoje = result.rows[0]?.patrimonio_total ?? 0;
  const patrimonioFinal = result.summary.patrimonio_final;
  const breakEven = result.summary.idade_break_even;
  const pico = result.summary.patrimonio_pico;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <Kpi label="Patrimônio hoje" value={brlCompact(patrimonioHoje)} icon={Wallet} />
      <Kpi label="Pico projetado" value={brlCompact(pico)} icon={TrendingUp} tone="success" />
      <Kpi
        label="Projeção final"
        value={brlCompact(patrimonioFinal)}
        icon={CircleDollarSign}
        tone={patrimonioFinal < 0 ? 'danger' : 'success'}
      />
      <Kpi
        label="Break-even"
        value={breakEven ? `${breakEven} anos` : 'nunca'}
        icon={Calendar}
        tone={breakEven ? 'danger' : 'default'}
      />
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: string;
  icon?: typeof Wallet;
  tone?: 'default' | 'success' | 'danger';
}) {
  const cor =
    tone === 'success' ? 'text-emerald-700' : tone === 'danger' ? 'text-red-600' : 'text-slate-900';
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-slate-400 flex items-center gap-1">
        {Icon && <Icon size={10} />}
        {label}
      </p>
      <p className={`text-lg font-bold tabular-nums tracking-tight mt-1 ${cor}`}>{value}</p>
    </div>
  );
}
