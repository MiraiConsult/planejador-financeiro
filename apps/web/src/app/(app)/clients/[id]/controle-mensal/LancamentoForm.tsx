'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { X, Plus, Pencil } from 'lucide-react';
import * as Lucide from 'lucide-react';
import { Tag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { MESES } from '@/lib/controle-mensal/rules';
import { parseValor } from '@/lib/controle-mensal/valores';
import { type Centro, buildTree, flatten } from '@/lib/controle-mensal/centros';
import { criarLancamento, atualizarLancamento } from './actions';

export interface Sugestoes {
  categorias: string[];
  subcategorias: string[];
  origens: string[];
}

export interface LancamentoInicial {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  categoria: string | null;
  subcategoria: string | null;
  mes: string;
  tipo: string;
  centro_id?: string | null;
  eh_receita?: boolean | null;
  origem: string | null;
  cliente_obs: string | null;
}

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

function mesDeData(iso: string): string {
  const m = Number(iso.slice(5, 7));
  return MESES[m - 1] ?? MESES[0]!;
}

function Icone({ nome, size = 12 }: { nome: string; size?: number }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Cmp = (Lucide as any)[nome] ?? Tag;
  return <Cmp size={size} />;
}

export function LancamentoForm({
  clientId,
  initial,
  onClose,
  sugestoes,
  centros,
}: {
  clientId: string;
  initial: LancamentoInicial | null;
  onClose: () => void;
  sugestoes: Sugestoes;
  centros: Centro[];
}) {
  const editando = !!initial;
  const flat = useMemo(() => flatten(buildTree(centros.filter((c) => c.ativo))), [centros]);
  // Default = primeiro centro raiz ativo
  const defaultCentro = flat.find((c) => c.parent_id === null)?.id ?? flat[0]?.id ?? null;

  const [data, setData] = useState(initial?.data?.slice(0, 10) ?? hoje());
  const [mes, setMes] = useState(initial?.mes || mesDeData(initial?.data?.slice(0, 10) ?? hoje()));
  const [mesTocado, setMesTocado] = useState(false);
  const [centroId, setCentroId] = useState<string | null>(
    initial?.centro_id ?? defaultCentro,
  );
  const [ehReceita, setEhReceita] = useState<boolean>(
    initial?.eh_receita ?? (initial ? initial.valor >= 0 : false),
  );
  const [valor, setValor] = useState(initial ? String(Math.abs(initial.valor)) : '');
  const [descricao, setDescricao] = useState(initial?.descricao ?? '');
  const [categoria, setCategoria] = useState(initial?.categoria ?? '');
  const [subcategoria, setSubcategoria] = useState(initial?.subcategoria ?? '');
  const [origem, setOrigem] = useState(initial?.origem ?? '');
  const [clienteObs, setClienteObs] = useState(initial?.cliente_obs ?? '');
  const [pending, start] = useTransition();
  const descRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!mesTocado) setMes(mesDeData(data));
  }, [data, mesTocado]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    descRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function submit() {
    const abs = Math.abs(parseValor(valor));
    if (!descricao.trim()) {
      toast.error('Descrição é obrigatória.');
      return;
    }
    if (!abs) {
      toast.error('Informe um valor.');
      return;
    }
    if (!centroId && flat.length > 0) {
      toast.error('Escolha um centro.');
      return;
    }
    const raw = {
      data,
      descricao: descricao.trim(),
      valor: ehReceita ? abs : -abs,
      categoria: categoria.trim(),
      subcategoria: subcategoria.trim(),
      mes,
      // tipo derivado pra manter compatibilidade com banco legado
      tipo: ehReceita ? 'receita' : (deriveTipoLegado(centroId, flat) ?? 'pessoal'),
      centro_id: centroId,
      eh_receita: ehReceita,
      origem: origem.trim(),
      cliente_obs: clienteObs.trim(),
    };
    start(async () => {
      const res = editando
        ? await atualizarLancamento(clientId, initial!.id, raw)
        : await criarLancamento(clientId, raw);
      if (res.ok) {
        toast.success(editando ? 'Lançamento atualizado' : 'Lançamento adicionado');
        onClose();
      } else {
        toast.error(res.erro ?? 'Falha ao salvar');
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-soft-lg max-h-[92vh] overflow-y-auto">
        <header className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">
            {editando ? <Pencil size={15} className="text-brand-600" /> : <Plus size={15} className="text-brand-600" />}
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {editando ? 'Editar lançamento' : 'Novo lançamento'}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <X size={16} />
          </button>
        </header>

        <div className="p-5 space-y-4">
          {/* Centro */}
          <Campo label="Centro">
            {flat.length === 0 ? (
              <p className="text-xs text-amber-600 px-2 py-1.5 bg-amber-50 dark:bg-amber-950/30 rounded-md">
                Nenhum centro configurado ainda. Vá em <strong>Centros</strong> e crie pelo menos um.
              </p>
            ) : (
              <select
                value={centroId ?? ''}
                onChange={(e) => setCentroId(e.target.value || null)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {flat.map((c) => (
                  <option key={c.id} value={c.id}>
                    {'— '.repeat(c.depth)}{c.nome}
                  </option>
                ))}
              </select>
            )}
          </Campo>

          {/* valor + entrada/saída */}
          <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
            <Campo label="Valor">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
                <input
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  inputMode="decimal"
                  placeholder="0,00"
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </Campo>
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 text-xs h-9">
              <button
                type="button"
                onClick={() => setEhReceita(true)}
                className={`px-3 rounded-md ${ehReceita ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium' : 'text-slate-500'}`}
              >
                + Receita
              </button>
              <button
                type="button"
                onClick={() => setEhReceita(false)}
                className={`px-3 rounded-md ${!ehReceita ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-medium' : 'text-slate-500'}`}
              >
                − Despesa
              </button>
            </div>
          </div>

          <Campo label="Descrição">
            <input
              ref={descRef}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Ex: Mercado Zaffari"
              className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Categoria">
              <input
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                list="cm-categorias"
                placeholder="Ex: Alimentação & Bares"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </Campo>
            <Campo label="Rubrica (subcategoria)">
              <input
                value={subcategoria}
                onChange={(e) => setSubcategoria(e.target.value)}
                list="cm-subcategorias"
                placeholder="Ex: Restaurantes POA"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Data">
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </Campo>
            <Campo label="Mês de competência">
              <select
                value={mes}
                onChange={(e) => {
                  setMes(e.target.value);
                  setMesTocado(true);
                }}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {MESES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Banco / Origem">
              <input
                value={origem}
                onChange={(e) => setOrigem(e.target.value)}
                list="cm-origens"
                placeholder="Escolha um banco cadastrado ou digite"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </Campo>
            <Campo label="Cliente / Obs">
              <input
                value={clienteObs}
                onChange={(e) => setClienteObs(e.target.value)}
                placeholder="Opcional"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </Campo>
          </div>

          <datalist id="cm-categorias">{sugestoes.categorias.map((c) => <option key={c} value={c} />)}</datalist>
          <datalist id="cm-subcategorias">{sugestoes.subcategorias.map((c) => <option key={c} value={c} />)}</datalist>
          <datalist id="cm-origens">{sugestoes.origens.map((c) => <option key={c} value={c} />)}</datalist>
        </div>

        <footer className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>Cancelar</Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={pending}>
            {pending ? 'Salvando…' : editando ? 'Salvar' : 'Adicionar'}
          </Button>
        </footer>
      </div>
    </div>
  );
}

/** Deriva o `tipo` legado a partir do centro escolhido (compat com banco). */
function deriveTipoLegado(centroId: string | null, todos: { id: string; nome: string; parent_id: string | null }[]): string {
  if (!centroId) return 'pessoal';
  // Sobe até a raiz e usa o nome dela
  let cur = todos.find((c) => c.id === centroId);
  while (cur && cur.parent_id) {
    const pai = todos.find((c) => c.id === cur!.parent_id);
    if (!pai) break;
    cur = pai;
  }
  const nome = (cur?.nome ?? '').toLowerCase();
  if (nome.includes('mirai')) return 'mirai';
  if (nome.includes('viagem') || nome.includes('viage')) return 'viagem';
  return 'pessoal';
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}
