'use client';

import { ArrowLeft, ArrowRight, Plus, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { DraftCategoria, DraftLancamentoInicial } from '../types';

function nextTempId(): string {
  return `lan-${Math.random().toString(36).slice(2, 9)}`;
}

function hojeIso(): string {
  return new Date().toISOString().slice(0, 10);
}

interface Props {
  lancamentos: DraftLancamentoInicial[];
  categorias: DraftCategoria[];
  onChange: (l: DraftLancamentoInicial[]) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function StepPrimeiroMes({ lancamentos, categorias, onChange, onPrev, onNext }: Props) {
  function adicionar(eh_receita: boolean) {
    const novo: DraftLancamentoInicial = {
      tempId: nextTempId(),
      data: hojeIso(),
      descricao: '',
      valor: 0,
      eh_receita,
      categoria_tempId: null,
    };
    onChange([...lancamentos, novo]);
  }

  function atualizar(tempId: string, patch: Partial<DraftLancamentoInicial>) {
    onChange(lancamentos.map((l) => (l.tempId === tempId ? { ...l, ...patch } : l)));
  }

  function remover(tempId: string) {
    onChange(lancamentos.filter((l) => l.tempId !== tempId));
  }

  const totalReceita = lancamentos
    .filter((l) => l.eh_receita)
    .reduce((s, l) => s + Math.abs(l.valor || 0), 0);
  const totalGasto = lancamentos
    .filter((l) => !l.eh_receita)
    .reduce((s, l) => s + Math.abs(l.valor || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
          Passo 3 de 4 · Primeiro mês
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
          Lançamentos iniciais (opcional)
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
          Adicione alguns lançamentos do mês corrente pra ter dado de cara. Se preferir, pode pular e
          importar uma planilha no próximo passo ou lançar depois.
        </p>
      </div>

      {lancamentos.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-8 text-center space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Nenhum lançamento ainda.
          </p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => adicionar(true)}>
              <TrendingUp size={13} className="text-emerald-600" />
              Adicionar receita
            </Button>
            <Button variant="outline" size="sm" onClick={() => adicionar(false)}>
              <TrendingDown size={13} className="text-red-600" />
              Adicionar gasto
            </Button>
          </div>
        </div>
      )}

      {lancamentos.length > 0 && (
        <>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Tipo
                  </th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Data
                  </th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Descrição
                  </th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Categoria
                  </th>
                  <th className="text-right px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Valor
                  </th>
                  <th className="w-8 px-2 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {lancamentos.map((l) => {
                  const catsPermitidas = categorias.filter(
                    (c) => c.tipo === (l.eh_receita ? 'receita' : 'gasto') || c.tipo === 'ambos',
                  );
                  return (
                    <tr key={l.tempId} className="bg-white dark:bg-slate-900">
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => atualizar(l.tempId, { eh_receita: !l.eh_receita, categoria_tempId: null })}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold ${
                            l.eh_receita
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                              : 'bg-red-50 text-red-700 ring-1 ring-red-200'
                          }`}
                        >
                          {l.eh_receita ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          {l.eh_receita ? 'Receita' : 'Gasto'}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="date"
                          value={l.data}
                          onChange={(e) => atualizar(l.tempId, { data: e.target.value })}
                          className="bg-transparent text-sm focus-visible:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={l.descricao}
                          onChange={(e) => atualizar(l.tempId, { descricao: e.target.value })}
                          placeholder="Ex: Aluguel, Supermercado…"
                          className="w-full bg-transparent text-sm focus-visible:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={l.categoria_tempId ?? ''}
                          onChange={(e) =>
                            atualizar(l.tempId, { categoria_tempId: e.target.value || null })
                          }
                          className="bg-transparent text-sm focus-visible:outline-none"
                        >
                          <option value="">—</option>
                          {catsPermitidas.map((c) => (
                            <option key={c.tempId} value={c.tempId}>
                              {c.nome}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={l.valor === 0 ? '' : l.valor}
                          onChange={(e) =>
                            atualizar(l.tempId, { valor: parseFloat(e.target.value) || 0 })
                          }
                          placeholder="0,00"
                          className="w-28 bg-transparent text-sm text-right tabular-nums focus-visible:outline-none"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => remover(l.tempId)}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="bg-slate-50 dark:bg-slate-800/60 px-3 py-2 flex items-center justify-between gap-3 text-xs">
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => adicionar(true)}>
                  <Plus size={11} />
                  Receita
                </Button>
                <Button variant="ghost" size="sm" onClick={() => adicionar(false)}>
                  <Plus size={11} />
                  Gasto
                </Button>
              </div>
              <div className="flex gap-4 tabular-nums">
                <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                  +R$ {totalReceita.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                </span>
                <span className="text-red-600 dark:text-red-400 font-medium">
                  −R$ {totalGasto.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                </span>
                <span className="text-slate-900 dark:text-slate-100 font-semibold">
                  = R$ {(totalReceita - totalGasto).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
        <Button variant="ghost" size="md" onClick={onPrev}>
          <ArrowLeft size={14} />
          Voltar
        </Button>
        <div className="flex gap-2">
          {lancamentos.length === 0 && (
            <Button variant="ghost" size="md" onClick={onNext}>
              Pular este passo
            </Button>
          )}
          <Button variant="primary" size="md" onClick={onNext}>
            Continuar
            <ArrowRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
