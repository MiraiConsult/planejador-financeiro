'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import {
  Bot,
  Save,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Edit3,
  X,
  Trash2,
  FileText,
  ChevronRight,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import {
  saveTranscricao,
  applyRefinementPatch,
  clearChatHistory,
  markMessagePatchApplied,
  type RefineChatMessage,
} from './actions';
import type { RefinementPatch } from '@/lib/ai/refineSchema';

interface Props {
  clientId: string;
  initialTranscricao: string;
  initialMessages: RefineChatMessage[];
}

export function ChatWorkspace({ clientId, initialTranscricao, initialMessages }: Props) {
  const [messages, setMessages] = useState<RefineChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [transcricao, setTranscricao] = useState(initialTranscricao);
  const [savedTranscricao, setSavedTranscricao] = useState(initialTranscricao);
  const [showTranscript, setShowTranscript] = useState(false);
  const [editingTranscript, setEditingTranscript] = useState(initialTranscricao.length === 0);
  const [, startTransition] = useTransition();

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // auto-scroll quando chegam mensagens novas
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);

    // mostra mensagem do usuário imediatamente (otimista)
    const tempUser: RefineChatMessage = {
      id: `tmp-${Date.now()}`,
      role: 'user',
      content: text,
      patch: null,
      patch_applied: false,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, tempUser]);
    setInput('');

    try {
      const res = await fetch(`/api/clients/${clientId}/refine-chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { user: RefineChatMessage; assistant: RefineChatMessage };
      // substitui a temp pelo registro real + adiciona a resposta
      setMessages((m) => [...m.filter((x) => x.id !== tempUser.id), data.user, data.assistant]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'erro desconhecido');
      // remove a otimista pra evitar duplicação
      setMessages((m) => m.filter((x) => x.id !== tempUser.id));
      setInput(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleApplyPatch(msg: RefineChatMessage) {
    if (!msg.patch) return;
    startTransition(async () => {
      const res = await applyRefinementPatch({ client_id: clientId, patch: msg.patch! });
      if (res.ok) {
        if (res.aplicado > 0) {
          toast.success(
            `${res.aplicado} alteraç${res.aplicado === 1 ? 'ão' : 'ões'} aplicada${res.aplicado === 1 ? '' : 's'}`,
          );
          await markMessagePatchApplied(msg.id, clientId);
          setMessages((m) =>
            m.map((x) => (x.id === msg.id ? { ...x, patch_applied: true } : x)),
          );
        } else {
          toast.error(
            'Nenhuma mudança aplicada — a IA não especificou um campo concreto. Tente ser mais específico (ex: "muda o valor pra X" ou "cresce 8% a.a.").',
          );
        }
      } else {
        toast.error(`Falha: ${res.error}`);
      }
    });
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

  function handleClearChat() {
    if (!confirm('Apagar todo o histórico da conversa?')) return;
    startTransition(async () => {
      const res = await clearChatHistory(clientId);
      if (res.ok) {
        setMessages([]);
        toast.success('Conversa apagada');
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="grid lg:grid-cols-[1fr_auto] gap-6">
      {/* ─── CENTRO: chat ─── */}
      <div className="flex flex-col rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 min-h-[75vh] max-h-[80vh]">
        <header className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Bot size={15} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Assistente de refinamento
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {messages.length} mensage{messages.length === 1 ? 'm' : 'ns'} · histórico salvo
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTranscript((v) => !v)}
              className={`text-[11px] px-2.5 py-1.5 rounded-md border transition-colors flex items-center gap-1 ${
                showTranscript
                  ? 'border-brand-300 dark:border-brand-700 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <FileText size={11} />
              Transcrição
              <ChevronRight
                size={11}
                className={`transition-transform ${showTranscript ? 'rotate-90' : ''}`}
              />
            </button>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearChat}
                className="text-[11px] px-2.5 py-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1"
              >
                <Trash2 size={11} />
                Limpar
              </button>
            )}
          </div>
        </header>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-5 py-5 space-y-4"
        >
          {messages.length === 0 && <EmptyState />}
          {messages.map((m) => (
            <Message
              key={m.id}
              message={m}
              onApply={() => handleApplyPatch(m)}
            />
          ))}
          {sending && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Loader2 size={12} className="animate-spin" />
              <span>Pensando…</span>
            </div>
          )}
        </div>

        <footer className="border-t border-slate-100 dark:border-slate-800 p-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder='Ex: "aumenta o salário fase 2 pra 1.5M" · "adiciona MBA aos 35 por 200k" · "tira a viagem dos 60"'
              rows={2}
              disabled={sending}
              className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 px-3 py-2 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60"
            />
            <Button onClick={handleSend} disabled={sending || !input.trim()} size="md">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </Button>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 px-1">
            Enter envia · Shift+Enter quebra linha
          </p>
        </footer>
      </div>

      {/* ─── DIREITA: transcrição (colapsável) ─── */}
      {showTranscript && (
        <aside className="w-[400px] space-y-3">
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
                rows={26}
                placeholder="Cole a transcrição completa aqui..."
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 px-4 py-3 text-xs font-mono leading-relaxed placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
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
                <Button
                  size="sm"
                  onClick={handleSaveTranscript}
                  disabled={transcricao === savedTranscricao}
                >
                  <Save size={13} />
                  Salvar
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 max-h-[75vh] overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              {transcricao || (
                <span className="text-slate-400 italic">Nenhuma transcrição salva.</span>
              )}
            </div>
          )}
        </aside>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-12">
      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center mb-3">
        <Bot size={26} className="text-white" />
      </div>
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        Como posso ajustar o plano?
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
        Descreva mudanças em linguagem natural. Posso adicionar/remover/alterar
        receitas, despesas, eventos e passivos.
      </p>
      <div className="mt-5 grid gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
        <p className="italic">"aumenta o salário fase 2 pra 1.5M"</p>
        <p className="italic">"adiciona um carro novo aos 40 por 120k"</p>
        <p className="italic">"a casa de praia muda pra 50 anos"</p>
      </div>
    </div>
  );
}

