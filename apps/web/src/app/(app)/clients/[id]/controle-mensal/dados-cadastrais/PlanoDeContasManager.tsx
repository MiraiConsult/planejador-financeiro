'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/components/ui/Toast';
import { atualizarItem, criarCategoria, criarRubrica, excluirItem } from './actions';

export interface CategoriaRow {
  id: string;
  nome: string;
  tipo: 'receita' | 'despesa';
  cor: string;
  parent_id: string | null;
  ordem: number;
  ativo: boolean;
  lancamentos: number; // contagem que usa essa categoria/rubrica
}

interface Tree {
  cat: CategoriaRow;
  rubricas: CategoriaRow[];
}

export function PlanoDeContasManager({
  clientId,
  rows,
}: {
  clientId: string;
  rows: CategoriaRow[];
}) {
  const [pending, start] = useTransition();
  const [filter, setFilter] = useState<'todas' | 'receita' | 'despesa'>('todas');
  const [openCat, setOpenCat] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [nomeEdit, setNomeEdit] = useState('');
  const [novaCatNome, setNovaCatNome] = useState('');
  const [novaCatTipo, setNovaCatTipo] = useState<'receita' | 'despesa'>('despesa');
  const [novaRubNome, setNovaRubNome] = useState<Record<string, string>>({});

  const tree: Tree[] = useMemo(() => {
    const macros = rows
      .filter((r) => !r.parent_id)
      .filter((r) => filter === 'todas' || r.tipo === filter)
      .sort((a, b) => {
        if (a.tipo !== b.tipo) return a.tipo === 'receita' ? -1 : 1;
        return a.ordem - b.ordem;
      });
    const byParent = new Map<string, CategoriaRow[]>();
    for (const r of rows) {
      if (r.parent_id) {
        if (!byParent.has(r.parent_id)) byParent.set(r.parent_id, []);
        byParent.get(r.parent_id)!.push(r);
      }
    }
    for (const arr of byParent.values()) arr.sort((a, b) => a.ordem - b.ordem);
    return macros.map((cat) => ({ cat, rubricas: byParent.get(cat.id) ?? [] }));
  }, [rows, filter]);

  function toggleOpen(catId: string) {
    setOpenCat((s) => {
      const n = new Set(s);
      if (n.has(catId)) n.delete(catId); else n.add(catId);
      return n;
    });
  }
  function startEdit(item: CategoriaRow) {
    setEditing(item.id);
    setNomeEdit(item.nome);
  }
  function cancelEdit() {
    setEditing(null);
    setNomeEdit('');
  }
  function saveEdit(id: string) {
    const nome = nomeEdit.trim();
    if (!nome) {
      cancelEdit();
      return;
    }
    start(async () => {
      const res = await atualizarItem({ client_id: clientId, id, patch: { nome } });
      if (!res.ok) {
        toast.error(res.error ?? 'Falha');
        return;
      }
      cancelEdit();
      toast.success('Salvo');
    });
  }
  function remover(item: CategoriaRow) {
    const tipo = item.parent_id ? 'rubrica' : 'categoria';
    if (item.lancamentos > 0) {
      if (!confirm(
        `Essa ${tipo} tem ${item.lancamentos} lançamento(s). Ela será desativada (não some — fica oculta nos cadastros). Confirmar?`,
      )) return;
    } else {
      if (!confirm(`Excluir ${tipo} "${item.nome}"?`)) return;
    }
    start(async () => {
      const res = await excluirItem({ client_id: clientId, id: item.id });
      if (!res.ok) {
        toast.error(res.error ?? 'Falha');
        return;
      }
      toast.success(res.soft ? 'Desativada' : 'Excluída');
    });
  }
  function adicionarCategoria() {
    const nome = novaCatNome.trim();
    if (!nome) return;
    start(async () => {
      const res = await criarCategoria({ client_id: clientId, input: { nome, tipo: novaCatTipo } });
      if (!res.ok) {
        toast.error(res.error ?? 'Falha');
        return;
      }
      setNovaCatNome('');
      toast.success('Categoria adicionada');
    });
  }
  function adicionarRubrica(parentId: string) {
    const nome = (novaRubNome[parentId] ?? '').trim();
    if (!nome) return;
    start(async () => {
      const res = await criarRubrica({ client_id: clientId, input: { parent_id: parentId, nome } });
      if (!res.ok) {
        toast.error(res.error ?? 'Falha');
        return;
      }
      setNovaRubNome((s) => ({ ...s, [parentId]: '' }));
      setOpenCat((s) => new Set(s).add(parentId));
      toast.success('Rubrica adicionada');
    });
  }

  return (
    <div className="space-y-4">
      {/* Filtro + nova categoria */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
          {(['todas', 'receita', 'despesa'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md transition-colors ${
                filter === f ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f === 'todas' ? 'Todas' : f === 'receita' ? 'Receitas' : 'Despesas'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={novaCatTipo}
            onChange={(e) => setNovaCatTipo(e.target.value as 'receita' | 'despesa')}
            className="text-xs rounded-md border border-slate-200 bg-white px-2 py-1.5"
          >
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
          </select>
          <input
            type="text"
            value={novaCatNome}
            onChange={(e) => setNovaCatNome(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && adicionarCategoria()}
            placeholder="Nova categoria…"
            className="text-xs rounded-md border border-slate-200 bg-white px-2 py-1.5 w-48"
          />
          <Button variant="primary" size="sm" onClick={adicionarCategoria} disabled={pending || !novaCatNome.trim()}>
            <Plus size={13} />
            Adicionar
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-6 px-2 py-2"></th>
              <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Categoria / Rubrica
              </th>
              <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500 w-24">
                Tipo
              </th>
              <th className="text-right px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500 w-24">
                Lançamentos
              </th>
              <th className="w-28 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tree.map(({ cat, rubricas }) => {
              const aberto = openCat.has(cat.id);
              const totalLanc = cat.lancamentos + rubricas.reduce((s, r) => s + r.lancamentos, 0);
              return (
                <>
                  <tr key={cat.id} className={!cat.ativo ? 'bg-slate-50/60 opacity-60' : ''}>
                    <td className="px-2 py-2 align-middle">
                      <button
                        type="button"
                        onClick={() => toggleOpen(cat.id)}
                        className="text-slate-400 hover:text-slate-900"
                      >
                        {aberto ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: cat.cor }}
                        />
                        {editing === cat.id ? (
                          <input
                            autoFocus
                            type="text"
                            value={nomeEdit}
                            onChange={(e) => setNomeEdit(e.target.value)}
                            onBlur={() => saveEdit(cat.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(cat.id);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="text-sm font-medium rounded border border-brand-300 px-1.5 py-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
                          />
                        ) : (
                          <span className="text-sm font-semibold text-slate-900">{cat.nome}</span>
                        )}
                        <span className="text-[10px] text-slate-400">{rubricas.length} rubrica{rubricas.length !== 1 && 's'}</span>
                        {!cat.ativo && <Badge variant="warning">Inativa</Badge>}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          cat.tipo === 'receita'
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                            : 'bg-red-50 text-red-700 ring-1 ring-red-200'
                        }`}
                      >
                        {cat.tipo === 'receita' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {cat.tipo === 'receita' ? 'Receita' : 'Despesa'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600 align-middle">
                      {totalLanc}
                    </td>
                    <td className="px-2 py-2 align-middle">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(cat)}
                          className="h-7 w-7 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-900 flex items-center justify-center"
                          title="Editar"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => remover(cat)}
                          className="h-7 w-7 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center"
                          title="Excluir"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {aberto && (
                    <>
                      {rubricas.map((rub) => (
                        <tr key={rub.id} className={`bg-slate-50/40 ${!rub.ativo ? 'opacity-60' : ''}`}>
                          <td></td>
                          <td className="pl-10 pr-3 py-1.5">
                            {editing === rub.id ? (
                              <input
                                autoFocus
                                type="text"
                                value={nomeEdit}
                                onChange={(e) => setNomeEdit(e.target.value)}
                                onBlur={() => saveEdit(rub.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEdit(rub.id);
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                                className="text-sm rounded border border-brand-300 px-1.5 py-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
                              />
                            ) : (
                              <span className="text-sm text-slate-700">{rub.nome}</span>
                            )}
                            {!rub.ativo && <Badge variant="warning">Inativa</Badge>}
                          </td>
                          <td className="px-3 py-1.5 text-[10px] text-slate-400">rubrica</td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-slate-500">
                            {rub.lancamentos}
                          </td>
                          <td className="px-2 py-1.5">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => startEdit(rub)}
                                className="h-6 w-6 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-900 flex items-center justify-center"
                                title="Editar"
                              >
                                <Pencil size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={() => remover(rub)}
                                className="h-6 w-6 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center"
                                title="Excluir"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50/40">
                        <td></td>
                        <td className="pl-10 pr-3 py-1.5" colSpan={4}>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={novaRubNome[cat.id] ?? ''}
                              onChange={(e) =>
                                setNovaRubNome((s) => ({ ...s, [cat.id]: e.target.value }))
                              }
                              onKeyDown={(e) => e.key === 'Enter' && adicionarRubrica(cat.id)}
                              placeholder={`Nova rubrica em ${cat.nome}…`}
                              className="text-xs rounded border border-slate-200 bg-white px-2 py-1 w-64 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
                            />
                            <button
                              type="button"
                              onClick={() => adicionarRubrica(cat.id)}
                              disabled={!(novaRubNome[cat.id] ?? '').trim() || pending}
                              className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800 disabled:opacity-40"
                            >
                              <Plus size={11} />
                              Adicionar rubrica
                            </button>
                          </div>
                        </td>
                      </tr>
                    </>
                  )}
                </>
              );
            })}
            {tree.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-500">
                  Nenhuma categoria. Adicione a primeira no formulário acima.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pending && (
        <div className="text-xs text-slate-400 inline-flex items-center gap-1">
          <Loader2 size={11} className="animate-spin" /> salvando…
        </div>
      )}
    </div>
  );
}
