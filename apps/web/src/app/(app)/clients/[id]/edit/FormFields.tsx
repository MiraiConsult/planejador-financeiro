'use client';

import { useState, type ChangeEvent } from 'react';
import { Input, Label } from '@/components/ui/Input';

// ─── Field primitives (client) ───

interface BaseProps {
  label: string;
  name: string;
  hint?: string;
  className?: string;
}

function ErrorHint({ hint, invalid }: { hint?: string; invalid?: boolean }) {
  if (!hint) return null;
  return (
    <p className={`text-[11px] ${invalid ? 'text-red-600' : 'text-slate-500'}`}>{hint}</p>
  );
}

function NumInput({
  name,
  defaultValue,
  required,
  step = 1,
  min,
  invalid,
  onChange,
  placeholder,
  prefix,
  suffix,
}: {
  name: string;
  defaultValue?: number | string | null;
  required?: boolean;
  step?: number | string;
  min?: number;
  invalid?: boolean;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
}) {
  const value =
    defaultValue === null || defaultValue === undefined ? '' : String(defaultValue);
  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
          {prefix}
        </span>
      )}
      <Input
        id={name}
        name={name}
        type="number"
        step={step}
        min={min}
        defaultValue={value}
        required={required}
        onChange={onChange}
        placeholder={placeholder}
        className={`tabular-nums ${prefix ? 'pl-9' : ''} ${suffix ? 'pr-8' : ''} ${
          invalid ? 'border-red-400 focus-visible:ring-red-400 focus-visible:border-red-500' : ''
        }`}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
          {suffix}
        </span>
      )}
    </div>
  );
}

// ─── Recorrência (frequência + intervalo condicional) ───

const recorrenciaDefaults = [
  { value: 'recorrente_anual', label: 'Todo ano' },
  { value: 'unico', label: 'Apenas no início' },
  { value: 'recorrente_espacado', label: 'A cada N anos' },
];

export function RecorrenciaField({
  defaultRecorrencia = 'recorrente_anual',
  defaultIntervalo,
  options = recorrenciaDefaults,
  selectName = 'padrao_recorrencia',
  intervalName = 'intervalo_anos',
}: {
  defaultRecorrencia?: string | null;
  defaultIntervalo?: number | null;
  options?: { value: string; label: string }[];
  selectName?: string;
  intervalName?: string;
}) {
  const [r, setR] = useState<string>(defaultRecorrencia ?? 'recorrente_anual');
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={selectName}>Frequência</Label>
        <select
          id={selectName}
          name={selectName}
          defaultValue={defaultRecorrencia ?? 'recorrente_anual'}
          onChange={(e) => setR(e.target.value)}
          className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-brand-500"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {r === 'recorrente_espacado' ? (
        <div className="space-y-1.5">
          <Label htmlFor={intervalName}>Intervalo (anos)</Label>
          <NumInput
            name={intervalName}
            defaultValue={defaultIntervalo ?? ''}
            required
            min={1}
            placeholder="ex: 2"
          />
          <ErrorHint hint="A despesa/receita ocorre a cada N anos a partir do início" />
        </div>
      ) : (
        // mantém o name pra que o action sempre receba o campo (pode vir null)
        <input type="hidden" name={intervalName} value="" />
      )}
    </>
  );
}

// ─── Idade início + fim com cross-validation ───

export function AgeRangeFields({
  defaultStart,
  defaultEnd,
  startLabel = 'Idade início',
  endLabel = 'Idade fim',
  startName = 'idade_inicio',
  endName = 'idade_fim',
  required = true,
}: {
  defaultStart?: number | string | null;
  defaultEnd?: number | string | null;
  startLabel?: string;
  endLabel?: string;
  startName?: string;
  endName?: string;
  required?: boolean;
}) {
  const initStart = defaultStart === null || defaultStart === undefined || defaultStart === ''
    ? null
    : Number(defaultStart);
  const initEnd = defaultEnd === null || defaultEnd === undefined || defaultEnd === ''
    ? null
    : Number(defaultEnd);
  const [start, setStart] = useState<number | null>(initStart);
  const [end, setEnd] = useState<number | null>(initEnd);
  const invalid = start !== null && end !== null && end < start;
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={startName}>{startLabel}</Label>
        <NumInput
          name={startName}
          defaultValue={defaultStart ?? ''}
          required={required}
          step={1}
          min={0}
          onChange={(e) => setStart(e.target.value ? Number(e.target.value) : null)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={endName}>{endLabel}</Label>
        <NumInput
          name={endName}
          defaultValue={defaultEnd ?? ''}
          required={required}
          step={1}
          min={0}
          invalid={invalid}
          onChange={(e) => setEnd(e.target.value ? Number(e.target.value) : null)}
        />
        {invalid && (
          <p className="text-[11px] text-red-600">
            Idade fim deve ser ≥ idade início ({start}).
          </p>
        )}
      </div>
    </>
  );
}

// ─── Ativo: campos condicionais por natureza (estoque vs fluxo) ───

