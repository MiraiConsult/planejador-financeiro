'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import {
  Bot,
  Save,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Edit3,
  X,
  Highlighter,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { saveTranscricao, applyRefinementPatch } from './actions';
import type { RefinementPatch } from '@/lib/ai/refineSchema';

interface Props {
  clientId: string;
  initialTranscricao: string;
}

export function TranscriptWorkspace({ clientId, initialTranscricao }: Props) {
  const [transcricao, setTranscricao] = useState(initialTranscricao);
  const [savedTranscricao, setSavedTranscricao] = useState(initialTranscricao);
  const [editingTranscript, setEditingTranscript] = useState(initialTranscricao.length === 0);

  const [selectedText, setSelectedText] = useState('');
  const [instrucao, setInstrucao] = useState('');
  const [thinking, setThinking] = useState(false);
  const [patch, setPatch] = useState<RefinementPatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const transcriptRef = useRef<HTMLDivElement>(null);

  function captureSelection() {
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? '';
    if (text.length > 0) setSelectedText(text);
  }

  async function handleSaveTranscript() {
    startTransition(async () => {
      const res = await saveTranscricao({ client_id: clientId, texto: transcricao });
      if (res.ok) {
        setSavedTranscricao(transcricao);
        setEditingTranscript(false);
        toast.success('Transcrição salva');
      } else {
        toast.error(`Falha: ${res.error}`);
      }
    });
  }

  async function handleRefine() {
    if (!instrucao.trim()) {
      toast.error('Descreva o que ajustar');
      return;
    }
    setThinking(true);
    setError(null);
    setPatch(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/refine-from-transcript`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ trecho: selectedText, instrucao }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as RefinementPatch;
      setPatch(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erro desconhecido');
    } finally {
      setThinking(false);
    }
  }

  function handleApplyPatch() {
    if (!patch) return;
    startTransition(async () => {
      const res = await applyRefinementPatch({ client_id: clientId, patch });
      if (res.ok) {
        toast.success(`${res.aplicado} alteraç${res.aplicado === 1 ? 'ão' : 'ões'} aplicada${res.aplicado === 1 ? '' : 's'}`);
        setPatch(null);
        setInstrucao('');
        setSelectedText('');
      } else {
        toast.error(`Falha: ${res.error}`);
      }
    });
  }

  return (
    <div className="grid lg:grid-cols-[1fr_400px] gap-6">
      {/* ─── Painel esquerdo: transcrição ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Transcrição da reunião
          </p>
          {!editingTranscript && transcricao && (
            <button
              type="button"
              onClick={() => setEditingTranscript(true)}
              className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1"
            >
              <Edit3 size={11} />
              Editar
            </button>
          )}
        </div>

        {editingTranscript ? (
          <div className="space-y-2">
            <textarea
              value={transcricao}
              onChange={(e) => setTranscricao(e.target.value)}
              rows={28}
              placeholder="Cole a transcrição completa aqui (Granola, etc)..."
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 px-4 py-3 text-sm font-mono leading-relaxed placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />
            <div className="flex justify-between">
              {savedTranscricao && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTranscricao(savedTranscricao);
                    setEditingTranscript(false);
                  }}
                >
                  <X size={13} />
                  Cancelar
                </Button>
              )}
              <Button size="sm" onClick={handleSaveTranscript} disabled={transcricao === savedTranscricao}>
                <Save size={13} />
                Salvar transcrição
              </Button>
            </div>
          </div>
        ) : (
          <div
            ref={transcriptRef}
            onMouseUp={captureSelection}
            onTouchEnd={captureSelection}
            className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 max-h-[75vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300 selection:bg-brand-200 dark:selection:bg-brand-700 dark:selection:text-brand-50"
          >
            {transcricao}
          </div>
        )}
      </div>

      {/* ─── Painel direito: pedido à IA ─── */}
      <div className="lg:sticky lg:top-6 space-y-4 h-fit">
        {patch ? (
          <PatchPreview
            patch={patch}
            onConfirm={handleApplyPatch}
            onCancel={() => setPatch(null)}
          />
        ) : (
          <div className="rounded-2xl border border-brand-200 dark:border-brand-800 bg-brand-50/40 dark:bg-brand-950/30 p-5 space-y-4">
            <div className="flex items-start gap-2">
              <Bot size={18} className="text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-brand-900 dark:text-brand-100">
                  Pedido pra IA
                </p>
                <p className="text-[11px] text-brand-800/80 dark:text-brand-200/80 mt-0.5">
                  Selecione um trecho na transcrição (opcional) e descreva o ajuste.
                </p>
              </div>
            </div>

            {selectedText && (
              <div className="rounded-lg border border-brand-300 dark:border-brand-700 bg-white dark:bg-slate-900 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400 flex items-center gap-1">
                    <Highlighter size={10} />
                    Trecho selecionado
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedText('')}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <X size={12} />
                  </button>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 italic line-clamp-4">
                  "{selectedText}"
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-brand-700 dark:text-brand-400">
                O que ajustar?
              </label>
              <textarea
                value={instrucao}
                onChange={(e) => setInstrucao(e.target.value)}
                placeholder="Ex: o cliente disse 100k aos 50, na verdade é 120k · ou: adicionar MBA aos 35 por 200k"
                rows={5}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 px-3 py-2 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50/40 dark:bg-red-950/30 p-3 flex items-start gap-2">
                <AlertCircle size={13} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            <Button
              size="md"
              onClick={handleRefine}
              disabled={thinking || !instrucao.trim()}
              className="w-full"
            >
              {thinking ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Pensando...
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  Enviar pra IA
                </>
              )}
            </Button>

            <p className="text-[10px] text-brand-700/70 dark:text-brand-400/70 text-center">
              A IA vai propor as mudanças · você confirma antes de aplicar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PatchPreview({
  patch,
  onConfirm,
  onCancel,
}: {
  patch: RefinementPatch;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ops: { type: 'add' | 'update' | 'remove'; label: string }[] = [];

  for (const a of patch.assets_add ?? []) ops.push({ type: 'add', label: `Ativo: ${a.nome} · R$ ${fmt(a.valor)}` });
  for (const u of patch.assets_update ?? []) ops.push({ type: 'update', label: `Ativo "${u.match_descricao}" · alterações` });
  for (const r of patch.assets_remove ?? []) ops.push({ type: 'remove', label: `Ativo "${r.match_descricao}"` });

  for (const a of patch.expenses_add ?? []) ops.push({ type: 'add', label: `Despesa: ${a.descricao} · R$ ${fmt(a.valor_mensal)}/mês` });
  for (const u of patch.expenses_update ?? []) ops.push({ type: 'update', label: `Despesa "${u.match_descricao}" · alterações` });
  for (const r of patch.expenses_remove ?? []) ops.push({ type: 'remove', label: `Despesa "${r.match_descricao}"` });

  for (const a of patch.events_add ?? []) ops.push({ type: 'add', label: `Evento: ${a.descricao} · ${a.valor >= 0 ? '+' : ''}R$ ${fmt(a.valor)}` });
  for (const u of patch.events_update ?? []) ops.push({ type: 'update', label: `Evento "${u.match_descricao}" · alterações` });
  for (const r of patch.events_remove ?? []) ops.push({ type: 'remove', label: `Evento "${r.match_descricao}"` });

  for (const a of patch.liabilities_add ?? []) ops.push({ type: 'add', label: `Passivo: ${a.nome} · saldo R$ ${fmt(a.saldo_atual)}` });
  for (const u of patch.liabilities_update ?? []) ops.push({ type: 'update', label: `Passivo "${u.match_descricao}" · alterações` });
  for (const r of patch.liabilities_remove ?? []) ops.push({ type: 'remove', label: `Passivo "${r.match_descricao}"` });

  if (patch.cliente_updates) ops.push({ type: 'update', label: 'Dados do cliente' });
  if (patch.perfil_updates) ops.push({ type: 'update', label: 'Perfil subjetivo' });

  return (
    <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/30 p-5 space-y-4">
      <div className="flex items-start gap-2">
        <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
            Vou aplicar {ops.length} alteraç{ops.length === 1 ? 'ão' : 'ões'}
          </p>
          <p className="text-[11px] text-emerald-800/80 dark:text-emerald-200/80 mt-0.5 italic">
            "{patch.resumo_da_acao}"
          </p>
        </div>
      </div>

      <ul className="space-y-1.5 max-h-[300px] overflow-y-auto">
        {ops.map((op, i) => (
          <li key={i} className="flex items-start gap-2 text-xs rounded-lg bg-white dark:bg-slate-900 px-3 py-2 border border-emerald-100 dark:border-emerald-900">
            {op.type === 'add' && <Plus size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />}
            {op.type === 'update' && <Edit3 size={12} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />}
            {op.type === 'remove' && <Minus size={12} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />}
            <span className="text-slate-700 dark:text-slate-300">{op.label}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X size={13} />
          Cancelar
        </Button>
        <Button size="sm" onClick={onConfirm}>
          <CheckCircle2 size={13} />
          Aplicar mudanças
        </Button>
      </div>
    </div>
  );
}

function fmt(n: number) {
  return Math.abs(n).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}
