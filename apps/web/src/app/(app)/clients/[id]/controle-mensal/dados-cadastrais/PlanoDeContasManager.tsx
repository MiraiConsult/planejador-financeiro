'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FolderInput,
  Loader2,
  MapPin,
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
import { Dialog } from '@/components/ui/Dialog';
import {
  atualizarItem,
  criarCategoria,
  criarRubrica,
  excluirItem,
  migrarItemDeCentro,
  moverRubrica,
} from './actions';

interface CentroOpt {
  id: string;
  nome: string;
}

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
  centros = [],
}: {
  clientId: string;
  rows: CategoriaRow[];
  centros?: CentroOpt[];
}) {
  const [pending, start] = useTransition();
  const [filter, setFilter] = useState<'todas' | 'receita' | 'despesa'>('todas');
  const [openCat, setOpenCat] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [nomeEdit, setNomeEdit] = useState('');
  const [novaCatNome, setNovaCatNome] = useState('');
  const [novaCatTipo, setNovaCatTipo] = useState<'receita' | 'despesa'>('despesa');
  const [novaRubNome, setNovaRubNome] = useState<Record<string, string>>({});
  const [excluindo, setExcluindo] = useState<CategoriaRow | null>(null);
  const [movendo, setMovendo] = useState<CategoriaRow | null>(null);
  const [migrandoCentro, setMigrandoCentro] = useState<CategoriaRow | null>(null);

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
    if (item.lancamentos > 0) {
      // Abre modal pra escolher destino dos lançamentos
      setExcluindo(item);
      return;
    }
    const tipo = item.parent_id ? 'rubrica' : 'categoria';
    if (!confirm(`Excluir ${tipo} "${item.nome}"?`)) return;
    start(async () => {
      const res = await excluirItem({ client_id: clientId, id: item.id });
      if (!res.ok) {
        toast.error(res.error ?? 'Falha');
        return;
      }
      toast.success('Excluída');
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
                        {centros.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setMigrandoCentro(cat)}
                            className="h-7 w-7 rounded-md hover:bg-slate-100 text-slate-400 hover:text-brand-600 flex items-center justify-center"
                            title="Migrar lançamentos desta categoria para outro centro"
                          >
                            <MapPin size={12} />
                          </button>
                        )}
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
                                onClick={() => setMovendo(rub)}
                                className="h-6 w-6 rounded hover:bg-slate-100 text-slate-400 hover:text-brand-600 flex items-center justify-center"
                                title="Mover para outra categoria"
                              >
                                <FolderInput size={11} />
                              </button>
                              {centros.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setMigrandoCentro(rub)}
                                  className="h-6 w-6 rounded hover:bg-slate-100 text-slate-400 hover:text-brand-600 flex items-center justify-center"
                                  title="Migrar lançamentos desta rubrica para outro centro"
                                >
                                  <MapPin size={11} />
                                </button>
                              )}
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

      {excluindo && (
        <ExcluirComMergeDialog
          clientId={clientId}
          item={excluindo}
          rows={rows}
          onClose={() => setExcluindo(null)}
          onCriarRubrica={async (parentId, nome) => {
            const res = await criarRubrica({ client_id: clientId, input: { parent_id: parentId, nome } });
            if (!res.ok || !res.id) {
              toast.error(res.error ?? 'Falha ao criar rubrica');
              return null;
            }
            return res.id;
          }}
          onCriarCategoria={async (tipo, nome) => {
            const res = await criarCategoria({ client_id: clientId, input: { nome, tipo } });
            if (!res.ok || !res.id) {
              toast.error(res.error ?? 'Falha ao criar categoria');
              return null;
            }
            return res.id;
          }}
        />
      )}

      {movendo && (
        <MoverRubricaDialog
          clientId={clientId}
          rubrica={movendo}
          rows={rows}
          onClose={() => setMovendo(null)}
        />
      )}

      {migrandoCentro && (
        <MigrarCentroDialog
          clientId={clientId}
          item={migrandoCentro}
          centros={centros}
          onClose={() => setMigrandoCentro(null)}
        />
      )}
    </div>
  );
}

