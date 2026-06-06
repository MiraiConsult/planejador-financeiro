'use client';

import { useMemo, useState, type ChangeEvent } from 'react';
import {
  Wallet,
  Building2,
  Car,
  Map as MapIcon,
  Briefcase,
  Banknote,
  CalendarHeart,
  Receipt,
  LineChart as LineChartIcon,
  TrendingDown,
  Trash2,
  Copy,
  ChevronDown,
} from 'lucide-react';
import { Input, Label } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { EditableSeriesChart } from '@/components/charts/EditableSeriesChart';
import { useAutoSave } from './useAutoSave';
import { SaveStatusIndicator } from './SaveStatus';
import { EditableSelect, type SelectOption } from './EditableSelect';
import {
  seriesEstoqueFisico,
  seriesAplicacaoFinanceira,
  seriesFluxoAnual,
} from './series';
import {
  patchEntity,
  undoDelete,
  deleteAsset,
  deleteExpense,
  deleteEvent,
  deleteLiability,
  duplicateAsset,
  duplicateExpense,
  duplicateEvent,
  duplicateLiability,
  convertEventToFinancing,
} from './actions';

// ─── tipos compartilhados ───

type Recorrencia = 'unico' | 'recorrente_anual' | 'recorrente_espacado';

interface AssetRow {
  id: string;
  nome: string;
  tipo: string;
  natureza: string;
  valor: number | string;
  idade_inicio: number;
  idade_fim: number;
  indexado_inflacao: boolean;
  taxa_retorno_aa: number | string | null;
  valorizacao_aa: number | string | null;
  crescimento_real_aa: number | string | null;
  padrao_recorrencia: string | null;
  intervalo_anos: number | null;
  aporte_mensal: number | string | null;
  idade_aporte_inicio: number | null;
  idade_aporte_fim: number | null;
  overrides: Record<string, number> | null;
}

interface ExpenseRow {
  id: string;
  categoria: string;
  descricao: string;
  valor_mensal: number | string;
  idade_inicio: number;
  idade_fim: number;
  indexado_inflacao: boolean;
  essencial: boolean;
  crescimento_real_aa: number | string | null;
  padrao_recorrencia: string | null;
  intervalo_anos: number | null;
  overrides: Record<string, number> | null;
}

interface EventRow {
  id: string;
  tipo: string;
  descricao: string;
  valor: number | string;
  padrao_recorrencia: string;
  idade_inicio: number;
  idade_fim: number | null;
  intervalo_anos: number | null;
  indexado_inflacao: boolean;
}

interface LiabilityRow {
  id: string;
  nome: string;
  tipo: string;
  saldo_atual: number | string;
  juros_aa: number | string | null;
  parcela_mensal: number | string;
  idade_inicio: number;
  idade_fim: number;
}

// ─── helpers ───

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