function Message({
  message,
  onApply,
}: {
  message: RefineChatMessage;
  onApply: () => void;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-slate-200 dark:bg-slate-700'
            : 'bg-gradient-to-br from-brand-500 to-brand-700'
        }`}
      >
        {isUser ? (
          <User size={13} className="text-slate-600 dark:text-slate-300" />
        ) : (
          <Bot size={13} className="text-white" />
        )}
      </div>

      <div
        className={`flex-1 max-w-[80%] ${isUser ? 'flex flex-col items-end' : ''}`}
      >
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? 'bg-brand-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        {!isUser && message.patch && (
          <PatchBlock
            patch={message.patch}
            applied={message.patch_applied}
            onApply={onApply}
          />
        )}
      </div>
    </div>
  );
}

function PatchBlock({
  patch,
  applied,
  onApply,
}: {
  patch: RefinementPatch;
  applied: boolean;
  onApply: () => void;
}) {
  const ops: { type: 'add' | 'update' | 'remove'; label: string }[] = [];

  for (const a of patch.assets_add ?? [])
    ops.push({ type: 'add', label: `Ativo: ${a.nome} · R$ ${fmt(a.valor)}` });
  for (const u of patch.assets_update ?? [])
    ops.push({ type: 'update', label: `Ativo "${u.match_descricao}"` });
  for (const r of patch.assets_remove ?? [])
    ops.push({ type: 'remove', label: `Ativo "${r.match_descricao}"` });

  for (const a of patch.expenses_add ?? [])
    ops.push({ type: 'add', label: `Despesa: ${a.descricao} · R$ ${fmt(a.valor_mensal)}/mês` });
  for (const u of patch.expenses_update ?? [])
    ops.push({ type: 'update', label: `Despesa "${u.match_descricao}"` });
  for (const r of patch.expenses_remove ?? [])
    ops.push({ type: 'remove', label: `Despesa "${r.match_descricao}"` });

  for (const a of patch.events_add ?? [])
    ops.push({
      type: 'add',
      label: `Evento: ${a.descricao} · ${a.valor >= 0 ? '+' : ''}R$ ${fmt(a.valor)}`,
    });
  for (const u of patch.events_update ?? [])
    ops.push({ type: 'update', label: `Evento "${u.match_descricao}"` });
  for (const r of patch.events_remove ?? [])
    ops.push({ type: 'remove', label: `Evento "${r.match_descricao}"` });

  for (const a of patch.liabilities_add ?? [])
    ops.push({ type: 'add', label: `Passivo: ${a.nome} · saldo R$ ${fmt(a.saldo_atual)}` });
  for (const u of patch.liabilities_update ?? [])
    ops.push({ type: 'update', label: `Passivo "${u.match_descricao}"` });
  for (const r of patch.liabilities_remove ?? [])
    ops.push({ type: 'remove', label: `Passivo "${r.match_descricao}"` });

  if (patch.cliente_updates) ops.push({ type: 'update', label: 'Dados do cliente' });
  if (patch.perfil_updates) ops.push({ type: 'update', label: 'Perfil subjetivo' });

  if (ops.length === 0) return null;

  return (
    <div
      className={`mt-2 rounded-xl border p-3 space-y-2 ${
        applied
          ? 'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 opacity-70'
          : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/30'
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
        <CheckCircle2 size={10} />
        {applied
          ? 'Aplicado'
          : `${ops.length} mudança${ops.length === 1 ? '' : 's'} pronta${ops.length === 1 ? '' : 's'}`}
      </p>
      <ul className="space-y-1">
        {ops.map((op, i) => (
          <li key={i} className="flex items-start gap-2 text-xs">
            {op.type === 'add' && (
              <Plus
                size={11}
                className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
              />
            )}
            {op.type === 'update' && (
              <Edit3
                size={11}
                className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
              />
            )}
            {op.type === 'remove' && (
              <Minus size={11} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            )}
            <span className="text-slate-700 dark:text-slate-300">{op.label}</span>
          </li>
        ))}
      </ul>
      {!applied && (
        <div className="flex justify-end pt-1">
          <Button size="sm" onClick={onApply}>
            <CheckCircle2 size={12} />
            Aplicar mudanças
          </Button>
        </div>
      )}
    </div>
  );
}

function fmt(n: number) {
  return Math.abs(n).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}
