'use client';

import { useState, useTransition } from 'react';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { salvarPerfil } from './actions';
import type { FaixaExcedente, PerfilInput } from './defaults';

interface Props {
  clientId: string;
  inicial: PerfilInput;
}

export function PerfilForm({ clientId, inicial }: Props) {
  const [state, setState] = useState<PerfilInput>(inicial);
  const [pending, start] = useTransition();

  function update<K extends keyof PerfilInput>(k: K, v: PerfilInput[K]) {
    setState((s) => ({ ...s, [k]: v }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await salvarPerfil({ client_id: clientId, input: state });
      if (!res.ok) {
        toast.error(res.error ?? 'Falha');
        return;
      }
      toast.success('Perfil atualizado');
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Identificação */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
          Identificação
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nome completo">
            <input
              type="text"
              value={state.nome_completo}
              onChange={(e) => update('nome_completo', e.target.value)}
              className={inputCls}
              required
            />
          </Field>
          <Field label="Data de nascimento">
            <input
              type="date"
              value={state.data_nascimento}
              onChange={(e) => update('data_nascimento', e.target.value)}
              className={inputCls}
              required
            />
          </Field>
          <Field label="Estado civil">
            <select
              value={state.estado_civil ?? ''}
              onChange={(e) => update('estado_civil', e.target.value || null)}
              className={inputCls}
            >
              <option value="">—</option>
              <option value="solteiro">Solteiro(a)</option>
              <option value="casado">Casado(a)</option>
              <option value="uniao_estavel">União estável</option>
              <option value="divorciado">Divorciado(a)</option>
              <option value="viuvo">Viúvo(a)</option>
            </select>
          </Field>
          <Field label="País">
            <input
              type="text"
              value={state.pais_residencia}
              onChange={(e) => update('pais_residencia', e.target.value)}
              maxLength={2}
              className={inputCls}
              placeholder="BR"
            />
          </Field>
        </div>
      </section>

      {/* Horizonte */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
          Horizonte de planejamento
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Expectativa de vida (anos)">
            <input
              type="number"
              min={1}
              max={120}
              value={state.expectativa_vida_anos}
              onChange={(e) => update('expectativa_vida_anos', parseInt(e.target.value) || 0)}
              className={inputCls}
              required
            />
          </Field>
          <Field label="Idade da aposentadoria">
            <input
              type="number"
              min={1}
              max={120}
              value={state.idade_aposentadoria ?? ''}
              onChange={(e) => update('idade_aposentadoria', e.target.value ? parseInt(e.target.value) : null)}
              className={inputCls}
              placeholder="ex: 65"
            />
          </Field>
          <Field label="Idade de redução de trabalho (opcional)">
            <input
              type="number"
              min={1}
              max={120}
              value={state.idade_reducao_trabalho ?? ''}
              onChange={(e) => update('idade_reducao_trabalho', e.target.value ? parseInt(e.target.value) : null)}
              className={inputCls}
              placeholder="ex: 55"
            />
          </Field>
        </div>
      </section>

      {/* Perfil */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
          Perfil da carteira
        </h2>
        <div className="grid sm:grid-cols-4 gap-2">
          {(['conservador', 'moderado', 'arrojado', 'custom'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => update('perfil_carteira', p)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                state.perfil_carteira === p
                  ? 'border-brand-500 bg-brand-50 text-brand-900'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {p === 'conservador' && 'Conservador'}
              {p === 'moderado' && 'Moderado'}
              {p === 'arrojado' && 'Arrojado'}
              {p === 'custom' && 'Custom'}
            </button>
          ))}
        </div>

        {state.perfil_carteira === 'custom' && (
          <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <Field label="Retorno esperado a.a. (%)">
              <input
                type="number"
                step="0.01"
                value={state.custom_retorno_aa ?? ''}
                onChange={(e) => update('custom_retorno_aa', e.target.value ? parseFloat(e.target.value) : null)}
                className={inputCls}
                placeholder="ex: 8.5"
              />
            </Field>
            <Field label="Volatilidade a.a. (%)">
              <input
                type="number"
                step="0.01"
                value={state.custom_volatilidade_aa ?? ''}
                onChange={(e) => update('custom_volatilidade_aa', e.target.value ? parseFloat(e.target.value) : null)}
                className={inputCls}
                placeholder="ex: 12"
              />
            </Field>
          </div>
        )}
      </section>

      {/* Alocação do excedente por faixa etária */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
            Alocação do excedente
          </h2>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Quando o fluxo do ano é positivo, qual % vai para investimento (acumula e rende)? O
            restante vira <strong>consumo extra do ano</strong> — sai do caixa e não rende.
            Defina por faixa de idade. A última faixa cobre o resto da vida.
          </p>
        </div>

        <FaixasExcedenteEditor
          faixas={state.alocacao_excedente}
          onChange={(f) => update('alocacao_excedente', f)}
        />
      </section>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" size="md" disabled={pending}>
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Salvar alterações
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

function FaixasExcedenteEditor({
  faixas,
  onChange,
}: {
  faixas: FaixaExcedente[];
  onChange: (f: FaixaExcedente[]) => void;
}) {
  function updateFaixa(i: number, patch: Partial<FaixaExcedente>) {
    const next = faixas.map((f, idx) => (idx === i ? { ...f, ...patch } : f));
    onChange(next);
  }
  function addFaixa() {
    const ult = faixas[faixas.length - 1];
    const novaIdade = ult && ult.ate_idade != null ? ult.ate_idade + 10 : 70;
    // Insere antes da última (que sempre fica como "resto da vida")
    const head = faixas.slice(0, -1);
    const tail = faixas[faixas.length - 1] ?? { ate_idade: null, pct_investido: 40 };
    onChange([...head, { ate_idade: novaIdade, pct_investido: 60 }, tail]);
  }
  function removeFaixa(i: number) {
    if (faixas.length <= 1) return;
    onChange(faixas.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-2">
      <div className="hidden sm:grid grid-cols-[1fr_120px_120px_40px] gap-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        <span>Faixa</span>
        <span>Até a idade</span>
        <span>% investido</span>
        <span />
      </div>
      {faixas.map((f, i) => {
        const isLast = i === faixas.length - 1;
        const prevIdade = i > 0 ? faixas[i - 1]!.ate_idade : null;
        const rotuloFaixa = isLast
          ? prevIdade != null
            ? `${prevIdade + 1} anos em diante`
            : 'Toda a vida'
          : i === 0
            ? `Até ${f.ate_idade ?? '—'} anos`
            : `${(prevIdade ?? 0) + 1}–${f.ate_idade ?? '—'} anos`;
        return (
          <div key={i} className="grid grid-cols-[1fr_120px_120px_40px] gap-3 items-center rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5">
            <span className="text-sm text-slate-700">{rotuloFaixa}</span>
            <input
              type="number"
              min={1}
              max={120}
              value={f.ate_idade ?? ''}
              disabled={isLast}
              onChange={(e) => updateFaixa(i, { ate_idade: e.target.value ? parseInt(e.target.value) : null })}
              placeholder={isLast ? '—' : 'ex: 45'}
              className={`${inputCls} disabled:bg-slate-100 disabled:text-slate-400`}
            />
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                value={f.pct_investido}
                onChange={(e) => updateFaixa(i, { pct_investido: parseFloat(e.target.value) || 0 })}
                className={`${inputCls} pr-7`}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
            </div>
            <button
              type="button"
              onClick={() => removeFaixa(i)}
              disabled={faixas.length <= 1}
              className="text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed flex justify-center"
              title="Remover faixa"
            >
              <Trash2 size={14} />
            </button>
          </div>
        );
      })}
      <button
        type="button"
        onClick={addFaixa}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:text-brand-800"
      >
        <Plus size={12} />
        Adicionar faixa
      </button>
    </div>
  );
}