function MigrarCentroDialog({
  clientId,
  item,
  centros,
  onClose,
}: {
  clientId: string;
  item: CategoriaRow;
  centros: CentroOpt[];
  onClose: () => void;
}) {
  const [destino, setDestino] = useState('');
  const [pending, start] = useTransition();
  const ehRubrica = item.parent_id != null;

  function confirmar() {
    if (!destino) return;
    start(async () => {
      const res = await migrarItemDeCentro({
        client_id: clientId,
        item_id: item.id,
        novo_centro_id: destino,
      });
      if (res.ok) {
        toast.success(
          res.movidos
            ? `${res.movidos} lançamento(s) migrado(s) de centro`
            : 'Nenhum lançamento para migrar',
        );
        onClose();
      } else {
        toast.error(res.error ?? 'Falha ao migrar');
      }
    });
  }

  return (
    <Dialog open onClose={onClose} size="sm" title={
      <span className="flex items-center gap-2">
        <MapPin size={16} className="text-brand-600" />
        Migrar de centro
      </span>
    }>
      <div className="space-y-4 p-1">
        <p className="text-sm text-slate-600">
          Migra os <strong>{item.lancamentos}</strong> lançamento(s)
          {ehRubrica ? <> da rubrica</> : <> da categoria (e das rubricas dela)</>}{' '}
          <strong>{item.nome}</strong> para outro centro. O plano de contas em si continua o mesmo —
          só os lançamentos mudam de centro.
        </p>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-700">Centro de destino</span>
          <select
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            autoFocus
          >
            <option value="">— escolha o centro —</option>
            {centros.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose} type="button" disabled={pending}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" onClick={confirmar} type="button" disabled={pending || !destino}>
            {pending ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
            Migrar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function MoverRubricaDialog({
  clientId,
  rubrica,
  rows,
  onClose,
}: {
  clientId: string;
  rubrica: CategoriaRow;
  rows: CategoriaRow[];
  onClose: () => void;
}) {
  const [destino, setDestino] = useState('');
  const [pending, start] = useTransition();

  // Todas as macro-categorias (exceto a atual da rubrica), agrupadas por tipo.
  const macros = rows
    .filter((r) => !r.parent_id && r.id !== rubrica.parent_id)
    .sort((a, b) => {
      if (a.tipo !== b.tipo) return a.tipo === 'receita' ? -1 : 1;
      return a.ordem - b.ordem;
    });
  const atual = rows.find((r) => r.id === rubrica.parent_id);

  function confirmar() {
    if (!destino) return;
    start(async () => {
      const res = await moverRubrica({
        client_id: clientId,
        rubrica_id: rubrica.id,
        novo_parent_id: destino,
      });
      if (res.ok) {
        toast.success(
          `"${rubrica.nome}" movida${res.movidos ? ` · ${res.movidos} lançamento(s) religado(s)` : ''}`,
        );
        onClose();
      } else {
        toast.error(res.error ?? 'Falha ao mover');
      }
    });
  }

  return (
    <Dialog open onClose={onClose} size="sm" title={
      <span className="flex items-center gap-2">
        <FolderInput size={16} className="text-brand-600" />
        Mover rubrica
      </span>
    }>
      <div className="space-y-4 p-1">
        <p className="text-sm text-slate-600">
          Mover <strong>{rubrica.nome}</strong>
          {atual ? <> de <span className="text-slate-500">{atual.nome}</span></> : null} para outra
          categoria. Os {rubrica.lancamentos} lançamento(s) dessa rubrica passam a contar na nova
          categoria.
        </p>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-700">Categoria de destino</span>
          <select
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            autoFocus
          >
            <option value="">— escolha a categoria —</option>
            <optgroup label="Receitas">
              {macros.filter((m) => m.tipo === 'receita').map((m) => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
            </optgroup>
            <optgroup label="Despesas">
              {macros.filter((m) => m.tipo === 'despesa').map((m) => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
            </optgroup>
          </select>
        </label>

        {destino && rows.find((r) => r.id === destino)?.tipo !== rubrica.tipo && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-2.5 py-1.5">
            A rubrica vai mudar de {rubrica.tipo === 'receita' ? 'receita' : 'despesa'} para{' '}
            {rows.find((r) => r.id === destino)?.tipo === 'receita' ? 'receita' : 'despesa'},
            herdando o tipo da categoria destino.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose} type="button" disabled={pending}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" onClick={confirmar} type="button" disabled={pending || !destino}>
            {pending ? <Loader2 size={14} className="animate-spin" /> : <FolderInput size={14} />}
            Mover
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function ExcluirComMergeDialog({
  clientId,
  item,
  rows,
  onClose,
  onCriarRubrica,
  onCriarCategoria,
}: {
  clientId: string;
  item: CategoriaRow;
  rows: CategoriaRow[];
  onClose: () => void;
  onCriarRubrica: (parentId: string, nome: string) => Promise<string | null>;
  onCriarCategoria: (tipo: 'receita' | 'despesa', nome: string) => Promise<string | null>;
}) {
  const ehRubrica = item.parent_id != null;
  // Destinos candidatos: outras rubricas da mesma categoria, OU outras categorias do mesmo tipo
  const destinos = useMemo(() => {
    if (ehRubrica) {
      return rows
        .filter((r) => r.id !== item.id && r.parent_id === item.parent_id && r.ativo)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    }
    return rows
      .filter((r) => r.id !== item.id && !r.parent_id && r.tipo === item.tipo && r.ativo)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [rows, item, ehRubrica]);

  const [modo, setModo] = useState<'mover' | 'criar' | 'desativar'>('mover');
  const [destId, setDestId] = useState<string>('');
  const [novoNome, setNovoNome] = useState('');
  const [pending, start] = useTransition();
  const tipoLabel = ehRubrica ? 'rubrica' : 'categoria';

  function confirmar() {
    start(async () => {
      let destinoFinal: string | null | undefined;

      if (modo === 'mover') {
        if (!destId) {
          toast.error(`Escolha a ${tipoLabel} de destino`);
          return;
        }
        destinoFinal = destId;
      } else if (modo === 'criar') {
        if (!novoNome.trim()) {
          toast.error('Digite o nome');
          return;
        }
        let novoId: string | null;
        if (ehRubrica) {
          novoId = await onCriarRubrica(item.parent_id!, novoNome.trim());
        } else {
          novoId = await onCriarCategoria(item.tipo, novoNome.trim());
        }
        if (!novoId) return;
        destinoFinal = novoId;
      } else {
        // desativar
        destinoFinal = null;
      }

      const res = await excluirItem({
        client_id: clientId,
        id: item.id,
        migrate_to: destinoFinal,
        soft_se_em_uso: modo === 'desativar',
      });
      if (!res.ok) {
        toast.error(res.error ?? 'Falha');
        return;
      }
      if (modo === 'desativar') {
        toast.success(`${tipoLabel === 'rubrica' ? 'Rubrica' : 'Categoria'} desativada — lançamentos antigos preservados`);
      } else {
        toast.success(`${item.lancamentos} lançamento(s) movidos e ${tipoLabel} excluída`);
      }
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-red-600">
              Excluir {tipoLabel}
            </p>
            <h3 className="mt-1 text-lg font-bold text-slate-900">
              {item.nome}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Essa {tipoLabel} tem <strong>{item.lancamentos} lançamento{item.lancamentos === 1 ? '' : 's'}</strong> vinculado{item.lancamentos === 1 ? '' : 's'}.
              Pra onde mover?
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2">
          {/* Opção 1: mover pra existente */}
          <label className={`block rounded-lg border-2 p-3 cursor-pointer ${
            modo === 'mover' ? 'border-brand-400 bg-brand-50/40' : 'border-slate-200 hover:border-slate-300'
          }`}>
            <div className="flex items-center gap-2">
              <input type="radio" checked={modo === 'mover'} onChange={() => setModo('mover')} className="h-4 w-4" />
              <span className="text-sm font-medium text-slate-900">Mover para outra {tipoLabel}</span>
            </div>
            {modo === 'mover' && (
              <div className="mt-2 ml-6">
                {destinos.length === 0 ? (
                  <p className="text-xs text-amber-700">
                    Não há outra {tipoLabel} disponível. Use "Criar nova" ou "Desativar".
                  </p>
                ) : (
                  <select
                    value={destId}
                    onChange={(e) => setDestId(e.target.value)}
                    className="w-full text-sm rounded-md border border-slate-200 bg-white px-2 py-1.5"
                  >
                    <option value="">— escolha a {tipoLabel} —</option>
                    {destinos.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nome} ({d.lancamentos} lançamentos)
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </label>

          {/* Opção 2: criar nova */}
          <label className={`block rounded-lg border-2 p-3 cursor-pointer ${
            modo === 'criar' ? 'border-brand-400 bg-brand-50/40' : 'border-slate-200 hover:border-slate-300'
          }`}>
            <div className="flex items-center gap-2">
              <input type="radio" checked={modo === 'criar'} onChange={() => setModo('criar')} className="h-4 w-4" />
              <span className="text-sm font-medium text-slate-900">
                Criar uma nova {tipoLabel}{!ehRubrica ? ` (${item.tipo})` : ''}
              </span>
            </div>
            {modo === 'criar' && (
              <div className="mt-2 ml-6">
                <input
                  type="text"
                  autoFocus
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder={`Nome da nova ${tipoLabel}…`}
                  className="w-full text-sm rounded-md border border-slate-200 bg-white px-2 py-1.5"
                />
              </div>
            )}
          </label>

          {/* Opção 3: desativar (preserva) */}
          <label className={`block rounded-lg border-2 p-3 cursor-pointer ${
            modo === 'desativar' ? 'border-amber-400 bg-amber-50/40' : 'border-slate-200 hover:border-slate-300'
          }`}>
            <div className="flex items-center gap-2">
              <input type="radio" checked={modo === 'desativar'} onChange={() => setModo('desativar')} className="h-4 w-4" />
              <span className="text-sm font-medium text-slate-900">Só desativar (esconder dos cadastros)</span>
            </div>
            {modo === 'desativar' && (
              <p className="mt-1 ml-6 text-xs text-slate-500">
                Os {item.lancamentos} lançamentos ficam com essa {tipoLabel} ainda atribuída, mas ela some das listas pra novos lançamentos.
              </p>
            )}
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" onClick={confirmar} disabled={pending}>
            {pending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            Confirmar exclusão
          </Button>
        </div>
      </div>
    </div>
  );
}