function toNumber(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function pctToFraction(v: string): number | null {
  if (v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n / 100;
}

function fractionToPct(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '';
  return (Number(v) * 100).toString();
}

const tipoIcon: Record<string, typeof Wallet> = {
  financeiro_liquido: Banknote,
  imovel: Building2,
  terreno: MapIcon,
  carro: Car,
  salario: Briefcase,
  aluguel: Wallet,
  heranca_recebida: Wallet,
  outro: Wallet,
};

const tipoOptions = [
  { value: 'financeiro_liquido', label: 'Aplicação financeira', natureza: 'estoque' },
  { value: 'imovel', label: 'Imóvel', natureza: 'estoque' },
  { value: 'terreno', label: 'Terreno', natureza: 'estoque' },
  { value: 'carro', label: 'Veículo', natureza: 'estoque' },
  { value: 'heranca_recebida', label: 'Herança', natureza: 'estoque' },
  { value: 'salario', label: 'Salário', natureza: 'fluxo' },
  { value: 'aluguel', label: 'Aluguel/Arrendamento', natureza: 'fluxo' },
  { value: 'outro', label: 'Outro', natureza: 'estoque' },
];

// Labels amigáveis das categorias de despesa (UI). Chaves continuam
// snake_case por compatibilidade com o enum do banco.
const expenseCategoryLabels: Record<string, string> = {
  moradia: 'Moradia',
  alimentacao: 'Alimentação',
  transporte: 'Transporte',
  saude: 'Saúde',
  lazer: 'Lazer',
  servicos_dom: 'Serviços domésticos',
  filhos: 'Filhos',
  estudos: 'Estudos',
  viagens: 'Viagens',
  cuidado_familia: 'Cuidado com a família',
  outro: 'Outro',
};

const expenseCategoryOptions = Object.entries(expenseCategoryLabels).map(([value, label]) => ({
  value,
  label,
}));

const recorrenciaLabels: Record<string, string> = {
  recorrente_anual: 'Todo ano',
  unico: 'Apenas no início',
  recorrente_espacado: 'A cada N anos',
};

const eventTipoLabels: Record<string, string> = {
  sonho: 'Sonho',
  compra: 'Compra',
  viagem_pontual: 'Viagem',
  heranca: 'Herança',
  imprevisto: 'Imprevisto',
  venda_ativo: 'Venda de ativo',
};

const liabilityTipoLabels: Record<string, string> = {
  financiamento_imovel: 'Financiamento imobiliário',
  emprestimo_pessoal: 'Empréstimo pessoal',
  cartao_credito: 'Cartão de crédito',
  consignado: 'Crédito consignado',
  financiamento_veiculo: 'Financiamento de veículo',
  outro: 'Outro',
};

const liabilityTipoOptions = Object.entries(liabilityTipoLabels).map(([value, label]) => ({
  value,
  label,
}));

const tipoLabel = (v: string) => tipoOptions.find((t) => t.value === v)?.label ?? v;

// ─── primitive: numeric field com label ───

function NumField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step,
  hint,
  className,
}: {
  label: string;
  value: number | string;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
  step?: number | string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className ?? ''}`}>
      <Label htmlFor={label}>{label}</Label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            {prefix}
          </span>
        )}
        <Input
          id={label}
          type="number"
          step={step ?? 1}
          value={value ?? ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          className={`tabular-nums ${prefix ? 'pl-9' : ''} ${suffix ? 'pr-8' : ''}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className ?? ''}`}>
      <Label htmlFor={label}>{label}</Label>
      <Input
        id={label}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className ?? ''}`}>
      <Label htmlFor={label}>{label}</Label>
      <select
        id={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-brand-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── card chrome reutilizável (colapsável) ───

function EditorCard({
  icon: Icon,
  title,
  subtitle,
  rightSummary,
  saveStatus,
  onDelete,
  onDuplicate,
  children,
}: {
  icon: typeof Wallet;
  title: string;
  subtitle?: string;
  /** Conteúdo à direita do header, mesmo quando colapsado (ex.: valor principal). */
  rightSummary?: React.ReactNode;
  saveStatus: React.ReactNode;
  onDelete: () => void;
  onDuplicate: () => void;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  function stop(e: React.MouseEvent) {
    e.stopPropagation();
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 text-left"
      >
        <ChevronDown
          size={14}
          className={`text-slate-300 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
        <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center shrink-0">
          <Icon size={15} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{title}</p>
          {subtitle && <p className="text-[11px] text-slate-500 truncate">{subtitle}</p>}
        </div>
        {rightSummary && <div className="shrink-0 text-right">{rightSummary}</div>}
        <div className="flex items-center gap-2 shrink-0 ml-2" onClick={stop}>
          {expanded && saveStatus}
          <button
            type="button"
            onClick={(e) => {
              stop(e);
              onDuplicate();
            }}
            className="text-slate-400 hover:text-slate-900 p-1"
            title="Duplicar"
          >
            <Copy size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              stop(e);
              onDelete();
            }}
            className="text-slate-400 hover:text-red-600 p-1"
            title="Excluir"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </button>
      {expanded && (
        <div className="p-5 space-y-5 border-t border-slate-100 bg-slate-50/40">{children}</div>
      )}
    </div>
  );
}

// ─── ASSET EDITOR ───

export function AssetEditor({
  asset,
  client_id,
  customTipos = [],
}: {
  asset: AssetRow;
  client_id: string;
  customTipos?: SelectOption[];
}) {
  const [local, setLocal] = useState({
    nome: asset.nome,
    tipo: asset.tipo,
    natureza: asset.natureza,
    valor: String(asset.valor ?? ''),
    idade_inicio: String(asset.idade_inicio),
    idade_fim: String(asset.idade_fim),
    indexado_inflacao: asset.indexado_inflacao,
    taxa_retorno_aa: fractionToPct(asset.taxa_retorno_aa),
    valorizacao_aa: fractionToPct(asset.valorizacao_aa),
    crescimento_real_aa: fractionToPct(asset.crescimento_real_aa),
    padrao_recorrencia: asset.padrao_recorrencia ?? 'recorrente_anual',
    intervalo_anos: asset.intervalo_anos !== null ? String(asset.intervalo_anos) : '',
    aporte_mensal: String(asset.aporte_mensal ?? ''),
    idade_aporte_inicio:
      asset.idade_aporte_inicio !== null ? String(asset.idade_aporte_inicio) : '',
    idade_aporte_fim:
      asset.idade_aporte_fim !== null ? String(asset.idade_aporte_fim) : '',
  });

  const isFluxo = local.natureza === 'fluxo';
  const isFinanceira = local.tipo === 'financeiro_liquido';
  const idadeInicio = toNumber(local.idade_inicio);
  const idadeFim = toNumber(local.idade_fim);
  const ageRangeValid = idadeFim >= idadeInicio && idadeInicio > 0;

  // Auto-save observa todo local
  const { status, lastSavedAt, error } = useAutoSave(
    local,
    async (v) => {
      const valorNum = toNumber(v.valor);
      if (valorNum <= 0) return { ok: false, error: 'Valor deve ser maior que 0' };
      if (!ageRangeValid) return { ok: false, error: 'Idade fim deve ser ≥ idade início' };

      const padraoRec = isFluxo ? v.padrao_recorrencia : null;
      const recValid = padraoRec === 'recorrente_espacado' ? !!v.intervalo_anos : true;

      const patch: Record<string, unknown> = {
        nome: v.nome.trim() || 'Sem nome',
        tipo: v.tipo,
        natureza: v.natureza,
        valor: valorNum,
        idade_inicio: idadeInicio,
        idade_fim: idadeFim,
        indexado_inflacao: v.indexado_inflacao,
        taxa_retorno_aa: !isFluxo ? pctToFraction(v.taxa_retorno_aa) : null,
        valorizacao_aa: !isFluxo ? pctToFraction(v.valorizacao_aa) : null,
        crescimento_real_aa: isFluxo ? pctToFraction(v.crescimento_real_aa) : null,
        padrao_recorrencia: padraoRec,
        intervalo_anos:
          padraoRec === 'recorrente_espacado' && recValid ? Number(v.intervalo_anos) : null,
        aporte_mensal: isFinanceira && v.aporte_mensal !== '' ? Number(v.aporte_mensal) : null,
        idade_aporte_inicio:
          isFinanceira && v.idade_aporte_inicio !== '' ? Number(v.idade_aporte_inicio) : null,
        idade_aporte_fim:
          isFinanceira && v.idade_aporte_fim !== '' ? Number(v.idade_aporte_fim) : null,
      };
      return patchEntity({ entity: 'assets', id: asset.id, client_id, patch });
    },
    { debounceMs: 800 },
  );

  // ─── pontos do gráfico ao vivo ───
  const points = useMemo(() => {
    if (!ageRangeValid) return [];
    const overrides = (asset.overrides ?? {}) as Record<string, number>;
    if (isFluxo) {
      return seriesFluxoAnual({
        valorBase: toNumber(local.valor),
        idadeInicio,
        idadeFim,
        padrao: local.padrao_recorrencia,
        intervaloAnos: local.intervalo_anos ? Number(local.intervalo_anos) : null,
        crescimentoRealAa: pctToFraction(local.crescimento_real_aa),
        indexadoInflacao: local.indexado_inflacao,
        overrides,
      });
    }
    if (isFinanceira) {
      return seriesAplicacaoFinanceira({
        saldoInicial: toNumber(local.valor),
        idadeInicio,
        idadeFim,
        rentabilidadeAa: pctToFraction(local.taxa_retorno_aa),
        aporteMensal: local.aporte_mensal ? Number(local.aporte_mensal) : null,
        idadeAporteInicio: local.idade_aporte_inicio
          ? Number(local.idade_aporte_inicio)
          : null,
        idadeAporteFim: local.idade_aporte_fim ? Number(local.idade_aporte_fim) : null,
        indexadoInflacao: local.indexado_inflacao,
        overrides,
      });
    }
    return seriesEstoqueFisico({
      valor: toNumber(local.valor),
      idadeInicio,
      idadeFim,
      valorizacaoAa: pctToFraction(local.valorizacao_aa),
      indexadoInflacao: local.indexado_inflacao,
      overrides,
    });
  }, [local, isFluxo, isFinanceira, idadeInicio, idadeFim, ageRangeValid, asset.overrides]);

  const Icon = tipoIcon[local.tipo] ?? Wallet;
  const chartLabel = isFluxo
    ? 'Receita anual projetada'
    : isFinanceira
      ? 'Saldo projetado'
      : 'Valor de mercado projetado';
  const chartColor = isFluxo ? '#10b981' : isFinanceira ? '#3b82f6' : '#8b5cf6';

  return (
    <EditorCard
      icon={Icon}
      title={local.nome || 'Sem nome'}
      subtitle={`${
        tipoLabel(local.tipo) !== local.tipo
          ? tipoLabel(local.tipo)
          : (customTipos.find((c) => c.value === local.tipo)?.label ?? local.tipo)
      } · ${isFluxo ? 'receita anual' : 'patrimônio'} · ${idadeInicio || '?'}–${idadeFim || '?'}`}
      rightSummary={
        <p className="text-sm font-semibold tabular-nums text-slate-900">
          {brl(toNumber(local.valor))}
          {isFluxo && <span className="text-[10px] font-normal text-slate-400">/ano</span>}
        </p>
      }
      saveStatus={<SaveStatusIndicator status={status} lastSavedAt={lastSavedAt} error={error} />}
      onDelete={async () => {
        const fd = new FormData();
        fd.set('id', asset.id);
        fd.set('client_id', client_id);
        await deleteAsset(fd);
        toast.withAction(
          'Ativo excluído',
          {
            label: 'Desfazer',
            onClick: async () => {
              const res = await undoDelete({ entity: 'assets', id: asset.id, client_id });
              if (res.ok) toast.success('Ativo restaurado');
              else toast.error('Não foi possível desfazer');
            },
          },
          { kind: 'success', durationMs: 6000 },
        );
      }}
      onDuplicate={async () => {
        const fd = new FormData();
        fd.set('id', asset.id);
        fd.set('client_id', client_id);
        await duplicateAsset(fd);
        toast.success('Ativo duplicado');
      }}
    >
      {/* GRÁFICO no topo */}
      {ageRangeValid && points.length > 1 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
          <EditableSeriesChart
            entity="assets"
            id={asset.id}
            client_id={client_id}
            points={points}
            color={chartColor}
            label={chartLabel}
          />
          <p className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
            <LineChartIcon size={11} />
            {isFinanceira
              ? `Saldo inicial ${brl(toNumber(local.valor))} aos ${idadeInicio} → ${brl(
                  points[points.length - 1]?.base ?? 0,
                )} aos ${idadeFim}`
              : isFluxo
                ? `${brl(points[0]?.base ?? 0)}/ano aos ${idadeInicio} → ${brl(
                    points[points.length - 1]?.base ?? 0,
                  )}/ano aos ${idadeFim}`
                : `Valor inicial ${brl(toNumber(local.valor))} aos ${idadeInicio} → ${brl(
                    points[points.length - 1]?.base ?? 0,
                  )} aos ${idadeFim}`}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/40 p-6 text-center text-xs text-slate-400">
          Ajuste o valor e o período pra visualizar a projeção
        </div>
      )}

      {/* CONTROLES abaixo */}
      <div className="grid sm:grid-cols-2 gap-3">
        <TextField
          label="Nome"
          value={local.nome}
          onChange={(v) => setLocal({ ...local, nome: v })}
          className="sm:col-span-2"
        />
        <EditableSelect
          label="Tipo"
          value={local.tipo}
          onChange={(v, opt) => {
            const builtin = tipoOptions.find((t) => t.value === v);
            const inferred =
              builtin?.natureza ?? opt?.natureza ?? 'estoque';
            setLocal({ ...local, tipo: v, natureza: inferred });
          }}
          builtin={tipoOptions.map((t) => ({ value: t.value, label: t.label, natureza: t.natureza }))}
          custom={customTipos}
          kind="asset_tipo"
          client_id={client_id}
          className="sm:col-span-2"
        />
        <NumField
          label={isFluxo ? 'Valor anual' : 'Valor inicial'}
          value={local.valor}
          onChange={(v) => setLocal({ ...local, valor: v })}
          prefix="R$"
          step={100}
        />
        {/* Coluna 2 da linha do Valor — varia por tipo */}
        {isFinanceira ? (
          <NumField
            label="Rentabilidade real a.a."
            value={local.taxa_retorno_aa}
            onChange={(v) => setLocal({ ...local, taxa_retorno_aa: v })}
            suffix="%"
            step={0.1}
            hint="CDI real ~5%"
          />
        ) : isFluxo ? (
          <NumField
            label="Crescimento real a.a."
            value={local.crescimento_real_aa}
            onChange={(v) => setLocal({ ...local, crescimento_real_aa: v })}
            suffix="%"
            step={0.1}
            hint="Negativo = redução"
          />
        ) : (
          <NumField
            label="Valorização real a.a."
            value={local.valorizacao_aa}
            onChange={(v) => setLocal({ ...local, valorizacao_aa: v })}
            suffix="%"
            step={0.1}
            hint="Imóvel: ~4% · Carro: -10%"
          />
        )}
        <NumField
          label="Idade início"
          value={local.idade_inicio}
          onChange={(v) => setLocal({ ...local, idade_inicio: v })}
        />
        <NumField
          label="Idade fim"
          value={local.idade_fim}
          onChange={(v) => setLocal({ ...local, idade_fim: v })}
          hint={!ageRangeValid ? `Deve ser ≥ ${idadeInicio}` : undefined}
        />

        {/* Bloco específico: aplicação financeira (aportes) */}
        {isFinanceira && (
          <div className="sm:col-span-2 mt-2 rounded-lg border border-blue-200 bg-blue-50/40 p-3 space-y-3">
            <p className="text-xs font-semibold text-blue-900 uppercase tracking-wider">
              Aportes / retiradas mensais
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              <NumField
                label="Valor por mês"
                value={local.aporte_mensal}
                onChange={(v) => setLocal({ ...local, aporte_mensal: v })}
                prefix="R$"
                step={50}
                hint="Positivo = aporte; negativo = retirada"
              />
              <NumField
                label="De (idade)"
                value={local.idade_aporte_inicio}
                onChange={(v) => setLocal({ ...local, idade_aporte_inicio: v })}
              />
              <NumField
                label="Até (idade)"
                value={local.idade_aporte_fim}
                onChange={(v) => setLocal({ ...local, idade_aporte_fim: v })}
              />
            </div>
          </div>
        )}

        {/* Bloco específico: fluxo (receita) — frequência */}
        {isFluxo && (
          <>
            <SelectField
              label="Frequência"
              value={local.padrao_recorrencia}
              onChange={(v) => setLocal({ ...local, padrao_recorrencia: v })}
              options={[
                { value: 'recorrente_anual', label: 'Todo ano' },
                { value: 'unico', label: 'Apenas no início' },
                { value: 'recorrente_espacado', label: 'A cada N anos' },
              ]}
            />
            {local.padrao_recorrencia === 'recorrente_espacado' && (
              <NumField
                label="Intervalo (anos)"
                value={local.intervalo_anos}
                onChange={(v) => setLocal({ ...local, intervalo_anos: v })}
              />
            )}
          </>
        )}
      </div>
    </EditorCard>
  );
}

// ─── EXPENSE EDITOR ───

export function ExpenseEditor({
  expense,
  client_id,
  customCategorias = [],
}: {
  expense: ExpenseRow;
  client_id: string;
  customCategorias?: SelectOption[];
}) {
  const [local, setLocal] = useState({
    descricao: expense.descricao,
    categoria: expense.categoria,
    valor_mensal: String(expense.valor_mensal ?? ''),
    idade_inicio: String(expense.idade_inicio),
    idade_fim: String(expense.idade_fim),
    indexado_inflacao: expense.indexado_inflacao,
    essencial: expense.essencial,
    crescimento_real_aa: fractionToPct(expense.crescimento_real_aa),
    padrao_recorrencia: expense.padrao_recorrencia ?? 'recorrente_anual',
    intervalo_anos: expense.intervalo_anos !== null ? String(expense.intervalo_anos) : '',
  });

  const idadeInicio = toNumber(local.idade_inicio);
  const idadeFim = toNumber(local.idade_fim);
  const ageRangeValid = idadeFim >= idadeInicio && idadeInicio > 0;

  const { status, lastSavedAt, error } = useAutoSave(
    local,
    async (v) => {
      const valorNum = toNumber(v.valor_mensal);
      if (valorNum <= 0) return { ok: false, error: 'Valor mensal deve ser > 0' };
      if (!ageRangeValid) return { ok: false, error: 'Idade fim ≥ idade início' };
      const padraoRec = v.padrao_recorrencia;
      const recValid = padraoRec === 'recorrente_espacado' ? !!v.intervalo_anos : true;
      const patch: Record<string, unknown> = {
        descricao: v.descricao.trim() || 'Sem descrição',
        categoria: v.categoria,
        valor_mensal: valorNum,
        idade_inicio: idadeInicio,
        idade_fim: idadeFim,
        indexado_inflacao: v.indexado_inflacao,
        essencial: v.essencial,
        crescimento_real_aa: pctToFraction(v.crescimento_real_aa),
        padrao_recorrencia: padraoRec,
        intervalo_anos:
          padraoRec === 'recorrente_espacado' && recValid ? Number(v.intervalo_anos) : null,
      };
      return patchEntity({ entity: 'expenses', id: expense.id, client_id, patch });
    },
    { debounceMs: 800 },
  );

  const points = useMemo(() => {
    if (!ageRangeValid) return [];
    return seriesFluxoAnual({
      valorBase: toNumber(local.valor_mensal) * 12,
      idadeInicio,
      idadeFim,
      padrao: local.padrao_recorrencia,
      intervaloAnos: local.intervalo_anos ? Number(local.intervalo_anos) : null,
      crescimentoRealAa: pctToFraction(local.crescimento_real_aa),
      indexadoInflacao: local.indexado_inflacao,
      overrides: (expense.overrides ?? {}) as Record<string, number>,
    });
  }, [local, idadeInicio, idadeFim, ageRangeValid, expense.overrides]);

  return (
    <EditorCard
      icon={Receipt}
      title={local.descricao || 'Nova despesa'}
      subtitle={`${
        expenseCategoryLabels[local.categoria]
          ?? customCategorias.find((c) => c.value === local.categoria)?.label
          ?? local.categoria
      } · ${idadeInicio || '?'}–${idadeFim || '?'}${local.essencial ? ' · essencial' : ''}`}
      rightSummary={
        <p className="text-sm font-semibold tabular-nums text-red-600">
          {brl(toNumber(local.valor_mensal))}
          <span className="text-[10px] font-normal text-slate-400">/mês</span>
        </p>
      }
      saveStatus={<SaveStatusIndicator status={status} lastSavedAt={lastSavedAt} error={error} />}
      onDelete={async () => {
        const fd = new FormData();
        fd.set('id', expense.id);
        fd.set('client_id', client_id);
        await deleteExpense(fd);
        toast.withAction(
          'Despesa excluída',
          {
            label: 'Desfazer',
            onClick: async () => {
              const res = await undoDelete({ entity: 'expenses', id: expense.id, client_id });
              if (res.ok) toast.success('Despesa restaurada');
              else toast.error('Não foi possível desfazer');
            },
          },
          { kind: 'success', durationMs: 6000 },
        );
      }}
      onDuplicate={async () => {
        const fd = new FormData();
        fd.set('id', expense.id);
        fd.set('client_id', client_id);
        await duplicateExpense(fd);
        toast.success('Despesa duplicada');
      }}
    >
      {ageRangeValid && points.length > 1 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
          <EditableSeriesChart
            entity="expenses"
            id={expense.id}
            client_id={client_id}
            points={points}
            color="#ef4444"
            label="Despesa anual projetada"
          />
          <p className="mt-2 text-[11px] text-slate-500">
            {brl((points[0]?.base ?? 0))}/ano aos {idadeInicio} → {brl(points[points.length - 1]?.base ?? 0)}/ano aos {idadeFim}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/40 p-6 text-center text-xs text-slate-400">
          Ajuste o valor e o período pra visualizar a projeção
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <TextField
          label="Descrição"
          value={local.descricao}
          onChange={(v) => setLocal({ ...local, descricao: v })}
          className="sm:col-span-2"
        />
        <EditableSelect
          label="Categoria"
          value={local.categoria}
          onChange={(v) => setLocal({ ...local, categoria: v })}
          builtin={expenseCategoryOptions}
          custom={customCategorias}
          kind="expense_categoria"
          client_id={client_id}
        />
        <NumField
          label="Valor mensal"
          value={local.valor_mensal}
          onChange={(v) => setLocal({ ...local, valor_mensal: v })}
          prefix="R$"
          step={50}
        />
        <NumField
          label="Idade início"
          value={local.idade_inicio}
          onChange={(v) => setLocal({ ...local, idade_inicio: v })}
        />
        <NumField
          label="Idade fim"
          value={local.idade_fim}
          onChange={(v) => setLocal({ ...local, idade_fim: v })}
          hint={!ageRangeValid ? `Deve ser ≥ ${idadeInicio}` : undefined}
        />
        <NumField
          label="Crescimento real a.a."
          value={local.crescimento_real_aa}
          onChange={(v) => setLocal({ ...local, crescimento_real_aa: v })}
          suffix="%"
          step={0.1}
          hint="Negativo = diminui (ex.: aluguel após herdar imóvel)"
        />
        <SelectField
          label="Frequência"
          value={local.padrao_recorrencia}
          onChange={(v) => setLocal({ ...local, padrao_recorrencia: v })}
          options={[
            { value: 'recorrente_anual', label: 'Todo ano' },
            { value: 'unico', label: 'Apenas no início' },
            { value: 'recorrente_espacado', label: 'A cada N anos' },
          ]}
        />
        {local.padrao_recorrencia === 'recorrente_espacado' && (
          <NumField
            label="Intervalo (anos)"
            value={local.intervalo_anos}
            onChange={(v) => setLocal({ ...local, intervalo_anos: v })}
          />
        )}
        <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
          <input
            type="checkbox"
            checked={local.essencial}
            onChange={(e) => setLocal({ ...local, essencial: e.target.checked })}
            className="rounded"
          />
          Despesa essencial
        </label>
      </div>
    </EditorCard>
  );
}

// ─── EVENT EDITOR ───

const eventTipos = Object.entries(eventTipoLabels)
  .filter(([k]) => k !== 'venda_ativo')
  .map(([value, label]) => ({ value, label }));

export function EventEditor({
  event,
  client_id,
  customTipos = [],
}: {
  event: EventRow;
  client_id: string;
  customTipos?: SelectOption[];
}) {
  const [local, setLocal] = useState({
    descricao: event.descricao,
    tipo: event.tipo,
    valor: String(event.valor ?? ''),
    padrao_recorrencia: (event.padrao_recorrencia ?? 'unico') as Recorrencia,
    idade_inicio: String(event.idade_inicio),
    idade_fim: event.idade_fim !== null ? String(event.idade_fim) : '',
    intervalo_anos: event.intervalo_anos !== null ? String(event.intervalo_anos) : '',
    indexado_inflacao: event.indexado_inflacao,
  });

  const { status, lastSavedAt, error } = useAutoSave(
    local,
    async (v) => {
      const valorNum = Number(v.valor);
      if (!Number.isFinite(valorNum)) return { ok: false, error: 'Valor inválido' };
      const padraoRec = v.padrao_recorrencia;
      const recValid = padraoRec === 'recorrente_espacado' ? !!v.intervalo_anos : true;
      const patch: Record<string, unknown> = {
        descricao: v.descricao.trim() || 'Sem descrição',
        tipo: v.tipo,
        valor: valorNum,
        padrao_recorrencia: padraoRec,
        idade_inicio: toNumber(v.idade_inicio),
        idade_fim: v.idade_fim ? Number(v.idade_fim) : null,
        intervalo_anos:
          padraoRec === 'recorrente_espacado' && recValid ? Number(v.intervalo_anos) : null,
        indexado_inflacao: v.indexado_inflacao,
      };
      return patchEntity({ entity: 'events', id: event.id, client_id, patch });
    },
    { debounceMs: 800 },
  );

  const valorNum = Number(local.valor) || 0;
  return (
    <EditorCard
      icon={CalendarHeart}
      title={local.descricao || 'Novo evento'}
      subtitle={`${
        eventTipoLabels[local.tipo]
          ?? customTipos.find((c) => c.value === local.tipo)?.label
          ?? local.tipo
      } · idade ${local.idade_inicio || '?'} · ${
        recorrenciaLabels[local.padrao_recorrencia] ?? local.padrao_recorrencia
      }`}
      rightSummary={
        <p className={`text-sm font-semibold tabular-nums ${valorNum >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {valorNum >= 0 ? '+' : '−'} {brl(Math.abs(valorNum))}
        </p>
      }
      saveStatus={<SaveStatusIndicator status={status} lastSavedAt={lastSavedAt} error={error} />}
      onDelete={async () => {
        const fd = new FormData();
        fd.set('id', event.id);
        fd.set('client_id', client_id);
        await deleteEvent(fd);
        toast.withAction(
          'Evento excluído',
          {
            label: 'Desfazer',
            onClick: async () => {
              const res = await undoDelete({ entity: 'events', id: event.id, client_id });
              if (res.ok) toast.success('Evento restaurado');
              else toast.error('Não foi possível desfazer');
            },
          },
          { kind: 'success', durationMs: 6000 },
        );
      }}
      onDuplicate={async () => {
        const fd = new FormData();
        fd.set('id', event.id);
        fd.set('client_id', client_id);
        await duplicateEvent(fd);
        toast.success('Evento duplicado');
      }}
    >
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/40 p-4 text-center">
        <p className="text-xs text-slate-500">Evento pontual</p>
        <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
          <span className={valorNum >= 0 ? 'text-emerald-600' : 'text-red-600'}>
            {valorNum >= 0 ? '+' : '−'} {brl(Math.abs(valorNum))}
          </span>{' '}
          <span className="text-slate-400 font-normal text-sm">na idade {local.idade_inicio}</span>
        </p>
        {local.padrao_recorrencia === 'recorrente_anual' && (
          <p className="text-[11px] text-slate-500 mt-1">
            todo ano até {local.idade_fim || '∞'}
          </p>
        )}
        {local.padrao_recorrencia === 'recorrente_espacado' && local.intervalo_anos && (
          <p className="text-[11px] text-slate-500 mt-1">
            a cada {local.intervalo_anos} anos até {local.idade_fim || '∞'}
          </p>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <TextField
          label="Descrição"
          value={local.descricao}
          onChange={(v) => setLocal({ ...local, descricao: v })}
          className="sm:col-span-2"
        />
        <EditableSelect
          label="Tipo"
          value={local.tipo}
          onChange={(v) => setLocal({ ...local, tipo: v })}
          builtin={eventTipos}
          custom={customTipos}
          kind="event_tipo"
          client_id={client_id}
        />
        <NumField
          label="Valor (com sinal)"
          value={local.valor}
          onChange={(v) => setLocal({ ...local, valor: v })}
          prefix="R$"
          step={500}
          hint="Positivo = entrada · negativo = saída"
        />
        <NumField
          label="Idade início"
          value={local.idade_inicio}
          onChange={(v) => setLocal({ ...local, idade_inicio: v })}
        />
        <SelectField
          label="Recorrência"
          value={local.padrao_recorrencia}
          onChange={(v) => setLocal({ ...local, padrao_recorrencia: v as Recorrencia })}
          options={[
            { value: 'unico', label: 'Único' },
            { value: 'recorrente_anual', label: 'Todo ano' },
            { value: 'recorrente_espacado', label: 'A cada N anos' },
          ]}
        />
        {local.padrao_recorrencia !== 'unico' && (
          <NumField
            label="Idade fim (opcional)"
            value={local.idade_fim}
            onChange={(v) => setLocal({ ...local, idade_fim: v })}
          />
        )}
        {local.padrao_recorrencia === 'recorrente_espacado' && (
          <NumField
            label="Intervalo (anos)"
            value={local.intervalo_anos}
            onChange={(v) => setLocal({ ...local, intervalo_anos: v })}
          />
        )}
      </div>

      {local.tipo === 'compra' && local.padrao_recorrencia === 'unico' && (
        <FinancingPanel
          event_id={event.id}
          client_id={client_id}
          valor_total={Math.abs(valorNum)}
          descricao={local.descricao}
        />
      )}
    </EditorCard>
  );
}

// ─── FINANCING PANEL (compra parcelada) ───

function FinancingPanel({
  event_id,
  client_id,
  valor_total,
  descricao,
}: {
  event_id: string;
  client_id: string;
  valor_total: number;
  descricao: string;
}) {
  const [forma, setForma] = useState<'avista' | 'financiado' | null>(null);
  const [entradaPct, setEntradaPct] = useState('20');
  const [prazoAnos, setPrazoAnos] = useState('30');
  const [jurosPct, setJurosPct] = useState('10');
  const [submitting, setSubmitting] = useState(false);

  const entradaNum = Math.max(0, Math.min(100, Number(entradaPct) || 0));
  const prazoNum = Math.max(1, Number(prazoAnos) || 1);
  const jurosNum = Math.max(0, Number(jurosPct) || 0);
  const entrada = valor_total * (entradaNum / 100);
  const financiado = valor_total - entrada;
  const rMensal = Math.pow(1 + jurosNum / 100, 1 / 12) - 1;
  const n = prazoNum * 12;
  const parcela =
    n <= 0
      ? 0
      : rMensal === 0
        ? financiado / n
        : (financiado * rMensal) / (1 - Math.pow(1 + rMensal, -n));

  async function aplicar() {
    setSubmitting(true);
    try {
      const res = await convertEventToFinancing({
        event_id,
        client_id,
        entrada_pct: entradaNum,
        prazo_anos: prazoNum,
        juros_aa_pct: jurosNum,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `Financiamento criado: entrada ${brl(res.entrada)} + parcela ${brl(res.parcela_mensal)}/mês`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 uppercase tracking-wide">
            Forma de pagamento
          </p>
          <p className="text-[11px] text-amber-700/80 dark:text-amber-300/70 mt-0.5">
            {descricao || 'Esta compra'} será paga à vista ou financiada?
          </p>
        </div>
        <div className="inline-flex rounded-md border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setForma('avista')}
            className={`px-3 py-1 rounded transition-colors ${
              forma === 'avista'
                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 font-medium'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            À vista
          </button>
          <button
            type="button"
            onClick={() => setForma('financiado')}
            className={`px-3 py-1 rounded transition-colors ${
              forma === 'financiado'
                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 font-medium'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Financiado
          </button>
        </div>
      </div>

      {forma === 'avista' && (
        <p className="text-[11px] text-slate-600 dark:text-slate-400">
          OK — esta compra está modelada como saída única no ano de aquisição.
        </p>
      )}

      {forma === 'financiado' && (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <NumField
              label="Entrada (%)"
              value={entradaPct}
              onChange={setEntradaPct}
              suffix="%"
              step={5}
            />
            <NumField
              label="Prazo (anos)"
              value={prazoAnos}
              onChange={setPrazoAnos}
              step={5}
            />
            <NumField
              label="Juros (% a.a.)"
              value={jurosPct}
              onChange={setJurosPct}
              suffix="%"
              step={0.5}
            />
          </div>
          <div className="rounded-md bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-900/40 px-3 py-2 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Entrada</p>
              <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {brl(entrada)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Financiado</p>
              <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {brl(financiado)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Parcela/mês</p>
              <p className="text-sm font-semibold tabular-nums text-amber-700 dark:text-amber-300">
                {brl(parcela)}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Ao aplicar, o evento ficará apenas com a entrada e um passivo de financiamento será
            criado pra parcela mensal (saldo {brl(financiado)} · {prazoNum} anos · {jurosNum}% a.a.).
          </p>
          <Button
            size="sm"
            onClick={aplicar}
            disabled={submitting || valor_total <= 0}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {submitting ? 'Aplicando…' : 'Criar financiamento vinculado'}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── LIABILITY EDITOR ───

import { seriesAplicacaoFinanceira as _unused1 } from './series';
void _unused1;

function seriesPassivo(opts: {
  saldoAtual: number;
  jurosAa: number;
  parcelaMensal: number;
  idadeInicio: number;
  idadeFim: number;
}) {
  // Modelo: saldo evolui ano a ano com juros e parcela paga; floor 0.
  const pts: { idade: number; base: number; override?: number }[] = [];
  let saldo = opts.saldoAtual;
  const parcAnual = opts.parcelaMensal * 12;
  for (let idade = opts.idadeInicio; idade <= opts.idadeFim; idade++) {
    if (idade > opts.idadeInicio) {
      saldo = Math.max(0, saldo * (1 + opts.jurosAa) - parcAnual);
    }
    pts.push({ idade, base: Math.round(saldo) });
  }
  return pts;
}

export function LiabilityEditor({
  liability,
  client_id,
  customTipos = [],
}: {
  liability: LiabilityRow;
  client_id: string;
  customTipos?: SelectOption[];
}) {
  const [local, setLocal] = useState({
    nome: liability.nome,
    tipo: liability.tipo,
    saldo_atual: String(liability.saldo_atual ?? ''),
    juros_aa: fractionToPct(liability.juros_aa),
    parcela_mensal: String(liability.parcela_mensal ?? ''),
    idade_inicio: String(liability.idade_inicio),
    idade_fim: String(liability.idade_fim),
  });

  const idadeInicio = toNumber(local.idade_inicio);
  const idadeFim = toNumber(local.idade_fim);
  const ageRangeValid = idadeFim >= idadeInicio && idadeInicio > 0;

  const { status, lastSavedAt, error } = useAutoSave(
    local,
    async (v) => {
      const saldoN = toNumber(v.saldo_atual);
      const parcN = toNumber(v.parcela_mensal);
      if (saldoN < 0) return { ok: false, error: 'Saldo inválido' };
      if (parcN <= 0) return { ok: false, error: 'Parcela mensal deve ser > 0' };
      if (!ageRangeValid) return { ok: false, error: 'Idade fim ≥ idade início' };
      const patch: Record<string, unknown> = {
        nome: v.nome.trim() || 'Sem nome',
        tipo: v.tipo,
        saldo_atual: saldoN,
        juros_aa: pctToFraction(v.juros_aa),
        parcela_mensal: parcN,
        idade_inicio: idadeInicio,
        idade_fim: idadeFim,
      };
      return patchEntity({ entity: 'liabilities', id: liability.id, client_id, patch });
    },
    { debounceMs: 800 },
  );

  const points = useMemo(() => {
    if (!ageRangeValid) return [];
    return seriesPassivo({
      saldoAtual: toNumber(local.saldo_atual),
      jurosAa: Number(pctToFraction(local.juros_aa) ?? 0),
      parcelaMensal: toNumber(local.parcela_mensal),
      idadeInicio,
      idadeFim,
    });
  }, [local, idadeInicio, idadeFim, ageRangeValid]);

  const parcelaNum = toNumber(local.parcela_mensal);
  const saldoFinal = points.length > 0 ? points[points.length - 1]!.base : 0;

  return (
    <EditorCard
      icon={TrendingDown}
      title={local.nome || 'Novo passivo'}
      subtitle={`${
        liabilityTipoLabels[local.tipo]
          ?? customTipos.find((c) => c.value === local.tipo)?.label
          ?? local.tipo
      } · ${idadeInicio || '?'}–${idadeFim || '?'}`}
      rightSummary={
        <p className="text-sm font-semibold tabular-nums text-orange-600">
          {brl(parcelaNum)}
          <span className="text-[10px] font-normal text-slate-400">/mês</span>
        </p>
      }
      saveStatus={<SaveStatusIndicator status={status} lastSavedAt={lastSavedAt} error={error} />}
      onDelete={async () => {
        const fd = new FormData();
        fd.set('id', liability.id);
        fd.set('client_id', client_id);
        await deleteLiability(fd);
        toast.withAction(
          'Passivo excluído',
          {
            label: 'Desfazer',
            onClick: async () => {
              const res = await undoDelete({ entity: 'liabilities', id: liability.id, client_id });
              if (res.ok) toast.success('Passivo restaurado');
              else toast.error('Não foi possível desfazer');
            },
          },
          { kind: 'success', durationMs: 6000 },
        );
      }}
      onDuplicate={async () => {
        const fd = new FormData();
        fd.set('id', liability.id);
        fd.set('client_id', client_id);
        await duplicateLiability(fd);
        toast.success('Passivo duplicado');
      }}
    >
      {ageRangeValid && points.length > 1 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
          <EditableSeriesChart
            entity="liabilities"
            id={liability.id}
            client_id={client_id}
            points={points}
            color="#f97316"
            label="Saldo devedor projetado"
          />
          <p className="mt-2 text-[11px] text-slate-500">
            {brl(toNumber(local.saldo_atual))} aos {idadeInicio} → {brl(saldoFinal)} aos {idadeFim}
            {saldoFinal > 0 && parcelaNum > 0 && ' (não quita totalmente — ajuste parcela ou prazo)'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/40 p-6 text-center text-xs text-slate-400">
          Ajuste saldo e período pra visualizar a projeção
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <TextField
          label="Nome"
          value={local.nome}
          onChange={(v) => setLocal({ ...local, nome: v })}
          className="sm:col-span-2"
        />
        <EditableSelect
          label="Tipo"
          value={local.tipo}
          onChange={(v) => setLocal({ ...local, tipo: v })}
          builtin={liabilityTipoOptions}
          custom={customTipos}
          kind="liability_tipo"
          client_id={client_id}
          className="sm:col-span-2"
        />
        <NumField
          label="Saldo devedor hoje"
          value={local.saldo_atual}
          onChange={(v) => setLocal({ ...local, saldo_atual: v })}
          prefix="R$"
          step={100}
        />
        <NumField
          label="Juros a.a."
          value={local.juros_aa}
          onChange={(v) => setLocal({ ...local, juros_aa: v })}
          suffix="%"
          step={0.1}
          hint="Taxa nominal (ex.: financiamento 10%)"
        />
        <NumField
          label="Parcela mensal"
          value={local.parcela_mensal}
          onChange={(v) => setLocal({ ...local, parcela_mensal: v })}
          prefix="R$"
          step={50}
        />
        <NumField
          label="Idade início"
          value={local.idade_inicio}
          onChange={(v) => setLocal({ ...local, idade_inicio: v })}
        />
        <NumField
          label="Idade fim"
          value={local.idade_fim}
          onChange={(v) => setLocal({ ...local, idade_fim: v })}
          hint={!ageRangeValid ? `Deve ser ≥ ${idadeInicio}` : undefined}
        />
      </div>
    </EditorCard>
  );
}

// ─── BOTÕES DE ADICIONAR ───

import { Plus } from 'lucide-react';
import { useTransition } from 'react';
import { quickAddAsset, quickAddExpense, quickAddEvent, quickAddLiability } from './actions';

export function AddItemButton({
  kind,
  client_id,
  idadeInicio,
  idadeFim,
}: {
  kind: 'asset' | 'expense' | 'event' | 'liability';
  client_id: string;
  idadeInicio: number;
  idadeFim: number;
}) {
  const [pending, startTransition] = useTransition();
  const labels = {
    asset: 'Adicionar ativo ou receita',
    expense: 'Adicionar despesa',
    event: 'Adicionar evento',
    liability: 'Adicionar passivo',
  };
  function handle() {
    startTransition(async () => {
      let res:
        | { ok: true; id: string }
        | { ok: false; error: string };
      if (kind === 'asset') {
        res = await quickAddAsset({
          client_id,
          tipo: 'financeiro_liquido',
          natureza: 'estoque',
          idade_inicio: idadeInicio,
          idade_fim: idadeFim,
        });
      } else if (kind === 'expense') {
        res = await quickAddExpense({ client_id, idade_inicio: idadeInicio, idade_fim: idadeFim });
      } else if (kind === 'event') {
        res = await quickAddEvent({ client_id, idade_inicio: idadeInicio });
      } else {
        res = await quickAddLiability({
          client_id,
          idade_inicio: idadeInicio,
          idade_fim: idadeFim,
        });
      }
      if (res.ok) {
        toast.success('Item criado · edite abaixo');
      } else {
        toast.error('Falha ao criar item');
      }
    });
  }
  return (
    <Button variant="outline" size="md" onClick={handle} disabled={pending} className="w-full">
      <Plus size={14} />
      {labels[kind]}
    </Button>
  );
}
