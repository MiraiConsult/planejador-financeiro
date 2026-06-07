'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { X, Plus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { MESES } from '@/lib/controle-mensal/rules';
import { parseValor } from '@/lib/controle-mensal/valores';
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
  origem: string | null;
  cliente_obs: string | null;
}

const TIPOS = [
  { value: 'receita', label: 'Receita' },
  { value: 'pessoal', label: 'Pessoal' },
  { value: 'mirai', label: 'Mirai' },
  { value: 'viagem', label: 'Viagem' },
] as const;

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

function mesDeData(iso: string): string {
  const m = Number(iso.slice(5, 7));
  return MESES[m - 1] ?? MESES[0]!;
}

export function LancamentoForm({
  clientId,
  initial,
  onClose,
  sugestoes,
}: {
  clientId: string;
  initial: LancamentoInicial | null;
  onClose: () => void;
  sugestoes: Sugestoes;
}) {
  const editando = !!initial;
  const [data, setData] = useState(initial?.data?.slice(0, 10) ?? hoje());
  const [mes, setMes] = useState(initial?.mes || mesDeData(initial?.data?.slice(0, 10) ?? hoje()));
  const [mesTocado, setMesTocado] = useState(false);
  const [tipo, setTipo] = useState<string>(initial?.tipo ?? 'pessoal');
  const [sinal, setSinal] = useState<'entrada' | 'saida'>(
    initial ? (initial.valor >= 0 ? 'entrada' : 'saida') : 'saida',
  );
  const [valor, setValor] = useState(initial ? String(Math.abs(initial.valor)) : '');
  const [descricao, setDescricao] = useState(initial?.descricao ?? '');
  const [categoria, setCategoria] = useState(initial?.categoria ?? '');
  const [subcategoria, setSubcategoria] = useState(initial?.subcategoria ?? '');
  const [origem, setOrigem] = useState(initial?.origem ?? '');
  const [clienteObs, setClienteObs] = useState(initial?.cliente_obs ?? '');
  const [pending, start] = useTransition();
  const descRef = useRef<HTMLInputElement>(null);

  // Ao trocar a data, ajusta o mês de competência (até o usuário mexer nele manualmente).
  useEffect(() => {
    if (!mesTocado) setMes(mesDeData(data));
  }, [data, mesTocado]);

  // Default do sinal segue o tipo (receita = entrada), sem sobrescrever escolha do usuário ao editar.
  useEffect(() => {
    if (!editando) setSinal(tipo === 'receita' ? 'entrada' : 'saida');
  }, [tipo, editando]);

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
    const raw = {
      data,
      descricao: descricao.trim(),
      valor: sinal === 'entrada' ? abs : -abs,
      categoria: categoria.trim(),
      subcategoria: subcategoria.trim(),
      mes,
      tipo,
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
          {/* tipo (área) */}
          <Campo label="Tipo (centro de custo de topo)">
            <div className="grid grid-cols-4 gap-1.5">
              {TIPOS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTipo(t.value)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    tipo === t.value
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Campo>

          {/* valor + sinal */}
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
                onClick={() => setSinal('entrada')}
                className={`px-3 rounded-md ${sinal === 'entrada' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium' : 'text-slate-500'}`}
              >
                + Entra
              </button>
              <button
                type="button"
                onClick={() => setSinal('saida')}
                className={`px-3 rounded-md ${sinal === 'saida' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-medium' : 'text-slate-500'}`}
              >
                − Sai
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
            <Campo label="Centro de custo (categoria)">
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
            <Campo label="Origem">
              <input
                value={origem}
                onChange={(e) => setOrigem(e.target.value)}
                list="cm-origens"
                placeholder="Ex: Cartão, PIX, Débito"
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

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}
