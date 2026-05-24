'use client';

import { useMemo } from 'react';
import { simulate, type SimulationInput, type Client as EngineClient, type Asset, type Expense, type FinancialEvent, type Liability, type Assumptions, type Scenario } from '@planejador/engine';
import { TrendingUp, TrendingDown, AlertTriangle, Sparkles, LineChart as LineChartIcon } from 'lucide-react';
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
import { StepShell } from '../StepShell';
import type { WizardState } from '../Wizard';

interface Props {
  state: WizardState;
}

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const brlK = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}R$ ${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}R$ ${(abs / 1_000).toFixed(0)}k`;
  return `${sign}R$ ${abs.toFixed(0)}`;
};

// Premissas default (espelham as do banco). Sem inflação — sistema nominal.
const DEFAULT_ASSUMPTIONS: Assumptions = {
  inflacao_anual_br: 0,
  retorno_conservador: 0.08,
  volatilidade_conservador: 0.04,
  retorno_moderado: 0.1,
  volatilidade_moderado: 0.08,
  retorno_arrojado: 0.13,
  volatilidade_arrojado: 0.15,
  valorizacao_imovel_uso: 0.04,
  taxa_desconto_npv: 0.06,
  imposto_renda_efetivo: 0.15,
  custo_credito_aa: 0.15,
};

const DEFAULT_SCENARIO: Scenario = { id: 'preview', nome: 'Preview', tipo: 'base' };

export function StepPreview({ state }: Props) {
  const result = useMemo(() => {
    if (!state.data_nascimento) return null;
    try {
      const client: EngineClient = {
        id: 'preview',
        nome_completo: state.nome_completo || 'Cliente',
        data_nascimento: state.data_nascimento,
        expectativa_vida_anos: state.expectativa_vida_anos,
        idade_aposentadoria: state.idade_aposentadoria ?? undefined,
        idade_reducao_trabalho: state.idade_reducao_trabalho ?? undefined,
        perfil_carteira: state.perfil_carteira,
        custom_retorno_aa: state.custom_retorno_aa ?? undefined,
        custom_volatilidade_aa: state.custom_volatilidade_aa ?? undefined,
      };
      const assets: Asset[] = state.assets.map((a) => ({
        id: a.id,
        nome: a.nome,
        tipo: a.tipo,
        natureza: a.natureza,
        valor: a.valor,
        idade_inicio: a.idade_inicio,
        idade_fim: a.idade_fim,
        indexado_inflacao: a.indexado_inflacao,
      }));
      const expenses: Expense[] = state.expenses.map((e) => ({
        id: e.id,
        categoria: e.categoria,
        descricao: e.descricao,
        valor_mensal: e.valor_mensal,
        idade_inicio: e.idade_inicio,
        idade_fim: e.idade_fim,
        indexado_inflacao: true,
        essencial: e.essencial,
      }));
      const events: FinancialEvent[] = state.events.map((ev) => ({
        id: ev.id,
        tipo: ev.tipo,
        descricao: ev.descricao,
        valor: ev.valor,
        padrao_recorrencia: ev.padrao_recorrencia,
        idade_inicio: ev.idade_inicio,
        idade_fim: ev.idade_fim ?? undefined,
        intervalo_anos: ev.intervalo_anos ?? undefined,
        indexado_inflacao: ev.indexado_inflacao,
      }));
      const liabilities: Liability[] = (state.liabilities ?? []).map((l) => ({
        id: l.id,
        nome: l.nome,
        tipo: l.tipo,
        saldo_atual: l.saldo_atual,
        juros_aa: l.juros_aa ?? undefined,
        parcela_mensal: l.parcela_mensal,
        idade_inicio: l.idade_inicio,
        idade_fim: l.idade_fim,
      }));
      const input: SimulationInput = {
        client,
        assets,
        expenses,
        events,
        liabilities,
        assumptions: DEFAULT_ASSUMPTIONS,
        scenario: DEFAULT_SCENARIO,
      };
      return simulate(input);
    } catch (err) {
      console.error('[StepPreview] simulate failed', err);
      return null;
    }
  }, [state]);

  const hasAnyData =
    state.assets.length > 0 ||
    state.expenses.length > 0 ||
    state.events.length > 0 ||
    (state.liabilities?.length ?? 0) > 0;

  if (!result || !hasAnyData) {
    return (
      <StepShell
        eyebrow="Quase lá"
        title="Pronto pra criar"
        description="Você não cadastrou números ainda — tudo bem, ajeitamos depois no painel do cliente. Clique em Finalizar pra criar."
      >
        <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/30 p-10 text-center">
          <Sparkles size={28} className="mx-auto text-slate-400 mb-3" />
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Sem dados suficientes pra simular agora. Você poderá adicionar ativos, receitas e
            despesas no painel do cliente depois de criar.
          </p>
        </div>
      </StepShell>
    );
  }

  const rows = result.rows;
  const chartData = rows.map((r) => ({
    idade: r.idade,
    patrimonio: r.patrimonio_total,
  }));

  const finalRow = rows[rows.length - 1]!;
  const summary = result.summary;
  const positivoFinal = finalRow.patrimonio_total > 0;
  const breakEven = summary.idade_break_even;
  const pico = summary.patrimonio_pico;
  const picoIdade = summary.patrimonio_pico_idade;

  let narrativa = '';
  if (positivoFinal && breakEven === null) {
    narrativa = `Seu cliente sustenta o plano até o fim sem se preocupar com dívidas — ${brl(
      finalRow.patrimonio_total,
    )} aos ${finalRow.idade} anos.`;
  } else if (positivoFinal && breakEven !== null) {
    narrativa = `O plano fecha positivo, mas em algum momento (idade ${breakEven}) o saldo financeiro líquido fica negativo e parte do patrimônio precisa ser liquidado pra cobrir.`;
  } else {
    narrativa = `Atenção: o plano não fecha. O patrimônio termina em ${brl(
      finalRow.patrimonio_total,
    )} aos ${finalRow.idade} anos. Considere reduzir despesas, aumentar receita ou rever sonhos.`;
  }

  return (
    <StepShell
      eyebrow="Quase lá"
      title="Olha o futuro que você desenhou"
      description="Rodamos uma simulação rápida com o que você cadastrou. Ainda dá pra mexer em tudo depois — esse é só um esboço pra te dar contexto."
    >
      <div className="space-y-6">
        {/* Cards de KPI */}
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
              Patrimônio final
            </p>
            <p
              className={`mt-1 text-xl font-bold tabular-nums ${
                positivoFinal ? 'text-slate-900 dark:text-slate-100' : 'text-red-600'
              }`}
            >
              {brlK(finalRow.patrimonio_total)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">aos {finalRow.idade} anos</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
              Pico de patrimônio
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums text-emerald-600 flex items-center gap-1">
              <TrendingUp size={16} />
              {brlK(pico)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">aos {picoIdade} anos</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
              Break-even
            </p>
            <p
              className={`mt-1 text-xl font-bold tabular-nums flex items-center gap-1 ${
                breakEven !== null ? 'text-amber-600' : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {breakEven !== null ? (
                <>
                  <AlertTriangle size={16} />
                  {breakEven} anos
                </>
              ) : (
                <>
                  <TrendingDown size={16} className="text-emerald-600" />
                  nunca
                </>
              )}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {breakEven !== null ? 'saldo fica negativo' : 'sustenta o plano todo'}
            </p>
          </div>
        </div>

        {/* Narrativa */}
        <div
          className={`rounded-xl border p-4 text-sm leading-relaxed ${
            positivoFinal && breakEven === null
              ? 'border-emerald-200 bg-emerald-50/40 text-emerald-900'
              : positivoFinal
                ? 'border-amber-200 bg-amber-50/40 text-amber-900'
                : 'border-red-200 bg-red-50/40 text-red-900'
          }`}
        >
          {narrativa}
        </div>

        {/* Gráfico */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <LineChartIcon size={14} className="text-brand-600" />
              Patrimônio ao longo da vida
            </p>
            <p className="text-[11px] text-slate-500">cenário base</p>
          </div>
          <div style={{ height: 280, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="idade"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={brlK}
                  width={70}
                />
                <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0]!.payload as { idade: number; patrimonio: number };
                    return (
                      <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs shadow-sm">
                        <p className="font-medium text-slate-900 dark:text-slate-100">aos {p.idade}</p>
                        <p className="tabular-nums text-slate-700">{brl(p.patrimonio)}</p>
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="patrimonio"
                  stroke={positivoFinal ? '#2563eb' : '#dc2626'}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4 text-sm">
          <p className="font-medium text-brand-900 mb-1">É só uma prévia.</p>
          <p className="text-brand-800/80 text-[13px]">
            Você terá acesso a cenários otimista/pessimista, edição em gráfico, ajustes ponto-a-ponto
            e simulação detalhada depois de criar o cliente.
          </p>
        </div>
      </div>
    </StepShell>
  );
}
