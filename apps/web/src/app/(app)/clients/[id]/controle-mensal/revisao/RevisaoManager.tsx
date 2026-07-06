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
import { ComboboxCreate, type ComboItem } from './ComboboxCreate';
import {
  ajustarLancamento,
  aprovarLancamentos,
  criarCategoria,
  criarRubrica,
  descartarLancamentos,
} from './actions';

export interface RevisaoRow {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  categoria_id: string | null;     // macro
  rubrica_id: string | null;       // filha
  eh_receita: boolean | null;
  eh_pagamento_fatura: boolean;
  status_transacao: string | null;
  origem_externa: string | null;
}

export interface CategoriaNode {
  id: string;
  nome: string;
  tipo: 'receita' | 'despesa';
  cor: string;
  parent_id: string | null;
}

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

function fmtData(iso: string): string {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

export function RevisaoManager({
  clientId,
  rows: rowsInit,
  categorias: catsInit,
}: {
  clientId: string;
  rows: RevisaoRow[];
  categorias: CategoriaNode[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<RevisaoRow[]>(rowsInit);
  const [cats, setCats] = useState<CategoriaNode[]>(catsInit);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  const macros = useMemo(() => cats.filter((c) => !c.parent_id), [cats]);
  // Macros filtradas por tipo (despesa pra gasto, receita pra entrada)
  const macrosDespesa: ComboItem[] = useMemo(
    () => macros.filter((m) => m.tipo === 'despesa').map((m) => ({ id: m.id, nome: m.nome })),
    [macros],
  );
  const macrosReceita: ComboItem[] = useMemo(
    () => macros.filter((m) => m.tipo === 'receita').map((m) => ({ id: m.id, nome: m.nome })),
    [macros],
  );
  const rubricasByParent = useMemo(() => {
    const map = new Map<string, ComboItem[]>();
    for (const c of cats) {
      if (c.parent_id) {
        if (!map.has(c.parent_id)) map.set(c.parent_id, []);
        map.get(c.parent_id)!.push({ id: c.id, nome: c.nome });
      }
    }
    for (const arr of map.values()) arr.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    return map;
  }, [cats]);
  const catById = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats]);

  const totais = useMemo(() => {
    let receita = 0, gasto = 0;
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
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }
  function toggleTodos() {
    setSelecionados((s) => (s.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))));
  }

  function setCategoria(rowId: string, categoria_id: string | null) {
    // mudar categoria limpa a rubrica (rubrica pertence a outra macro)
    setRows((rs) => rs.map((r) => (r.id === rowId ? { ...r, categoria_id, rubrica_id: null } : r)));
    void ajustarLancamento({ client_id: clientId, id: rowId, categoria_id, rubrica_id: null });
  }
  function setRubrica(rowId: string, rubrica_id: string | null) {
    setRows((rs) => rs.map((r) => (r.id === rowId ? { ...r, rubrica_id } : r)));
    void ajustarLancamento({ client_id: clientId, id: rowId, rubrica_id });
  }

  async function novaCategoria(tipo: 'receita' | 'despesa', nome: string): Promise<ComboItem | null> {
    const res = await criarCategoria({ client_id: clientId, nome, tipo });
    if (!res.ok || !res.categoria) {
      toast.error(res.error ?? 'Falha ao criar categoria');
      return null;
    }
    const nova: CategoriaNode = {
      id: res.categoria.id,
      nome: res.categoria.nome,
      tipo,
      cor: res.categoria.cor,
      parent_id: null,
    };
    setCats((c) => [...c, nova]);
    return { id: nova.id, nome: nova.nome };
  }
  async function novaRubrica(parentId: string, nome: string): Promise<ComboItem | null> {
    const res = await criarRubrica({ client_id: clientId, parent_id: parentId, nome });
    if (!res.ok || !res.rubrica) {
      toast.error(res.error ?? 'Falha ao criar rubrica');
      return null;
    }
    const parent = cats.find((c) => c.id === parentId);
    const nova: CategoriaNode = {
      id: res.rubrica.id,
      nome: res.rubrica.nome,
      tipo: (parent?.tipo as 'receita' | 'despesa') ?? 'despesa',
      cor: res.rubrica.cor,
      parent_id: parentId,
    };
    setCats((c) => [...c, nova]);
    return { id: nova.id, nome: nova.nome };
  }

  function msgAprovados(n: number, regras: number | undefined): string {
    const base = `${n} aprovado(s) — já estão nos números`;
    if (!regras) return base;
    return `${base}. ${regras} regra(s) aprendida(s) pra próximos syncs.`;
  }
  function aprovar(ids: string[]) {
    if (ids.length === 0) return;
    start(async () => {
      const res = await aprovarLancamentos({ client_id: clientId, ids });
      if (!res.ok) { toast.error(res.error ?? 'Falha'); return; }
      setRows((rs) => rs.filter((r) => !ids.includes(r.id)));
      setSelecionados(new Set());
      toast.success(msgAprovados(res.aprovados ?? 0, res.regrasAprendidas));
      router.refresh();
    });
  }
  function aprovarTodos() {
    start(async () => {
      const res = await aprovarLancamentos({ client_id: clientId, todos: true });
      if (!res.ok) { toast.error(res.error ?? 'Falha'); return; }
      setRows([]); setSelecionados(new Set());
      toast.success(msgAprovados(res.aprovados ?? 0, res.regrasAprendidas));
      router.refresh();
    });
  }
  function descartar(ids: string[]) {
    if (ids.length === 0) return;
    if (!confirm(`Descartar ${ids.length} lançamento(s)?`)) return;
    start(async () => {
      const res = await descartarLancamentos({ client_id: clientId, ids });
      if (!res.ok) { toast.error(res.error ?? 'Falha'); return; }
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
        <p className="text-xs text-emerald-700 mt-1">Todos os lançamentos importados já foram validados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-4 text-sm tabular-nums">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={selecionados.size === rows.length && rows.length > 0} onChange={toggleTodos} className="h-4 w-4" />
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
                <Trash2 size={13} /> Descartar
              </Button>
              <Button variant="outline" size="sm" onClick={() => aprovar([...selecionados])} disabled={pending}>
                <Check size={13} /> Aprovar selecionados
              </Button>
            </>
          )}
          <Button variant="primary" size="sm" onClick={aprovarTodos} disabled={pending}>
            {pending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
            Aprovar todos ({rows.length})
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 overflow-visible">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-8 px-2 py-2"></th>
              <th className="text-left px-2 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Dia</th>
              <th className="text-left px-2 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Banco</th>
              <th className="text-left px-2 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Descrição</th>
              <th className="text-left px-2 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500 w-44">Categoria</th>
              <th className="text-left px-2 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500 w-44">Rubrica</th>
              <th className="text-right px-2 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Valor</th>
              <th className="w-16 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const macro = r.categoria_id ? catById.get(r.categoria_id) : null;
              const rubItems = r.categoria_id ? rubricasByParent.get(r.categoria_id) ?? [] : [];
              const sel = selecionados.has(r.id);
              return (
                <tr key={r.id} className={sel ? 'bg-brand-50/40' : 'bg-white hover:bg-slate-50/60'}>
                  <td className="px-2 py-1.5 align-top">
                    <input type="checkbox" checked={sel} onChange={() => toggleSel(r.id)} className="h-4 w-4 mt-1.5" />
                  </td>
                  <td className="px-2 py-1.5 text-slate-600 tabular-nums whitespace-nowrap align-top pt-2.5">
                    {fmtData(r.data)}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap align-top pt-2.5">
                    <span className="text-xs text-slate-600">{r.origem_externa ?? '—'}</span>
                  </td>
                  <td className="px-2 py-1.5 max-w-[220px] align-top pt-2">
                    <div className="flex items-center gap-1.5">
                      {r.eh_pagamento_fatura ? <CreditCard size={12} className="text-slate-400 shrink-0" />
                        : r.eh_receita ? <TrendingUp size={12} className="text-emerald-500 shrink-0" />
                        : <TrendingDown size={12} className="text-red-500 shrink-0" />}
                      <span className="truncate text-slate-900" title={r.descricao}>{r.descricao}</span>
                    </div>
                    {(r.status_transacao === 'pending' || r.eh_pagamento_fatura) && (
                      <div className="mt-0.5 text-[10px]">
                        {r.status_transacao === 'pending' && <span className="text-amber-600 font-medium">pendente na fatura</span>}
                        {r.eh_pagamento_fatura && <span className="text-slate-400 font-medium">pgto fatura (não conta)</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-1.5 align-top">
                    <ComboboxCreate
                      value={r.categoria_id}
                      items={r.eh_receita ? macrosReceita : macrosDespesa}
                      onSelect={(id) => setCategoria(r.id, id)}
                      onCreate={(nome) => novaCategoria(r.eh_receita ? 'receita' : 'despesa', nome)}
                      placeholder={r.eh_receita ? 'Categoria (receita)…' : 'Categoria (despesa)…'}
                      accent={macro?.cor}
                      createLabel={(q) => `Criar ${r.eh_receita ? 'receita' : 'despesa'} "${q}"`}
                    />
                  </td>
                  <td className="px-2 py-1.5 align-top">
                    <ComboboxCreate
                      value={r.rubrica_id}
                      items={rubItems}
                      onSelect={(id) => setRubrica(r.id, id)}
                      onCreate={r.categoria_id ? (nome) => novaRubrica(r.categoria_id!, nome) : undefined}
                      placeholder={r.categoria_id ? 'Rubrica…' : 'escolha a categoria'}
                      disabled={!r.categoria_id}
                      createLabel={(q) => `Criar rubrica "${q}"`}
                    />
                  </td>
                  <td className={`px-2 py-1.5 text-right tabular-nums font-medium whitespace-nowrap align-top pt-2.5 ${
                    r.eh_pagamento_fatura ? 'text-slate-400' : r.eh_receita ? 'text-emerald-700' : 'text-red-600'
                  }`}>
                    {r.eh_receita ? '+' : '−'}{brl(Math.abs(r.valor))}
                  </td>
                  <td className="px-2 py-1.5 align-top pt-2">
                    <div className="flex gap-0.5 justify-end">
                      <button type="button" onClick={() => aprovar([r.id])} disabled={pending}
                        className="h-7 w-7 rounded-md hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 flex items-center justify-center" title="Aprovar">
                        <Check size={14} />
                      </button>
                      <button type="button" onClick={() => descartar([r.id])} disabled={pending}
                        className="h-7 w-7 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center" title="Descartar">
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
        Mude a categoria e a rubrica direto na linha (salva sozinho). Ao trocar a categoria, a rubrica é
        limpa. Pode digitar pra buscar e criar categorias/rubricas novas. Aprove só quando estiver certo.
      </p>
    </div>
  );
}
