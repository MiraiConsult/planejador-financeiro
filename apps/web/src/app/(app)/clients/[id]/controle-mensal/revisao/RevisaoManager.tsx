'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  CheckCircle2,
  CreditCard,
  Loader2,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import {
  ajustarLancamento,
  aprovarLancamentos,
  descartarLancamentos,
} from './actions';

export interface RevisaoRow {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  categoria: string | null;        // texto cru do provedor
  categoria_id: string | null;     // categoria local sugerida
  centro_id: string | null;
  eh_receita: boolean | null;
  eh_pagamento_fatura: boolean;
  status_transacao: string | null;
  origem_externa: string | null;
  merchant: string | null;
}

export interface CategoriaOpt {
  id: string;
  nome: string;
  tipo: string;
  cor: string;
}

export interface CentroOpt {
  id: string;
  nome: string;
}

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });

function fmtData(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export function RevisaoManager({
  clientId,
  rows: rowsInit,
  categorias,
  centros,
}: {
  clientId: string;
  rows: RevisaoRow[];
  categorias: CategoriaOpt[];
  centros: CentroOpt[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<RevisaoRow[]>(rowsInit);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  const catById = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias]);

  const totais = useMemo(() => {
    let receita = 0;
    let gasto = 0;
    for (const r of rows) {
      if (r.eh_pagamento_fatura) continue;
      if (r.eh_receita) receita += Math.abs(r.valor);
      else gasto += Math.abs(r.valor);
    }
    return { receita, gasto };
  }, [rows]);

  function toggleSel(id: string) {
    setSelecionados((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleTodos() {
    setSelecionados((s) => (s.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))));
  }

  function mudarCategoria(id: string, categoria_id: string | null) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, categoria_id } : r)));
    void ajustarLancamento({ client_id: clientId, id, categoria_id });
  }

  function mudarCentro(id: string, centro_id: string | null) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, centro_id } : r)));
    void ajustarLancamento({ client_id: clientId, id, centro_id });
  }

  function aprovar(ids: string[]) {
    if (ids.length === 0) return;
    start(async () => {
      const res = await aprovarLancamentos({ client_id: clientId, ids });
      if (!res.ok) {
        toast.error(res.error ?? 'Falha ao aprovar');
        return;
      }
      setRows((rs) => rs.filter((r) => !ids.includes(r.id)));
      setSelecionados(new Set());
      toast.success(`${res.aprovados} lançamento(s) aprovado(s)`);
      router.refresh();
    });
  }

  function aprovarTodos() {
    start(async () => {
      const res = await aprovarLancamentos({ client_id: clientId, todos: true });
      if (!res.ok) {
        toast.error(res.error ?? 'Falha');
        return;
      }
      setRows([]);
      setSelecionados(new Set());
      toast.success(`${res.aprovados} lançamento(s) aprovado(s) — já estão nos números`);
      router.refresh();
    });
  }

  function descartar(ids: string[]) {
    if (ids.length === 0) return;
    if (!confirm(`Descartar ${ids.length} lançamento(s)? Eles não entrarão no controle (mas voltam num próximo sync).`)) return;
    start(async () => {
      const res = await descartarLancamentos({ client_id: clientId, ids });
      if (!res.ok) {
        toast.error(res.error ?? 'Falha');
        return;
      }
      setRows((rs) => rs.filter((r) => !ids.includes(r.id)));
      setSelecionados(new Set());
      toast.success('Descartado(s)');
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 p-10 text-center">
        <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center">
          <CheckCircle2 size={24} />
        </div>
        <p className="text-sm font-semibold text-emerald-900">Nada para revisar</p>
        <p className="text-xs text-emerald-700 mt-1">
          Todos os lançamentos importados já foram validados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumo + ações em massa */}
      <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-4 text-sm tabular-nums">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selecionados.size === rows.length && rows.length > 0}
              onChange={toggleTodos}
              className="h-4 w-4"
            />
            <span className="text-xs text-slate-500">
              {selecionados.size > 0 ? `${selecionados.size} selecionado(s)` : 'Selecionar tudo'}
            </span>
          </label>
          <span className="text-emerald-700 font-medium">+{brl(totais.receita)}</span>
          <span className="text-red-600 font-medium">−{brl(totais.gasto)}</span>
        </div>
        <div className="flex gap-2">
          {selecionados.size > 0 && (
            <>
              <Button variant="ghost" size="sm" onClick={() => descartar([...selecionados])} disabled={pending}>
                <Trash2 size={13} />
                Descartar
              </Button>
              <Button variant="outline" size="sm" onClick={() => aprovar([...selecionados])} disabled={pending}>
                <Check size={13} />
                Aprovar selecionados
              </Button>
            </>
          )}
          <Button variant="primary" size="sm" onClick={aprovarTodos} disabled={pending}>
            {pending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
            Aprovar todos ({rows.length})
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-8 px-2 py-2"></th>
              <th className="text-left px-2 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Data</th>
              <th className="text-left px-2 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Descrição</th>
              <th className="text-left px-2 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Categoria sugerida</th>
              <th className="text-left px-2 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Centro</th>
              <th className="text-right px-2 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Valor</th>
              <th className="w-16 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const cat = r.categoria_id ? catById.get(r.categoria_id) : null;
              const sel = selecionados.has(r.id);
              return (
                <tr key={r.id} className={sel ? 'bg-brand-50/40' : 'bg-white hover:bg-slate-50/60'}>
                  <td className="px-2 py-1.5">
                    <input type="checkbox" checked={sel} onChange={() => toggleSel(r.id)} className="h-4 w-4" />
                  </td>
                  <td className="px-2 py-1.5 text-slate-600 tabular-nums whitespace-nowrap">
                    {fmtData(r.data)}
                  </td>
                  <td className="px-2 py-1.5 max-w-[260px]">
                    <div className="flex items-center gap-1.5">
                      {r.eh_pagamento_fatura ? (
                        <CreditCard size={12} className="text-slate-400 shrink-0" />
                      ) : r.eh_receita ? (
                        <TrendingUp size={12} className="text-emerald-500 shrink-0" />
                      ) : (
                        <TrendingDown size={12} className="text-red-500 shrink-0" />
                      )}
                      <span className="truncate text-slate-900" title={r.descricao}>
                        {r.descricao}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                      {r.origem_externa && <span>{r.origem_externa}</span>}
                      {r.categoria && <span>· {r.categoria}</span>}
                      {r.status_transacao === 'pending' && (
                        <span className="text-amber-600 font-medium">· pendente na fatura</span>
                      )}
                      {r.eh_pagamento_fatura && (
                        <span className="text-slate-400 font-medium">· pgto fatura (não conta)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      value={r.categoria_id ?? ''}
                      onChange={(e) => mudarCategoria(r.id, e.target.value || null)}
                      className="text-xs rounded-md border border-slate-200 bg-white px-2 py-1 max-w-[160px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
                      style={cat ? { borderLeftColor: cat.cor, borderLeftWidth: 3 } : undefined}
                    >
                      <option value="">— sem categoria —</option>
                      {categorias.map((c) => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      value={r.centro_id ?? ''}
                      onChange={(e) => mudarCentro(r.id, e.target.value || null)}
                      className="text-xs rounded-md border border-slate-200 bg-white px-2 py-1 max-w-[130px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
                    >
                      <option value="">—</option>
                      {centros.map((c) => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                  </td>
                  <td className={`px-2 py-1.5 text-right tabular-nums font-medium whitespace-nowrap ${
                    r.eh_pagamento_fatura ? 'text-slate-400' : r.eh_receita ? 'text-emerald-700' : 'text-red-600'
                  }`}>
                    {r.eh_receita ? '+' : '−'}{brl(Math.abs(r.valor))}
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex gap-0.5 justify-end">
                      <button
                        type="button"
                        onClick={() => aprovar([r.id])}
                        disabled={pending}
                        className="h-7 w-7 rounded-md hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 flex items-center justify-center"
                        title="Aprovar"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => descartar([r.id])}
                        disabled={pending}
                        className="h-7 w-7 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center"
                        title="Descartar"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        Dica: ajuste a categoria/centro direto na linha (salva sozinho) e depois aprove. Pagamentos de
        fatura de cartão já vêm marcados pra não contar como gasto (a compra individual é que conta).
      </p>
    </div>
  );
}
