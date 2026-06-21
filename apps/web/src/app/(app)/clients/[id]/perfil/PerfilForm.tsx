'use client';

import { useState, useTransition } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { salvarPerfil, type PerfilInput } from './actions';

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
