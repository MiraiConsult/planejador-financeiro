'use client';

import { useState, useTransition } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Plus,
  Trash2,
  Sparkles,
  Tag as TagIcon,
} from 'lucide-react';
import * as Lucide from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { CATEGORIAS_DEFAULT, type DraftCategoria } from '../types';
import { sugerirCategoriasDoBP } from '../actions';

function nextTempId(): string {
  return `cat-${Math.random().toString(36).slice(2, 9)}`;
}

function Icone({ nome, size = 14 }: { nome: string; size?: number }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Cmp = (Lucide as any)[nome] ?? TagIcon;
  return <Cmp size={size} />;
}

interface Props {
  clientId: string;
  bpFinalizado: boolean;
  categorias: DraftCategoria[];
  onChange: (cats: DraftCategoria[]) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function StepCategorias({
  clientId,
  bpFinalizado,
  categorias,
  onChange,
  onPrev,
  onNext,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importando, startImport] = useTransition();

  function importarDoBP() {
    startImport(async () => {
      const res = await sugerirCategoriasDoBP(clientId);
      if (!res.ok) {
        toast.error(res.error ?? 'Falha ao importar do balanço');
        return;
      }
      const sugeridas = res.categorias ?? [];
      if (sugeridas.length === 0) {
        toast.error('Nenhuma despesa cadastrada no balanço para importar');
        return;
      }
      const existentes = new Set(categorias.map((c) => c.nome.toLowerCase().trim()));
      const novas = sugeridas
        .filter((s) => !existentes.has(s.nome.toLowerCase().trim()))
        .map<DraftCategoria>((s) => ({
          tempId: nextTempId(),
          nome: s.nome,
          tipo: s.tipo,
          cor: s.cor,
          icone: s.icone,
          parentTempId: null,
        }));
      if (novas.length === 0) {
        toast.success('Categorias do balanço já estão no wizard');
        return;
      }
      onChange([...categorias, ...novas]);
      toast.success(`${novas.length} categoria(s) importada(s) do balanço`);
    });
  }

  function adicionar(parent?: DraftCategoria) {
    const nova: DraftCategoria = {
      tempId: nextTempId(),
      nome: '',
      tipo: parent?.tipo ?? 'gasto',
      cor: parent?.cor ?? '#64748b',
      icone: parent?.icone ?? 'Tag',
      parentTempId: parent?.tempId ?? null,
    };
    onChange([...categorias, nova]);
    setEditingId(nova.tempId);
  }

  function atualizar(tempId: string, patch: Partial<DraftCategoria>) {
    onChange(categorias.map((c) => (c.tempId === tempId ? { ...c, ...patch } : c)));
  }

  function remover(tempId: string) {
    // remove a categoria e as filhas
    const idsRemover = new Set([tempId]);
    let mudou = true;
    while (mudou) {
      mudou = false;
      for (const c of categorias) {
        if (c.parentTempId && idsRemover.has(c.parentTempId) && !idsRemover.has(c.tempId)) {
          idsRemover.add(c.tempId);
          mudou = true;
        }
      }
    }
    onChange(categorias.filter((c) => !idsRemover.has(c.tempId)));
  }

  function aplicarDefaults() {
    if (categorias.length > 0) return;
    onChange(CATEGORIAS_DEFAULT.map((d) => ({ ...d, tempId: nextTempId(), parentTempId: null })));
  }

  const raizes = categorias.filter((c) => !c.parentTempId);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
          Passo 2 de 4 · Categorias
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
          Quais categorias o cliente usa?
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
          Categorias rotulam cada lançamento (Moradia, Mercado, Salário…). Comece com um pacote pronto e
          ajuste, ou crie do zero. Cada categoria pode ter subcategorias.
        </p>
      </div>

      {categorias.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-8 text-center space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Nenhuma categoria ainda. Comece com 8 categorias padrão{bpFinalizado ? ', importe das despesas do balanço' : ''} ou crie do zero.
          </p>
          <div className="flex justify-center flex-wrap gap-2">
            <Button variant="primary" size="sm" onClick={aplicarDefaults}>
              <Sparkles size={13} />
              Usar pacote padrão (8 categorias)
            </Button>
            {bpFinalizado && (
              <Button variant="outline" size="sm" onClick={importarDoBP} disabled={importando}>
                <Download size={13} />
                {importando ? 'Importando…' : 'Importar das despesas do balanço'}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => adicionar()}>
              <Plus size={13} />
              Criar do zero
            </Button>
          </div>
        </div>
      )}

      {categorias.length > 0 && (
        <div className="space-y-2">
          {raizes.map((cat) => {
            const subs = categorias.filter((c) => c.parentTempId === cat.tempId);
            return (
              <div key={cat.tempId} className="space-y-1.5">
                <CategoriaRow
                  cat={cat}
                  isEditing={editingId === cat.tempId}
                  onStartEdit={() => setEditingId(cat.tempId)}
                  onStopEdit={() => setEditingId(null)}
                  onChange={(patch) => atualizar(cat.tempId, patch)}
                  onRemove={() => remover(cat.tempId)}
                  onAddSub={() => adicionar(cat)}
                />
                {subs.length > 0 && (
                  <div className="ml-8 space-y-1.5 border-l-2 border-slate-100 dark:border-slate-800 pl-3">
                    {subs.map((sub) => (
                      <CategoriaRow
                        key={sub.tempId}
                        cat={sub}
                        isSub
                        isEditing={editingId === sub.tempId}
                        onStartEdit={() => setEditingId(sub.tempId)}
                        onStopEdit={() => setEditingId(null)}
                        onChange={(patch) => atualizar(sub.tempId, patch)}
                        onRemove={() => remover(sub.tempId)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => adicionar()}>
              <Plus size={13} />
              Adicionar categoria
            </Button>
            {bpFinalizado && (
              <Button variant="ghost" size="sm" onClick={importarDoBP} disabled={importando}>
                <Download size={13} />
                {importando ? 'Importando…' : 'Importar das despesas do balanço'}
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
        <Button variant="ghost" size="md" onClick={onPrev}>
          <ArrowLeft size={14} />
          Voltar
        </Button>
        <Button variant="primary" size="md" onClick={onNext}>
          Continuar
          <ArrowRight size={14} />
        </Button>
      </div>
    </div>
  );
}

function CategoriaRow({
  cat,
  isSub = false,
  isEditing,
  onStartEdit,
  onStopEdit,
  onChange,
  onRemove,
  onAddSub,
}: {
  cat: DraftCategoria;
  isSub?: boolean;
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onChange: (patch: Partial<DraftCategoria>) => void;
  onRemove: () => void;
  onAddSub?: () => void;
}) {
  if (isEditing) {
    return (
      <div className="rounded-xl border-2 border-brand-300 dark:border-brand-700 bg-white dark:bg-slate-900 p-3 space-y-2">
        <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
          <input
            type="text"
            autoFocus
            value={cat.nome}
            onChange={(e) => onChange({ nome: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && cat.nome.trim()) onStopEdit();
              if (e.key === 'Escape') onStopEdit();
            }}
            placeholder="Nome da categoria"
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          />
          <select
            value={cat.tipo}
            onChange={(e) => onChange({ tipo: e.target.value as DraftCategoria['tipo'] })}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 px-2 py-1.5 text-xs"
          >
            <option value="gasto">Gasto</option>
            <option value="receita">Receita</option>
            <option value="ambos">Ambos</option>
          </select>
          <input
            type="color"
            value={cat.cor}
            onChange={(e) => onChange({ cor: e.target.value })}
            className="h-8 w-10 rounded cursor-pointer border border-slate-200 dark:border-slate-700"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onStopEdit}>
            OK
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 ${
        isSub ? 'text-sm' : 'text-sm font-medium'
      }`}
    >
      <span
        className="h-7 w-7 rounded-md flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${cat.cor}22`, color: cat.cor }}
      >
        <Icone nome={cat.icone} size={isSub ? 12 : 14} />
      </span>
      <button
        type="button"
        onClick={onStartEdit}
        className="flex-1 text-left truncate text-slate-900 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400"
      >
        {cat.nome || <span className="text-slate-400 italic">Sem nome</span>}
      </button>
      <span className="text-[10px] uppercase tracking-widest text-slate-400 shrink-0">
        {cat.tipo}
      </span>
      {!isSub && onAddSub && (
        <button
          type="button"
          onClick={onAddSub}
          className="text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Adicionar subcategoria"
        >
          <Plus size={14} />
        </button>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Remover"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
