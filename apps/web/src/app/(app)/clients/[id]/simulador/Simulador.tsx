'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, Loader2, Plus, RotateCcw, Save, Target, Trash2, TrendingDown, TrendingUp, X } from 'lucide-react';
import { simulate, type Client, type SimulationInput, type SimulationResult } from '@planejador/engine';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { toast } from '@/components/ui/Toast';
import { CompareChart } from '@/components/charts/CompareChart';
import {
  aplicarSimuladorState,
  somaAjustada,
  type SimuladorMeta,
  type SimuladorState,
} from '@/lib/simuladorState';
import { salvarCenarioPersonalizado } from './actions';

interface Props {
  clientId: string;
  input: { client: Client; input: SimulationInput };
}

// Mantemos aliases curtos pros tipos do módulo compartilhado para
// minimizar diff no JSX abaixo.
type Meta = SimuladorMeta;
type Ajustes = SimuladorState['ajustes'];

const ZERO: Ajustes = {
  receitaPct: 0,
  gastosPct: 0,
  sonhosPct: 0,
  desReceita: [],
  desGastos: [],
  desSonhos: [],
};

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

function toggle(arr: string[], id: string): string[] {
  return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
}

export function Simulador({ clientId, input }: Props) {
  const [a, setA] = useState<Ajustes>(ZERO);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [modalMeta, setModalMeta] = useState(false);
  const [modalSalvar, setModalSalvar] = useState(false);

  const baseResult = useMemo<SimulationResult>(() => simulate(input.input), [input.input]);
  const ajustadoResult = useMemo<SimulationResult>(
    () => simulate(aplicarSimuladorState(input.input, { ajustes: a, metas })),
    [input.input, a, metas],
  );

  const tocado =
    a.receitaPct !== 0 || a.gastosPct !== 0 || a.sonhosPct !== 0 || metas.length > 0;

  const sBase = baseResult.summary;
  const sNovo = ajustadoResult.summary;
  const deltaPatrimonio = sNovo.patrimonio_final - sBase.patrimonio_final;
  const deltaPico = sNovo.patrimonio_pico - sBase.patrimonio_pico;
  const deltaBreakEven =
    (sNovo.idade_break_even ?? Infinity) - (sBase.idade_break_even ?? Infinity);

  // Composição: usamos os valores CADASTRADOS (anuais), não a linha 0 da
  // simulação. Senão um cliente cujas receitas só começam em alguns anos
  // (aposentadoria/aluguéis) veria "R$ 0" no slider, mesmo tendo dados.
  const ativosFluxo = input.input.assets.filter((x) => x.natureza === 'fluxo');
  const receitaBase = ativosFluxo.reduce((s, x) => s + x.valor, 0);
  const composicaoReceita = ativosFluxo
    .map((x) => ({
      id: x.id,
      nome: x.nome,
      valor: x.valor,
      sub: rangeIdade(x.idade_inicio, x.idade_fim),
    }))
    .sort((x, y) => y.valor - x.valor);
  const receitaNovo = somaAjustada(composicaoReceita, a.receitaPct, a.desReceita);

  const gastosBase = input.input.expenses.reduce((s, x) => s + x.valor_mensal * 12, 0);
  const composicaoGastos = agruparPorCategoria(input.input.expenses).sort(
    (x, y) => y.valor - x.valor,
  );
  const gastosNovo = somaAjustada(composicaoGastos, a.gastosPct, a.desGastos);

  const sonhos = input.input.events.filter((e) => e.tipo === 'sonho');
  const somaSonhosBase = sonhos.reduce((s, e) => s + Math.abs(e.valor), 0);
  const composicaoSonhos = sonhos.map((e) => ({
    id: e.id,
    nome: e.descricao,
    valor: Math.abs(e.valor),
    sub: e.idade_inicio ? `aos ${e.idade_inicio}` : undefined,
  }));
  const somaSonhosNovo = somaAjustada(composicaoSonhos, a.sonhosPct, a.desSonhos);

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
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            disabled={!tocado}
            onClick={() => setModalSalvar(true)}
            title={tocado ? 'Salvar como cenário' : 'Ajuste algo para salvar'}
          >
            <Save size={14} />
            Salvar como cenário
          </Button>
          <Link href={`/clients/${clientId}/balanco`} title="Fechar">
            <Button variant="ghost" size="sm" aria-label="Fechar">
              <X size={16} />
            </Button>
          </Link>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600">
          Simulador interativo
        </p>
        <h1 className="text-display-sm font-bold tracking-tight text-slate-900 mt-1">
          Comparação de cenários
        </h1>
        <p className="text-sm text-slate-500 mt-1 leading-relaxed max-w-2xl">
          Ajuste as variáveis e veja o impacto no patrimônio em tempo real. Slider à direita
          aumenta, à esquerda reduz. Nada é salvo até você confirmar.
        </p>
      </div>

      <div className="grid lg:grid-cols-[380px_1fr] gap-6">
        {/* Painel de controles */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="border-b border-slate-100/70">
              <div className="flex items-center justify-between">
                <CardTitle>Controles</CardTitle>
                <button
                  type="button"
                  onClick={() => {
                    setA(ZERO);
                    setMetas([]);
                  }}
                  disabled={!tocado}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Zerar ajustes"
                >
                  <RotateCcw size={12} />
                  Zerar
                </button>
              </div>
              <CardDescription>Aplica em todos os itens da categoria.</CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              <ControleCategoria
                label="Receita"
                value={a.receitaPct}
                min={-50}
                max={100}
                step={1}
                valorBase={receitaBase}
                valorNovo={receitaNovo}
                unidade="anual cadastrada"
                composicao={composicaoReceita}
                desativados={a.desReceita}
                onToggle={(id) => setA({ ...a, desReceita: toggle(a.desReceita, id) })}
                onSelecionarTodos={(selecionar) =>
                  setA({ ...a, desReceita: selecionar ? [] : composicaoReceita.map((x) => x.id) })
                }
                composicaoVazia="Nenhuma receita cadastrada."
                onChange={(v) => setA({ ...a, receitaPct: v })}
              />
              <Separador />
              <ControleCategoria
                label="Gastos gerais"
                value={a.gastosPct}
                min={-50}
                max={100}
                step={1}
                valorBase={gastosBase}
                valorNovo={gastosNovo}
                unidade="anual cadastrado"
                bomEAumentar={false}
                composicao={composicaoGastos}
                desativados={a.desGastos}
                onToggle={(id) => setA({ ...a, desGastos: toggle(a.desGastos, id) })}
                onSelecionarTodos={(selecionar) =>
                  setA({ ...a, desGastos: selecionar ? [] : composicaoGastos.map((x) => x.id) })
                }
                composicaoVazia="Nenhuma despesa cadastrada."
                onChange={(v) => setA({ ...a, gastosPct: v })}
              />
              <Separador />
              <ControleCategoria
                label="Sonhos"
                value={a.sonhosPct}
                min={-100}
                max={100}
                step={5}
                valorBase={somaSonhosBase}
                valorNovo={somaSonhosNovo}
                unidade="total"
                bomEAumentar={false}
                composicao={composicaoSonhos}
                desativados={a.desSonhos}
                onToggle={(id) => setA({ ...a, desSonhos: toggle(a.desSonhos, id) })}
                onSelecionarTodos={(selecionar) =>
                  setA({ ...a, desSonhos: selecionar ? [] : composicaoSonhos.map((x) => x.id) })
                }
                composicaoVazia="Nenhum sonho cadastrado."
                onChange={(v) => setA({ ...a, sonhosPct: v })}
              />
            </CardContent>
          </Card>

          {/* Metas pontuais */}
          <Card>
            <CardHeader className="border-b border-slate-100/70">
              <div className="flex items-center justify-between">
                <CardTitle>Metas pontuais</CardTitle>
                <button
                  type="button"
                  onClick={() => setModalMeta(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
                >
                  <Plus size={12} />
                  Adicionar
                </button>
              </div>
              <CardDescription>
                Compras únicas que adicionam saída no ano alvo (ex.: comprar casa).
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-3">
              {metas.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Nenhuma meta adicionada.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {metas.map((m) => (
                    <li key={m.id} className="flex items-center justify-between py-2 text-xs">
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-slate-800 truncate flex items-center gap-1.5">
                          <Target size={11} className="text-brand-600 flex-shrink-0" />
                          {m.descricao}
                        </p>
                        <p className="text-[10px] text-slate-400 tabular-nums">
                          aos {m.idade} anos · {m.tipo}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold tabular-nums text-red-600">
                          {brl(-m.valor)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setMetas(metas.filter((x) => x.id !== m.id))}
                          className="text-slate-400 hover:text-red-600"
                          title="Remover"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Painel de impacto */}
        <div className="space-y-6">
          <div className="grid sm:grid-cols-3 gap-3">
            <DeltaCard
              label="Patrimônio final"
              novo={brlCompact(sNovo.patrimonio_final)}
              base={brlCompact(sBase.patrimonio_final)}
              delta={deltaPatrimonio}
              fmt={brlCompact}
            />
            <DeltaCard
              label="Pico patrimonial"
              novo={brlCompact(sNovo.patrimonio_pico)}
              base={brlCompact(sBase.patrimonio_pico)}
              delta={deltaPico}
              fmt={brlCompact}
            />
            <DeltaCard
              label="Idade de exaustão"
              novo={sNovo.idade_break_even ? `${sNovo.idade_break_even}a` : 'nunca'}
              base={sBase.idade_break_even ? `${sBase.idade_break_even}a` : 'nunca'}
              delta={Number.isFinite(deltaBreakEven) ? deltaBreakEven : 0}
              fmt={(n) => (n === 0 ? '=' : `${n > 0 ? '+' : ''}${n.toFixed(0)}a`)}
            />
          </div>

          {metas.length > 0 && (
            <div className="rounded-2xl border border-brand-200 bg-brand-50/50 px-4 py-3 text-xs text-brand-900">
              <strong>{metas.length}</strong>{' '}
              {metas.length === 1 ? 'meta adicionada' : 'metas adicionadas'} no cenário ajustado.
            </div>
          )}

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

      <ModalNovaMeta
        open={modalMeta}
        onClose={() => setModalMeta(false)}
        idadeMin={baseResult.rows[0]?.idade ?? 0}
        idadeMax={baseResult.rows[baseResult.rows.length - 1]?.idade ?? 100}
        onAdd={(m) => {
          setMetas([...metas, { ...m, id: crypto.randomUUID() }]);
          setModalMeta(false);
        }}
      />

      <ModalSalvarCenario
        open={modalSalvar}
        onClose={() => setModalSalvar(false)}
        clientId={clientId}
        state={{ ajustes: a, metas }}
      />
    </div>
  );
}

function ModalSalvarCenario({
  open,
  onClose,
  clientId,
  state,
}: {
  open: boolean;
  onClose: () => void;
  clientId: string;
  state: SimuladorState;
}) {
  const [nome, setNome] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!nome.trim()) return;
    setSalvando(true);
    const res = await salvarCenarioPersonalizado({
      client_id: clientId,
      nome: nome.trim(),
      state,
    });
    setSalvando(false);
    if (!res.ok) {
      toast.error(res.error ?? 'Erro ao salvar');
      return;
    }
    toast.success(`Cenário "${nome.trim()}" salvo`);
    setNome('');
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} size="sm" title="Salvar como cenário">
      <div className="space-y-4 p-1">
        <p className="text-xs text-slate-500 leading-relaxed">
          O cenário fica disponível em <strong>Comparar cenários</strong>, junto com base /
          otimista / pessimista. Você pode salvar quantos quiser.
        </p>
        <Campo label="Nome do cenário">
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Casa em Floripa + corte de gastos"
            maxLength={100}
            className={inputCls}
            autoFocus
          />
        </Campo>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose} type="button" disabled={salvando}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={salvar}
            type="button"
            disabled={salvando || !nome.trim()}
          >
            {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Salvar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function ModalNovaMeta({
  open,
  onClose,
  idadeMin,
  idadeMax,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  idadeMin: number;
  idadeMax: number;
  onAdd: (m: Omit<Meta, 'id'>) => void;
}) {
  const [descricao, setDescricao] = useState('');
  const [idade, setIdade] = useState<number | ''>('');
  const [valor, setValor] = useState<number | ''>('');
  const [tipo, setTipo] = useState<Meta['tipo']>('compra');

  function reset() {
    setDescricao('');
    setIdade('');
    setValor('');
    setTipo('compra');
  }
  function fechar() {
    reset();
    onClose();
  }

  const valido =
    descricao.trim().length > 0 &&
    typeof idade === 'number' &&
    idade >= idadeMin &&
    idade <= idadeMax &&
    typeof valor === 'number' &&
    valor > 0;

  function salvar() {
    if (!valido) return;
    onAdd({
      descricao: descricao.trim(),
      idade: idade as number,
      valor: valor as number,
      tipo,
    });
    reset();
  }

  return (
    <Dialog open={open} onClose={fechar} size="sm" title="Nova meta pontual">
      <div className="space-y-4 p-1">
        <Campo label="Descrição">
          <input
            type="text"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Comprar casa em Floripa"
            className={inputCls}
            autoFocus
          />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label={`Idade alvo (${idadeMin}–${idadeMax})`}>
            <input
              type="number"
              min={idadeMin}
              max={idadeMax}
              value={idade}
              onChange={(e) => setIdade(e.target.value ? parseInt(e.target.value) : '')}
              className={inputCls}
            />
          </Campo>
          <Campo label="Valor (R$)">
            <input
              type="number"
              min={0}
              step={1000}
              value={valor}
              onChange={(e) => setValor(e.target.value ? parseFloat(e.target.value) : '')}
              className={inputCls}
            />
          </Campo>
        </div>
        <Campo label="Tipo">
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as Meta['tipo'])}
            className={inputCls}
          >
            <option value="compra">Compra única</option>
            <option value="sonho">Sonho</option>
            <option value="viagem_pontual">Viagem pontual</option>
          </select>
        </Campo>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={fechar} type="button">
            Cancelar
          </Button>
          <Button variant="primary" size="sm" onClick={salvar} disabled={!valido} type="button">
            Adicionar meta
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

function Separador() {
  return <div className="h-px bg-slate-100" />;
}

function rangeIdade(ini?: number, fim?: number): string | undefined {
  if (ini == null && fim == null) return undefined;
  if (ini != null && fim != null) return `${ini}–${fim}`;
  if (ini != null) return `a partir de ${ini}`;
  return `até ${fim}`;
}

function agruparPorCategoria(
  expenses: SimulationInput['expenses'],
): { id: string; nome: string; valor: number; sub?: string }[] {
  const acc: Record<string, number> = {};
  for (const e of expenses) {
    const anual = e.valor_mensal * 12;
    acc[e.categoria] = (acc[e.categoria] ?? 0) + anual;
  }
  return Object.entries(acc).map(([nome, valor]) => ({ id: nome, nome, valor }));
}

function ControleCategoria({
  label,
  value,
  min,
  max,
  step,
  valorBase,
  valorNovo,
  unidade,
  composicao,
  desativados,
  onToggle,
  onSelecionarTodos,
  composicaoVazia,
  onChange,
  bomEAumentar = true,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  valorBase: number;
  valorNovo: number;
  unidade: string;
  composicao: { id: string; nome: string; valor: number; sub?: string }[];
  desativados: string[];
  onToggle: (id: string) => void;
  onSelecionarTodos: (selecionar: boolean) => void;
  composicaoVazia: string;
  onChange: (v: number) => void;
  bomEAumentar?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const desSet = new Set(desativados);
  const algumDesmarcado = composicao.some((x) => desSet.has(x.id));
  const todosDesmarcados = composicao.length > 0 && composicao.every((x) => desSet.has(x.id));
  const delta = valorNovo - valorBase;
  const tocado = value !== 0;
  const positivoBom = bomEAumentar ? delta > 0 : delta < 0;
  const negativoBom = bomEAumentar ? delta < 0 : delta > 0;
  const corDelta = !tocado
    ? 'text-slate-400'
    : positivoBom
      ? 'text-emerald-600'
      : negativoBom
        ? 'text-red-600'
        : 'text-slate-500';

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-sm font-semibold text-slate-800">{label}</label>
        <span
          className={`text-sm font-bold tabular-nums ${
            value === 0 ? 'text-slate-400' : value > 0 ? 'text-emerald-700' : 'text-red-700'
          }`}
        >
          {value > 0 ? '+' : ''}
          {value}%
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
      <div className="flex justify-between text-[10px] text-slate-400 mt-0.5 tabular-nums">
        <span>{min}%</span>
        <span className="text-slate-500">0%</span>
        <span>
          +{max}%
        </span>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md bg-slate-50 px-2.5 py-1.5">
          <p className="text-[9px] uppercase tracking-widest text-slate-400">Atual {unidade}</p>
          <p className="font-bold tabular-nums text-slate-700 mt-0.5">{brl(valorBase)}</p>
        </div>
        <div className={`rounded-md px-2.5 py-1.5 ${tocado ? 'bg-brand-50' : 'bg-slate-50'}`}>
          <p className="text-[9px] uppercase tracking-widest text-slate-400">Ajustado</p>
          <p className={`font-bold tabular-nums mt-0.5 ${tocado ? 'text-brand-700' : 'text-slate-700'}`}>
            {brl(valorNovo)}
          </p>
        </div>
      </div>

      {tocado && (
        <p className={`mt-1.5 text-[11px] font-medium tabular-nums ${corDelta}`}>
          Δ {delta > 0 ? '+' : ''}
          {brl(delta)}
        </p>
      )}

      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800"
        aria-expanded={aberto}
      >
        <ChevronDown
          size={11}
          className={`transition-transform ${aberto ? 'rotate-180' : ''}`}
        />
        {aberto
          ? 'Ocultar composição'
          : `Ver composição (${composicao.length - desativados.filter((d) => composicao.some((c) => c.id === d)).length}/${composicao.length})`}
      </button>

      {aberto && (
        <div className="mt-2 rounded-md border border-slate-200 bg-white">
          {composicao.length === 0 ? (
            <p className="px-3 py-2 text-[11px] text-slate-400 italic">{composicaoVazia}</p>
          ) : (
            <>
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 bg-slate-50/60">
                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
                  Aplicar slider em
                </span>
                <button
                  type="button"
                  onClick={() => onSelecionarTodos(algumDesmarcado)}
                  className="text-[10px] font-semibold text-brand-700 hover:text-brand-800 uppercase tracking-widest"
                >
                  {todosDesmarcados || algumDesmarcado ? 'Marcar todos' : 'Desmarcar todos'}
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {composicao.map((item) => {
                  const desativado = desSet.has(item.id);
                  const itemNovo = desativado ? item.valor : item.valor * (1 + value / 100);
                  return (
                    <label
                      key={item.id}
                      className="flex items-center justify-between px-3 py-1.5 text-[11px] cursor-pointer hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <input
                          type="checkbox"
                          checked={!desativado}
                          onChange={() => onToggle(item.id)}
                          className="accent-brand-600 cursor-pointer flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <p
                            className={`truncate ${
                              desativado ? 'text-slate-400 line-through' : 'text-slate-700'
                            }`}
                          >
                            {item.nome}
                          </p>
                          {item.sub && (
                            <p className="text-[10px] text-slate-400 tabular-nums">{item.sub}</p>
                          )}
                        </div>
                      </div>
                      <span className="tabular-nums text-right whitespace-nowrap">
                        <span className={desativado ? 'text-slate-400' : 'text-slate-500'}>
                          {brl(item.valor)}
                        </span>
                        {tocado && !desativado && (
                          <>
                            <span className="text-slate-300 mx-1">→</span>
                            <span className="font-semibold text-brand-700">{brl(itemNovo)}</span>
                          </>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function DeltaCard({
  label,
  base,
  novo,
  delta,
  fmt,
}: {
  label: string;
  base: string;
  novo: string;
  delta: number;
  fmt: (n: number) => string;
}) {
  const cor = delta === 0 ? 'text-slate-500' : delta > 0 ? 'text-emerald-600' : 'text-red-600';
  const Icon = delta === 0 ? null : delta > 0 ? TrendingUp : TrendingDown;
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
