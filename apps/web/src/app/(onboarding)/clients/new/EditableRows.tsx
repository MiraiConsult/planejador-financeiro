'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Trash2 } from 'lucide-react';
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
import { Input, Label } from '@/components/ui/Input';
import { CurrencyInput } from './helpers';
import type { DraftAsset, DraftExpense, DraftLiability } from './types';

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const brlK = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(abs / 1_000).toFixed(0)}k`;
  return `${abs.toFixed(0)}`;
};

// ─── Genérico: linha colapsável com header customizado e form children ───

function Row({
  header,
  rightValue,
  rightSubtitle,
  onRemove,
  children,
  valueClassName,
}: {
  header: React.ReactNode;
  rightValue: string;
  rightSubtitle?: string;
  onRemove: () => void;
  children: React.ReactNode;
  valueClassName?: string;
}) {
  const [expanded, setExpanded] = useState(false);
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
        {header}
        <div className="shrink-0 text-right">
          <p className={`text-sm font-semibold tabular-nums ${valueClassName ?? 'text-slate-900'}`}>
            {rightValue}
          </p>
          {rightSubtitle && <p className="text-[10px] text-slate-400 leading-tight">{rightSubtitle}</p>}
        </div>
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
          {children}
        </div>
      )}
    </li>
  );
}

// ─── Mini-gráfico genérico (linha ou barra) ───

function MiniChart({
  data,
  color,
  kind,
  caption,
}: {
  data: { idade: number; v: number }[];
  color: string;
  kind: 'line' | 'bar';
  caption: string;
}) {
  if (data.length === 0) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-[11px] text-slate-500 mb-2">{caption}</p>
      <div style={{ height: 140, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          {kind === 'line' ? (
            <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="idade" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={brlK} width={48} />
              <ReferenceLine y={0} stroke="#cbd5e1" />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0]!.payload as { idade: number; v: number };
                  return (
                    <div className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-sm">
                      <p className="font-medium text-slate-900">aos {p.idade}</p>
                      <p className="tabular-nums text-slate-700">{brl(p.v)}</p>
                    </div>
                  );
                }}
              />
              <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="idade" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={brlK} width={48} />
              <ReferenceLine y={0} stroke="#cbd5e1" />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0]!.payload as { idade: number; v: number };
                  if (p.v === 0) return null;
                  return (
                    <div className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-sm">
                      <p className="font-medium text-slate-900">aos {p.idade}</p>
                      <p className="tabular-nums text-slate-700">{brl(p.v)}</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="v" fill={color} radius={[2, 2, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Asset estoque (patrimônio físico/financeiro) ───

const assetTipoLabels: Record<string, string> = {
  financeiro_liquido: 'Aplicação financeira',
  imovel: 'Imóvel',
  terreno: 'Terreno',
  carro: 'Veículo',
  heranca_recebida: 'Herança',
  salario: 'Salário',
  aluguel: 'Aluguel/Arrendamento',
  outro: 'Outro',
};

export function EditableAssetEstoqueRow({
  a,
  icon: Icon,
  cor,
  expectativaVida,
  idadeAtual,
  onUpdate,
  onRemove,
}: {
  a: DraftAsset;
  icon: React.ComponentType<{ size?: number }>;
  cor: string;
  expectativaVida: number;
  idadeAtual: number;
  onUpdate: (u: DraftAsset) => void;
  onRemove: () => void;
}) {
  // Curva de valor de mercado: por simplicidade no onboarding,
  // mantemos plana (valor não muda) entre idade atual e idade_fim.
  const chartData = useMemo(() => {
    const fim = a.idade_fim || expectativaVida;
    const inicio = Math.min(idadeAtual, a.idade_inicio || idadeAtual);
    if (fim <= inicio) return [];
    const pts: { idade: number; v: number }[] = [];
    for (let i = inicio; i <= fim; i++) {
      pts.push({ idade: i, v: a.valor });
    }
    return pts;
  }, [a, idadeAtual, expectativaVida]);

  return (
    <Row
      header={
        <>
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ring-1 ring-inset shrink-0 ${cor}`}>
            <Icon size={15} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900 truncate">{a.nome}</p>
            <p className="text-xs text-slate-500">
              {assetTipoLabels[a.tipo] ?? a.tipo} · vale até os {a.idade_fim}
            </p>
          </div>
        </>
      }
      rightValue={brl(a.valor)}
      onRemove={onRemove}
    >
      <MiniChart
        data={chartData}
        color="#8b5cf6"
        kind="line"
        caption={`Valor estimado projetado (${brl(a.valor)} sustentado entre ${idadeAtual} e ${a.idade_fim})`}
      />
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor={`an-${a.id}`}>Nome</Label>
          <Input
            id={`an-${a.id}`}
            value={a.nome}
            onChange={(e) => onUpdate({ ...a, nome: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`av-${a.id}`}>Valor</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
              R$
            </span>
            <CurrencyInput
              id={`av-${a.id}`}
              value={a.valor}
              onChangeNumber={(n) => onUpdate({ ...a, valor: n })}
              className="pl-9 tabular-nums"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`ai-${a.id}`}>Quando avaliar até</Label>
          <Input
            id={`ai-${a.id}`}
            type="number"
            value={a.idade_fim}
            onChange={(e) => onUpdate({ ...a, idade_fim: Number(e.target.value) || a.idade_fim })}
            className="tabular-nums"
          />
        </div>
      </div>
    </Row>
  );
}

