'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCcw, TrendingDown, TrendingUp, X } from 'lucide-react';
import { simulate, type Client, type SimulationInput, type SimulationResult } from '@planejador/engine';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CompareChart } from '@/components/charts/CompareChart';

interface Props {
  clientId: string;
  input: { client: Client; input: SimulationInput };
}

interface Ajustes {
  receitaPct: number;   // aumento %
  gastosPct: number;    // diminuição %
  sonhosPct: number;    // aumento %
}

const ZERO: Ajustes = { receitaPct: 0, gastosPct: 0, sonhosPct: 0 };

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

function aplicarAjustes(base: SimulationInput, a: Ajustes): SimulationInput {
  const fReceita = 1 + a.receitaPct / 100;
  const fGastos = 1 - a.gastosPct / 100;
  const fSonhos = 1 + a.sonhosPct / 100;
  return {
    ...base,
    assets: base.assets.map((x) =>
      x.natureza === 'fluxo' ? { ...x, valor: x.valor * fReceita } : x,
    ),
    expenses: base.expenses.map((x) => ({ ...x, valor_mensal: x.valor_mensal * fGastos })),
    events: base.events.map((x) =>
      x.tipo === 'sonho' ? { ...x, valor: x.valor * fSonhos } : x,
    ),
  };
}