export function AssetNatureFields({
  defaultNatureza = 'estoque',
  defaultTaxaRetorno,
  defaultValorizacao,
  defaultCrescimento,
  defaultRecorrencia,
  defaultIntervalo,
  defaultTipo,
  tipoOptions,
  natureByTipo,
  tipoName = 'tipo',
}: {
  defaultNatureza?: string | null;
  defaultTaxaRetorno?: number | null;
  defaultValorizacao?: number | null;
  defaultCrescimento?: number | null;
  defaultRecorrencia?: string | null;
  defaultIntervalo?: number | null;
  defaultTipo?: string;
  tipoOptions: { value: string; label: string }[];
  /** map tipo → natureza, p/ inferir natureza ao trocar tipo */
  natureByTipo: Record<string, string>;
  tipoName?: string;
}) {
  const [tipo, setTipo] = useState<string>(defaultTipo ?? tipoOptions[0]?.value ?? 'outro');
  const [nat, setNat] = useState<string>(defaultNatureza ?? natureByTipo[tipo] ?? 'estoque');
  const isFluxo = nat === 'fluxo';

  return (
    <>
      {/* Tipo */}
      <div className="space-y-1.5">
        <Label htmlFor={tipoName}>Tipo</Label>
        <select
          id={tipoName}
          name={tipoName}
          defaultValue={defaultTipo}
          onChange={(e) => {
            const t = e.target.value;
            setTipo(t);
            // Atualiza natureza implícita conforme o tipo escolhido
            const inferred = natureByTipo[t];
            if (inferred) setNat(inferred);
          }}
          className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-brand-500"
        >
          {tipoOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Natureza (editável caso o user queira sobrepor) */}
      <div className="space-y-1.5">
        <Label htmlFor="natureza">Natureza</Label>
        <select
          id="natureza"
          name="natureza"
          value={nat}
          onChange={(e) => setNat(e.target.value)}
          className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-brand-500"
        >
          <option value="estoque">Estoque (patrimônio)</option>
          <option value="fluxo">Fluxo (receita anual)</option>
        </select>
      </div>

      {/* Condicionais */}
      {!isFluxo ? (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="taxa_retorno_aa">Rentabilidade real a.a. (%)</Label>
            <NumInput
              name="taxa_retorno_aa"
              defaultValue={
                defaultTaxaRetorno === null || defaultTaxaRetorno === undefined
                  ? ''
                  : Number(defaultTaxaRetorno) * 100
              }
              step={0.1}
              suffix="%"
              placeholder="—"
            />
            <ErrorHint hint="Acima da inflação. Ex.: 5 = CDI real." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="valorizacao_aa">Valorização real a.a. (%)</Label>
            <NumInput
              name="valorizacao_aa"
              defaultValue={
                defaultValorizacao === null || defaultValorizacao === undefined
                  ? ''
                  : Number(defaultValorizacao) * 100
              }
              step={0.1}
              suffix="%"
              placeholder="—"
            />
            <ErrorHint hint="Imóvel: ~4%; carro: -10%." />
          </div>
          {/* mantém names pros campos de fluxo enviarem null */}
          <input type="hidden" name="crescimento_real_aa" value="" />
          <input type="hidden" name="padrao_recorrencia" value="" />
          <input type="hidden" name="intervalo_anos" value="" />
        </>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="crescimento_real_aa">Crescimento real a.a. (%)</Label>
            <NumInput
              name="crescimento_real_aa"
              defaultValue={
                defaultCrescimento === null || defaultCrescimento === undefined
                  ? ''
                  : Number(defaultCrescimento) * 100
              }
              step={0.1}
              suffix="%"
              placeholder="—"
            />
            <ErrorHint hint="Acima da inflação. Negativo = redução." />
          </div>
          <RecorrenciaField
            defaultRecorrencia={defaultRecorrencia ?? 'recorrente_anual'}
            defaultIntervalo={defaultIntervalo ?? null}
          />
          {/* mantém names dos campos de estoque enviarem null */}
          <input type="hidden" name="taxa_retorno_aa" value="" />
          <input type="hidden" name="valorizacao_aa" value="" />
        </>
      )}
    </>
  );
}

// ─── Despesa: crescimento + recorrência inline ───

export function ExpenseGrowthRecurrenceFields({
  defaultCrescimento,
  defaultRecorrencia,
  defaultIntervalo,
}: {
  defaultCrescimento?: number | null;
  defaultRecorrencia?: string | null;
  defaultIntervalo?: number | null;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="crescimento_real_aa">Crescimento real a.a. (%)</Label>
        <NumInput
          name="crescimento_real_aa"
          defaultValue={
            defaultCrescimento === null || defaultCrescimento === undefined
              ? ''
              : Number(defaultCrescimento) * 100
          }
          step={0.1}
          suffix="%"
          placeholder="—"
        />
        <ErrorHint hint="Positivo = aumenta acima da inflação; negativo = diminui." />
      </div>
      <RecorrenciaField
        defaultRecorrencia={defaultRecorrencia ?? 'recorrente_anual'}
        defaultIntervalo={defaultIntervalo ?? null}
      />
    </>
  );
}
