'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  ArrowUpDown, ArrowUp, ArrowDown, Pencil, Trash2, Download, SlidersHorizontal, X,
} from 'lucide-react';
import { brl, fmtData } from '@/lib/controle-mensal/format';
import type { Lancamento } from '@/lib/controle-mensal/analytics';
import { LancamentoForm, type Sugestoes } from './LancamentoForm';
import { excluirLancamento, excluirLancamentosEmMassa } from './actions';
import { toast } from '@/components/ui/Toast';

type SortKey = 'data' | 'descricao' | 'tipo' | 'categoria' | 'subcategoria' | 'mes' | 'origem' | 'cliente_obs' | 'valor';

const val = (n: number) => (n < 0 ? 'text-red-600' : n > 0 ? 'text-emerald-600' : 'text-slate-400');
const tipoLabel: Record<string, string> = {
  receita: 'Receita', pessoal: 'Pessoal', mirai: 'Mirai', viagem: 'Viagem',
};

function csvEscape(v: string): string {
  return /[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function LancamentosTable({
  rows,
  clientId,
  sugestoes,
  centros: centrosCfg = [],
  titulo = 'Lançamentos',
  mostrarCentro = true,
}: {
  rows: Lancamento[];
  clientId: string;
  sugestoes: Sugestoes;
  centros?: import('@/lib/controle-mensal/centros').Centro[];
  titulo?: string;
  mostrarCentro?: boolean;
}) {
  const [q, setQ] = useState('');
  const [ano, setAno] = useState('');
  const [mes, setMes] = useState('');
  const [centro, setCentro] = useState('');
  const [categoria, setCategoria] = useState('');
  const [origem, setOrigem] = useState('');
  const [valMin, setValMin] = useState('');
  const [valMax, setValMax] = useState('');
  const [dataIni, setDataIni] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [maisFiltros, setMaisFiltros] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('data');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [editing, setEditing] = useState<Lancamento | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  // Paginação client-side: começa em 100 linhas, +100 a cada clique.
  // Reseta sempre que algum filtro/ordenação muda.
  const PAGE_SIZE = 100;
  const [visivel, setVisivel] = useState(PAGE_SIZE);
  const [pending, start] = useTransition();

  const anos = useMemo(
    () => [...new Set(rows.map((r) => r.ano).filter((a): a is number => a != null))].sort((a, b) => b - a),
    [rows],
  );
  const meses = useMemo(() => [...new Set(rows.map((r) => r.mes).filter(Boolean))], [rows]);
  const centros = useMemo(() => [...new Set(rows.map((r) => r.tipo).filter(Boolean))], [rows]);
  const categorias = useMemo(
    () => [...new Set(rows.map((r) => r.categoria ?? '').filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [rows],
  );
  const origens = useMemo(() => [...new Set(rows.map((r) => r.origem ?? '').filter(Boolean))], [rows]);

  const temViagem = rows.some((l) => l.viagem);
  const temSistema = rows.some((l) => l.sistema);
  const filtrosAtivos =
    !!(q || ano || mes || centro || categoria || origem || valMin || valMax || dataIni || dataFim);

  const filtrados = useMemo(() => {
    const min = valMin ? Number(valMin) : null;
    const max = valMax ? Number(valMax) : null;
    const arr = rows.filter((l) => {
      if (ano && String(l.ano) !== ano) return false;
      if (mes && l.mes !== mes) return false;
      if (centro && l.tipo !== centro) return false;
      if (categoria && (l.categoria ?? '') !== categoria) return false;
      if (origem && (l.origem ?? '') !== origem) return false;
      if (dataIni && l.data < dataIni) return false;
      if (dataFim && l.data > dataFim) return false;
      if (min != null && Math.abs(l.valor) < min) return false;
      if (max != null && Math.abs(l.valor) > max) return false;
      if (q) {
        const blob = `${l.descricao} ${l.categoria ?? ''} ${l.subcategoria ?? ''} ${l.cliente_obs ?? ''} ${l.viagem ?? ''} ${l.sistema ?? ''}`.toLowerCase();
        if (!blob.includes(q.toLowerCase())) return false;
      }
      return true;
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    const key = sortKey;
    arr.sort((a, b) => {
      let r: number;
      if (key === 'valor') r = a.valor - b.valor;
      else if (key === 'mes') r = (a.competencia ?? 0) - (b.competencia ?? 0);
      else {
        const av = String((a as unknown as Record<string, unknown>)[key] ?? '');
        const bv = String((b as unknown as Record<string, unknown>)[key] ?? '');
        r = av.localeCompare(bv, 'pt-BR');
      }
      return r * dir || (a.data < b.data ? 1 : -1);
    });
    return arr;
  }, [rows, q, ano, mes, centro, categoria, origem, valMin, valMax, dataIni, dataFim, sortKey, sortDir]);

  // Sempre que filtros ou ordenação mudam, volta pra primeira página.
  useEffect(() => {
    setVisivel(PAGE_SIZE);
  }, [q, ano, mes, centro, categoria, origem, valMin, valMax, dataIni, dataFim, sortKey, sortDir]);

  const visiveis = useMemo(() => filtrados.slice(0, visivel), [filtrados, visivel]);
  const temMais = filtrados.length > visivel;

  const soma = filtrados.reduce((a, l) => a + l.valor, 0);

  function toggleSort(k: SortKey) {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(k);
      setSortDir(k === 'valor' || k === 'data' || k === 'mes' ? 'desc' : 'asc');
    }
  }

  function limpar() {
    setQ(''); setAno(''); setMes(''); setCentro(''); setCategoria('');
    setOrigem(''); setValMin(''); setValMax(''); setDataIni(''); setDataFim('');
  }

  function exportar() {
    const head = ['Data', 'Descrição', 'Valor', 'Categoria', 'Subcategoria', 'Mês', 'Tipo', 'Origem', 'Cliente/Obs'];
    const linhas = filtrados.map((l) =>
      [l.data, l.descricao, String(l.valor), l.categoria ?? '', l.subcategoria ?? '', l.mes, l.tipo, l.origem ?? '', l.cliente_obs ?? '']
        .map((c) => csvEscape(String(c)))
        .join(';'),
    );
    const csv = '﻿' + [head.join(';'), ...linhas].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `lancamentos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function remover(l: Lancamento) {
    if (!l.id) return;
    if (!confirm(`Excluir "${l.descricao}" (${brl(l.valor)})?`)) return;
    start(async () => {
      const res = await excluirLancamento(clientId, l.id!);
      if (res.ok) {
        toast.success('Lançamento excluído');
        setSelecionados((s) => {
          const n = new Set(s);
          n.delete(l.id!);
          return n;
        });
      } else toast.error(res.erro ?? 'Falha ao excluir');
    });
  }

  function toggleSel(id: string) {
    setSelecionados((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function excluirSelecionados() {
    const ids = [...selecionados];
    if (!ids.length) return;
    if (!confirm(`Excluir ${ids.length} lançamento(s) selecionado(s)? Esta ação não pode ser desfeita.`)) return;
    start(async () => {
      const res = await excluirLancamentosEmMassa(clientId, ids);
      if (res.ok) {
        toast.success(`${res.excluidos ?? ids.length} lançamento(s) excluído(s)`);
        setSelecionados(new Set());
      } else toast.error(res.erro ?? 'Falha ao excluir');
    });
  }

  const selCls =
    'h-8 px-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100';

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
      {/* header + filtros */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{titulo}</p>
          <div className="flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar…"
              className={selCls + ' w-40'}
            />
            <button
              type="button"
              onClick={() => setMaisFiltros((v) => !v)}
              className={`h-8 px-2.5 text-xs rounded-lg border flex items-center gap-1 ${
                maisFiltros || filtrosAtivos
                  ? 'border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/40'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500'
              }`}
            >
              <SlidersHorizontal size={12} />
              Filtros
            </button>
            <button
              type="button"
              onClick={exportar}
              className="h-8 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200"
            >
              <Download size={12} />
              CSV
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {anos.length > 1 && (
            <select value={ano} onChange={(e) => setAno(e.target.value)} className={selCls}>
              <option value="">Todos os anos</option>
              {anos.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
          <select value={mes} onChange={(e) => setMes(e.target.value)} className={selCls}>
            <option value="">Todos os meses</option>
            {meses.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          {mostrarCentro && (
            <select value={centro} onChange={(e) => setCentro(e.target.value)} className={selCls}>
              <option value="">Todos os centros</option>
              {centros.map((c) => <option key={c} value={c}>{tipoLabel[c] ?? c}</option>)}
            </select>
          )}
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={selCls}>
            <option value="">Todas as categorias</option>
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {filtrosAtivos && (
            <button type="button" onClick={limpar} className="h-8 px-2 text-xs text-slate-500 hover:text-red-600 flex items-center gap-1">
              <X size={12} /> limpar
            </button>
          )}
        </div>

        {maisFiltros && (
          <div className="flex flex-wrap gap-2 pt-1">
            <select value={origem} onChange={(e) => setOrigem(e.target.value)} className={selCls}>
              <option value="">Todas as origens</option>
              {origens.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <input value={valMin} onChange={(e) => setValMin(e.target.value)} inputMode="decimal" placeholder="valor mín" className={selCls + ' w-24'} />
            <input value={valMax} onChange={(e) => setValMax(e.target.value)} inputMode="decimal" placeholder="valor máx" className={selCls + ' w-24'} />
            <label className="flex items-center gap-1 text-xs text-slate-500">
              de <input type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} className={selCls} />
            </label>
            <label className="flex items-center gap-1 text-xs text-slate-500">
              até <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className={selCls} />
            </label>
          </div>
        )}
      </div>

      {/* barra de ação em massa */}
      {selecionados.size > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-brand-50 border-y border-brand-200 dark:bg-brand-900/20 dark:border-brand-800 flex-wrap">
          <span className="text-sm font-medium text-brand-900 dark:text-brand-100">
            {selecionados.size} selecionado(s)
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Seleciona o conjunto COMPLETO de filtrados, não só a página visível */}
            {selecionados.size < filtrados.filter((l) => l.id).length && (
              <button
                type="button"
                onClick={() => setSelecionados(new Set(filtrados.map((l) => l.id).filter(Boolean) as string[]))}
                className="text-xs font-semibold text-brand-700 hover:text-brand-900 px-2 py-1"
              >
                Selecionar todos os {filtrados.filter((l) => l.id).length}
                {filtrosAtivos ? ' filtrados' : ''}
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelecionados(new Set())}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1"
            >
              Limpar seleção
            </button>
            <button
              type="button"
              onClick={excluirSelecionados}
              disabled={pending}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 px-3 py-1.5 rounded-md"
            >
              <Trash2 size={13} />
              {pending ? 'Excluindo…' : `Excluir ${selecionados.size}`}
            </button>
          </div>
        </div>
      )}

      {/* tabela */}
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 dark:bg-slate-800/60 sticky top-0 z-10">
            <tr className="text-[10px] uppercase tracking-widest text-slate-500">
              <th className="px-3 py-2.5 w-8">
                <input
                  type="checkbox"
                  className="accent-brand-600 cursor-pointer"
                  title="Selecionar todos os visíveis"
                  checked={
                    visiveis.length > 0 &&
                    visiveis.every((l) => !l.id || selecionados.has(l.id))
                  }
                  onChange={(e) => {
                    setSelecionados((s) => {
                      const n = new Set(s);
                      for (const l of visiveis) {
                        if (!l.id) continue;
                        if (e.target.checked) n.add(l.id);
                        else n.delete(l.id);
                      }
                      return n;
                    });
                  }}
                />
              </th>
              <Th k="data" label="Data" {...{ sortKey, sortDir, toggleSort }} />
              <Th k="descricao" label="Descrição" {...{ sortKey, sortDir, toggleSort }} />
              {mostrarCentro && <Th k="tipo" label="Centro" {...{ sortKey, sortDir, toggleSort }} />}
              <Th k="categoria" label="Categoria" {...{ sortKey, sortDir, toggleSort }} />
              <Th k="subcategoria" label="Rubrica" {...{ sortKey, sortDir, toggleSort }} />
              {temViagem && <th className="text-left px-3 py-2.5 font-semibold">Viagem</th>}
              {temSistema && <th className="text-left px-3 py-2.5 font-semibold">Sistema</th>}
              <Th k="mes" label="Mês" {...{ sortKey, sortDir, toggleSort }} />
              <Th k="origem" label="Origem" {...{ sortKey, sortDir, toggleSort }} />
              <Th k="valor" label="Valor" align="right" {...{ sortKey, sortDir, toggleSort }} />
              <th className="px-3 py-2.5 w-16" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {visiveis.map((l, i) => (
              <tr
                key={l.id ?? i}
                className={`group transition-colors ${
                  l.id && selecionados.has(l.id)
                    ? 'bg-brand-50/60 dark:bg-brand-900/20'
                    : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                }`}
              >
                <td className="px-3 py-2">
                  {l.id && (
                    <input
                      type="checkbox"
                      className="accent-brand-600 cursor-pointer"
                      checked={selecionados.has(l.id)}
                      onChange={() => toggleSel(l.id!)}
                    />
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-500">{fmtData(l.data)}</td>
                <td className="px-3 py-2 text-slate-800 dark:text-slate-100">{l.descricao}</td>
                {mostrarCentro && <td className="px-3 py-2 text-slate-500">{tipoLabel[l.tipo] ?? l.tipo}</td>}
                <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{l.categoria ?? ''}</td>
                <td className="px-3 py-2 text-slate-500">{l.subcategoria ?? ''}</td>
                {temViagem && <td className="px-3 py-2 text-slate-500">{l.viagem ?? ''}</td>}
                {temSistema && <td className="px-3 py-2 text-slate-500">{l.sistema ?? ''}</td>}
                <td className="px-3 py-2 text-slate-500">{l.mes}</td>
                <td className="px-3 py-2 text-slate-500">{l.origem ?? ''}</td>
                <td className={`px-3 py-2 text-right tabular-nums font-medium ${val(l.valor)}`}>{brl(l.valor)}</td>
                <td className="px-2 py-2">
                  {l.id && (
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => setEditing(l)} title="Editar" className="p-1 text-slate-400 hover:text-brand-600">
                        <Pencil size={13} />
                      </button>
                      <button type="button" onClick={() => remover(l)} title="Excluir" className="p-1 text-slate-400 hover:text-red-600">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={13} className="px-4 py-10 text-center text-sm text-slate-400">
                  Nenhum lançamento com esses filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {temMais && (
        <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40">
          <button
            type="button"
            onClick={() => setVisivel((v) => v + PAGE_SIZE)}
            className="text-xs font-semibold text-brand-700 hover:text-brand-800 px-3 py-1.5 rounded-md hover:bg-white"
          >
            Carregar mais {Math.min(PAGE_SIZE, filtrados.length - visivel)}
          </button>
          <button
            type="button"
            onClick={() => setVisivel(filtrados.length)}
            className="text-xs font-medium text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-md hover:bg-white"
          >
            Mostrar todos ({filtrados.length})
          </button>
        </div>
      )}

      <p className="text-xs text-slate-500 px-4 py-2 border-t border-slate-100 dark:border-slate-800">
        Mostrando {Math.min(visivel, filtrados.length).toLocaleString('pt-BR')} de{' '}
        {filtrados.length.toLocaleString('pt-BR')} lançamento(s) · soma (total filtrado):{' '}
        <span className={`font-semibold ${val(soma)}`}>{brl(soma)}</span>
      </p>

      {editing && (
        <LancamentoForm
          clientId={clientId}
          initial={{
            id: editing.id!,
            data: editing.data,
            descricao: editing.descricao,
            valor: editing.valor,
            categoria: editing.categoria,
            subcategoria: editing.subcategoria,
            mes: editing.mes,
            tipo: editing.tipo,
            centro_id: editing.centro_id,
            eh_receita: editing.eh_receita,
            origem: editing.origem,
            cliente_obs: editing.cliente_obs,
          }}
          sugestoes={sugestoes}
          centros={centrosCfg}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function Th({
  k, label, align = 'left', sortKey, sortDir, toggleSort,
}: {
  k: SortKey;
  label: string;
  align?: 'left' | 'right';
  sortKey: SortKey;
  sortDir: 'asc' | 'desc';
  toggleSort: (k: SortKey) => void;
}) {
  const ativo = sortKey === k;
  return (
    <th className={`px-3 py-2.5 font-semibold ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className={`inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 ${ativo ? 'text-slate-700 dark:text-slate-200' : ''} ${align === 'right' ? 'flex-row-reverse' : ''}`}
      >
        {label}
        {ativo ? (sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="opacity-40" />}
      </button>
    </th>
  );
}