export function Simulador({ clientId, input }: Props) {
  const [a, setA] = useState<Ajustes>(ZERO);

  const baseResult = useMemo<SimulationResult>(() => simulate(input.input), [input.input]);
  const ajustadoResult = useMemo<SimulationResult>(
    () => simulate(aplicarAjustes(input.input, a)),
    [input.input, a],
  );

  const tocado = a.receitaPct !== 0 || a.gastosPct !== 0 || a.sonhosPct !== 0;

  const sBase = baseResult.summary;
  const sNovo = ajustadoResult.summary;
  const deltaPatrimonio = sNovo.patrimonio_final - sBase.patrimonio_final;
  const deltaPico = sNovo.patrimonio_pico - sBase.patrimonio_pico;
  const deltaBreakEven =
    (sNovo.idade_break_even ?? Infinity) - (sBase.idade_break_even ?? Infinity);

  const series = [
    {
      nome: 'Plano atual',
      tipo: 'base',
      color: '#94a3b8',
      rows: baseResult.rows.map((r) => ({ idade: r.idade, patrimonio_total: r.patrimonio_total })),
    },
    {
      nome: 'Cenário ajustado',
      tipo: 'ajustado',
      color: '#3b82f6',
      rows: ajustadoResult.rows.map((r) => ({ idade: r.idade, patrimonio_total: r.patrimonio_total })),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/clients/${clientId}/balanco`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft size={14} />
            Voltar ao balanço
          </Button>
        </Link>
        <Link href={`/clients/${clientId}/balanco`} title="Fechar">
          <Button variant="ghost" size="sm" aria-label="Fechar">
            <X size={16} />
          </Button>
        </Link>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600">
          Simulador interativo
        </p>
        <h1 className="text-display-sm font-bold tracking-tight text-slate-900 mt-1">
          Comparação de cenários
        </h1>
        <p className="text-sm text-slate-500 mt-1 leading-relaxed max-w-2xl">
          Ajuste as variáveis e veja o impacto no patrimônio em tempo real. Nada é salvo até você
          confirmar.
        </p>
      </div>

      <div className="grid lg:grid-cols-[340px_1fr] gap-6">
        {/* Painel de controles */}
        <Card>
          <CardHeader className="border-b border-slate-100/70">
            <div className="flex items-center justify-between">
              <CardTitle>Controles</CardTitle>
              <button
                type="button"
                onClick={() => setA(ZERO)}
                disabled={!tocado}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Zerar ajustes"
              >
                <RotateCcw size={12} />
                Zerar
              </button>
            </div>
            <CardDescription>Aplica em todos os itens de cada categoria.</CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-6">
            <Slider
              label="Aumento de receita"
              value={a.receitaPct}
              min={0}
              max={50}
              step={1}
              suffix="%"
              tone="success"
              onChange={(v) => setA({ ...a, receitaPct: v })}
            />
            <Slider
              label="Diminuição de gastos gerais"
              value={a.gastosPct}
              min={0}
              max={50}
              step={1}
              suffix="%"
              tone="success"
              onChange={(v) => setA({ ...a, gastosPct: v })}
            />
            <Slider
              label="Aumento de sonhos"
              value={a.sonhosPct}
              min={0}
              max={100}
              step={5}
              suffix="%"
              tone="warning"
              onChange={(v) => setA({ ...a, sonhosPct: v })}
            />
          </CardContent>
        </Card>

        {/* Painel de impacto */}
        <div className="space-y-6">
          <div className="grid sm:grid-cols-3 gap-3">
            <DeltaCard
              label="Patrimônio final"
              base={brlCompact(sBase.patrimonio_final)}
              novo={brlCompact(sNovo.patrimonio_final)}
              delta={deltaPatrimonio}
              fmt={brlCompact}
            />
            <DeltaCard
              label="Pico patrimonial"
              base={brlCompact(sBase.patrimonio_pico)}
              novo={brlCompact(sNovo.patrimonio_pico)}
              delta={deltaPico}
              fmt={brlCompact}
            />
            <DeltaCard
              label="Idade de exaustão"
              base={sBase.idade_break_even ? `${sBase.idade_break_even}a` : 'nunca'}
              novo={sNovo.idade_break_even ? `${sNovo.idade_break_even}a` : 'nunca'}
              delta={Number.isFinite(deltaBreakEven) ? deltaBreakEven : 0}
              fmt={(n) => (n === 0 ? '=' : `${n > 0 ? '+' : ''}${n.toFixed(0)}a`)}
              positivoBom
            />
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>Patrimônio ao longo do tempo</CardTitle>
                  <CardDescription>Plano atual vs cenário ajustado</CardDescription>
                </div>
                <div className="flex gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-sm bg-slate-400" />
                    Plano atual
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-sm bg-brand-500" />
                    Cenário ajustado
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <CompareChart series={series} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  tone,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  tone: 'success' | 'warning';
  onChange: (v: number) => void;
}) {
  const corValor = tone === 'success' ? 'text-emerald-700' : 'text-amber-700';
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label className="text-xs font-medium text-slate-700">{label}</label>
        <span className={`text-sm font-bold tabular-nums ${value > 0 ? corValor : 'text-slate-400'}`}>
          {value > 0 ? '+' : ''}
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-brand-600"
      />
      <div className="flex justify-between text-[10px] text-slate-400 mt-1 tabular-nums">
        <span>0{suffix}</span>
        <span>
          {max}
          {suffix}
        </span>
      </div>
    </div>
  );
}

function DeltaCard({
  label,
  base,
  novo,
  delta,
  fmt,
  positivoBom,
}: {
  label: string;
  base: string;
  novo: string;
  delta: number;
  fmt: (n: number) => string;
  positivoBom?: boolean;
}) {
  const bom = positivoBom ? delta > 0 : delta > 0;
  const ruim = positivoBom ? delta < 0 : delta < 0;
  const cor = delta === 0 ? 'text-slate-500' : bom ? 'text-emerald-600' : ruim ? 'text-red-600' : 'text-slate-500';
  const Icon = delta === 0 ? null : bom ? TrendingUp : TrendingDown;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-[10px] uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-lg font-bold tabular-nums tracking-tight text-slate-900 mt-1">{novo}</p>
      <div className="flex items-center justify-between mt-2 text-xs">
        <span className="text-slate-400 tabular-nums">base: {base}</span>
        <span className={`inline-flex items-center gap-1 font-semibold tabular-nums ${cor}`}>
          {Icon && <Icon size={12} />}
          {delta > 0 ? '+' : ''}
          {fmt(delta)}
        </span>
      </div>
    </div>
  );
}