// ─── Asset fluxo (receita anual) ───

export function EditableAssetFluxoRow({
  a,
  icon: Icon,
  cor,
  expectativaVida,
  idadeAtual,
  onUpdate,
  onRemove,
}: {
  a: DraftAsset;
  icon: React.ComponentType<{ size?: number }>;
  cor: string;
  expectativaVida: number;
  idadeAtual: number;
  onUpdate: (u: DraftAsset) => void;
  onRemove: () => void;
}) {
  // Receita anual: barra em cada ano dentro de [idade_inicio, idade_fim]; 0 fora.
  const chartData = useMemo(() => {
    const pts: { idade: number; v: number }[] = [];
    for (let i = idadeAtual; i <= expectativaVida; i++) {
      const dentro = i >= a.idade_inicio && i <= a.idade_fim;
      pts.push({ idade: i, v: dentro ? a.valor : 0 });
    }
    return pts;
  }, [a, idadeAtual, expectativaVida]);

  return (
    <Row
      header={
        <>
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ring-1 ring-inset shrink-0 ${cor}`}>
            <Icon size={15} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900 truncate">{a.nome}</p>
            <p className="text-xs text-slate-500">
              {assetTipoLabels[a.tipo] ?? a.tipo} · {a.idade_inicio}–{a.idade_fim}
            </p>
          </div>
        </>
      }
      rightValue={brl(a.valor)}
      rightSubtitle="/ano"
      valueClassName="text-emerald-600"
      onRemove={onRemove}
    >
      <MiniChart
        data={chartData}
        color="#10b981"
        kind="bar"
        caption={`Receita anual entre ${a.idade_inicio} e ${a.idade_fim} anos`}
      />
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor={`fn-${a.id}`}>Descrição</Label>
          <Input
            id={`fn-${a.id}`}
            value={a.nome}
            onChange={(e) => onUpdate({ ...a, nome: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`fv-${a.id}`}>Valor anual</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
              R$
            </span>
            <CurrencyInput
              id={`fv-${a.id}`}
              value={a.valor}
              onChangeNumber={(n) => onUpdate({ ...a, valor: n })}
              className="pl-9 tabular-nums"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor={`fi-${a.id}`}>De</Label>
            <Input
              id={`fi-${a.id}`}
              type="number"
              value={a.idade_inicio}
              onChange={(e) => onUpdate({ ...a, idade_inicio: Number(e.target.value) || 0 })}
              className="tabular-nums"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`ff-${a.id}`}>Até</Label>
            <Input
              id={`ff-${a.id}`}
              type="number"
              value={a.idade_fim}
              onChange={(e) => onUpdate({ ...a, idade_fim: Number(e.target.value) || 0 })}
              className="tabular-nums"
            />
          </div>
        </div>
      </div>
    </Row>
  );
}

// ─── Despesa mensal ───

export function EditableExpenseRow({
  e,
  icon: Icon,
  cor,
  label,
  expectativaVida,
  idadeAtual,
  onUpdate,
  onRemove,
}: {
  e: DraftExpense;
  icon: React.ComponentType<{ size?: number }>;
  cor: string;
  label: string;
  expectativaVida: number;
  idadeAtual: number;
  onUpdate: (u: DraftExpense) => void;
  onRemove: () => void;
}) {
  // Despesa anual = valor_mensal × 12, dentro do período.
  const chartData = useMemo(() => {
    const anual = e.valor_mensal * 12;
    const pts: { idade: number; v: number }[] = [];
    for (let i = idadeAtual; i <= expectativaVida; i++) {
      const dentro = i >= e.idade_inicio && i <= e.idade_fim;
      pts.push({ idade: i, v: dentro ? anual : 0 });
    }
    return pts;
  }, [e, idadeAtual, expectativaVida]);

  return (
    <Row
      header={
        <>
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ring-1 ring-inset shrink-0 ${cor}`}>
            <Icon size={15} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900 truncate">{e.descricao}</p>
            <p className="text-xs text-slate-500">
              {label} · {e.idade_inicio}–{e.idade_fim}
              {e.essencial && ' · essencial'}
            </p>
          </div>
        </>
      }
      rightValue={brl(e.valor_mensal)}
      rightSubtitle="/mês"
      valueClassName="text-red-600"
      onRemove={onRemove}
    >
      <MiniChart
        data={chartData}
        color="#ef4444"
        kind="bar"
        caption={`Despesa anual entre ${e.idade_inicio} e ${e.idade_fim} (${brl(e.valor_mensal * 12)}/ano)`}
      />
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor={`ed-${e.id}`}>Descrição</Label>
          <Input
            id={`ed-${e.id}`}
            value={e.descricao}
            onChange={(ev) => onUpdate({ ...e, descricao: ev.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`ev-${e.id}`}>Valor mensal</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
              R$
            </span>
            <CurrencyInput
              id={`ev-${e.id}`}
              value={e.valor_mensal}
              onChangeNumber={(n) => onUpdate({ ...e, valor_mensal: n })}
              className="pl-9 tabular-nums"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor={`ei-${e.id}`}>De</Label>
            <Input
              id={`ei-${e.id}`}
              type="number"
              value={e.idade_inicio}
              onChange={(ev) => onUpdate({ ...e, idade_inicio: Number(ev.target.value) || 0 })}
              className="tabular-nums"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`ef-${e.id}`}>Até</Label>
            <Input
              id={`ef-${e.id}`}
              type="number"
              value={e.idade_fim}
              onChange={(ev) => onUpdate({ ...e, idade_fim: Number(ev.target.value) || 0 })}
              className="tabular-nums"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
          <input
            type="checkbox"
            checked={e.essencial}
            onChange={(ev) => onUpdate({ ...e, essencial: ev.target.checked })}
            className="rounded"
          />
          Despesa essencial (não pode cortar na simulação)
        </label>
      </div>
    </Row>
  );
}

// ─── Passivo ───

export function EditableLiabilityRow({
  l,
  label,
  expectativaVida,
  idadeAtual,
  onUpdate,
  onRemove,
}: {
  l: DraftLiability;
  label: string;
  expectativaVida: number;
  idadeAtual: number;
  onUpdate: (u: DraftLiability) => void;
  onRemove: () => void;
}) {
  // Saldo devedor projetado: saldo*(1+juros) − parcela_anual ano a ano,
  // floor 0. Mostra a amortização da dívida.
  const chartData = useMemo(() => {
    const juros = l.juros_aa ?? 0;
    const parcAnual = l.parcela_mensal * 12;
    const pts: { idade: number; v: number }[] = [];
    let saldo = l.saldo_atual;
    for (let i = idadeAtual; i <= expectativaVida; i++) {
      if (i < l.idade_inicio) {
        pts.push({ idade: i, v: l.saldo_atual });
        continue;
      }
      if (i > l.idade_fim || saldo <= 0) {
        pts.push({ idade: i, v: 0 });
        continue;
      }
      if (i > idadeAtual) {
        saldo = Math.max(0, saldo * (1 + juros) - parcAnual);
      }
      pts.push({ idade: i, v: saldo });
    }
    return pts;
  }, [l, idadeAtual, expectativaVida]);

  const saldoFinal = chartData[chartData.length - 1]?.v ?? 0;
  const quitouAos = chartData.find((p) => p.v === 0 && p.idade >= l.idade_inicio)?.idade;

  return (
    <Row
      header={
        <>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center ring-1 ring-inset shrink-0 bg-orange-50 text-orange-600 ring-orange-100">
            <CreditCardIcon />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900 truncate">{l.nome}</p>
            <p className="text-xs text-slate-500">
              {label} · {brl(l.parcela_mensal)}/mês
            </p>
          </div>
        </>
      }
      rightValue={brl(l.saldo_atual)}
      valueClassName="text-orange-600"
      onRemove={onRemove}
    >
      <MiniChart
        data={chartData}
        color="#f97316"
        kind="line"
        caption={
          quitouAos
            ? `Saldo devedor cai até zerar aos ${quitouAos} anos`
            : `Saldo devedor projetado · ainda restam ${brl(saldoFinal)} aos ${expectativaVida} (ajuste parcela ou prazo pra quitar)`
        }
      />
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor={`ln-${l.id}`}>Nome</Label>
          <Input
            id={`ln-${l.id}`}
            value={l.nome}
            onChange={(e) => onUpdate({ ...l, nome: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`ls-${l.id}`}>Saldo devedor</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
              R$
            </span>
            <CurrencyInput
              id={`ls-${l.id}`}
              value={l.saldo_atual}
              onChangeNumber={(n) => onUpdate({ ...l, saldo_atual: n })}
              className="pl-9 tabular-nums"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`lp-${l.id}`}>Parcela mensal</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
              R$
            </span>
            <CurrencyInput
              id={`lp-${l.id}`}
              value={l.parcela_mensal}
              onChangeNumber={(n) => onUpdate({ ...l, parcela_mensal: n })}
              className="pl-9 tabular-nums"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`lj-${l.id}`}>Juros a.a. (%)</Label>
          <div className="relative">
            <Input
              id={`lj-${l.id}`}
              type="number"
              step="0.1"
              value={l.juros_aa !== null ? (l.juros_aa * 100).toString() : ''}
              onChange={(e) =>
                onUpdate({
                  ...l,
                  juros_aa: e.target.value ? Number(e.target.value) / 100 : null,
                })
              }
              className="pr-8 tabular-nums"
              placeholder="10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
              %
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor={`li-${l.id}`}>Pagando de</Label>
            <Input
              id={`li-${l.id}`}
              type="number"
              value={l.idade_inicio}
              onChange={(e) => onUpdate({ ...l, idade_inicio: Number(e.target.value) || 0 })}
              className="tabular-nums"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`lf-${l.id}`}>Até</Label>
            <Input
              id={`lf-${l.id}`}
              type="number"
              value={l.idade_fim}
              onChange={(e) => onUpdate({ ...l, idade_fim: Number(e.target.value) || 0 })}
              className="tabular-nums"
            />
          </div>
        </div>
      </div>
    </Row>
  );
}

function CreditCardIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}
