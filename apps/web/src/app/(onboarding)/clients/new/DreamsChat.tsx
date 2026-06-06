'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import {
  Bot,
  Send,
  Sparkles,
  CheckCircle2,
  Loader2,
  AlertCircle,
  X,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import type { DraftEvent, PerfilSubjetivo } from './types';
import type { DreamExtractionResult, ExtractedDream } from '@/lib/ai/schema';
import { idadeFromBirth } from './helpers';

interface Props {
  perfil: PerfilSubjetivo;
  nomeCliente: string;
  dataNascimento: string;
  expectativaVida: number;
  events: DraftEvent[];
  onChange: (next: DraftEvent[]) => void;
  onSwitchToManual: () => void;
}

export function DreamsChat({
  perfil,
  nomeCliente,
  dataNascimento,
  expectativaVida,
  events,
  onChange,
  onSwitchToManual,
}: Props) {
  const [status, setStatus] = useState<{
    configured: boolean;
    provider: string | null;
  } | null>(null);

  useEffect(() => {
    fetch('/api/onboarding/status')
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ configured: false, provider: null }));
  }, []);

  const idade = idadeFromBirth(dataNascimento) ?? undefined;
  const context = {
    nome_cliente: nomeCliente,
    idade,
    expectativa_vida: expectativaVida,
    visao_30_anos: perfil.visao_30_anos,
    medo_principal: perfil.medo_principal,
    significado_dinheiro: perfil.significado_dinheiro,
    referencia_dinheiro: perfil.referencia_dinheiro,
    legado: perfil.legado,
  };

  const { messages, sendMessage, status: chatStatus, error, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/onboarding/chat',
      body: { context },
    }),
  });

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [extractedDreams, setExtractedDreams] = useState<DreamExtractionResult | null>(null);
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mensagem inicial automática quando o chat carrega pela primeira vez
  useEffect(() => {
    if (status?.configured && messages.length === 0) {
      sendMessage({ text: '(iniciar conversa)' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.configured]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || chatStatus === 'streaming') return;
    sendMessage({ text: input.trim() });
    setInput('');
  }

  async function handleExtract() {
    if (messages.length < 4) {
      toast.info('Converse um pouco mais antes de concluir');
      return;
    }
    setExtracting(true);
    try {
      const res = await fetch('/api/onboarding/extract-dreams', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages }),
      });
      if (!res.ok) throw new Error('falha na extração');
      const data = (await res.json()) as DreamExtractionResult;
      setExtractedDreams(data);
    } catch (err) {
      console.error(err);
      toast.error('Não consegui extrair os sonhos. Tente novamente.');
    } finally {
      setExtracting(false);
    }
  }

  function confirmDreams() {
    if (!extractedDreams) return;
    const novos: DraftEvent[] = extractedDreams.sonhos.map(buildEventFromExtracted);
    onChange([...events, ...novos]);
    toast.success(`${novos.length} sonho${novos.length > 1 ? 's' : ''} adicionado${novos.length > 1 ? 's' : ''}`);
    setExtractedDreams(null);
    setMessages([]);
  }

  if (status === null) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center">
        <Loader2 size={20} className="mx-auto animate-spin text-slate-400" />
      </div>
    );
  }

  if (!status.configured) {
    return (
      <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/30 p-6 space-y-3">
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              Chat com IA não configurado
            </p>
            <p className="text-xs text-amber-800/80 dark:text-amber-200/80 mt-1">
              Pra ativar a sessão guiada, configure <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">OPENAI_API_KEY</code> (ou{' '}
              <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">GEMINI_API_KEY</code> com{' '}
              <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">AI_PROVIDER=gemini</code>) nas variáveis de ambiente do Vercel.
            </p>
          </div>
        </div>
        <div className="pl-7">
          <Button variant="outline" size="sm" onClick={onSwitchToManual}>
            <ArrowRight size={13} />
            Usar modo manual (gráfico)
          </Button>
        </div>
      </div>
    );
  }

  if (extractedDreams) {
    return (
      <DreamsPreview
        result={extractedDreams}
        onConfirm={confirmDreams}
        onBack={() => setExtractedDreams(null)}
      />
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-soft dark:shadow-none overflow-hidden flex flex-col" style={{ minHeight: 500 }}>
      <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot size={14} className="text-brand-600 dark:text-brand-400" />
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Sessão guiada {status.provider && <span className="text-slate-400 dark:text-slate-500 font-normal">· {status.provider}</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={onSwitchToManual}
          className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 underline"
        >
          Prefiro preencher na mão
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[60vh]">
        {messages
          .filter((m) => m.role !== 'system')
          .filter((m) => {
            // não mostra o trigger inicial "(iniciar conversa)"
            if (m.role !== 'user') return true;
            const text = m.parts
              .filter((p) => p.type === 'text')
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((p) => (p as any).text)
              .join('');
            return text !== '(iniciar conversa)';
          })
          .map((m) => (
            <Bubble key={m.id} role={m.role}>
              {m.parts
                .filter((p) => p.type === 'text')
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((p, i) => <span key={i}>{(p as any).text}</span>)}
            </Bubble>
          ))}
        {chatStatus === 'submitted' && (
          <Bubble role="assistant">
            <span className="inline-flex items-center gap-1.5 text-slate-400">
              <Loader2 size={11} className="animate-spin" />
              pensando...
            </span>
          </Bubble>
        )}
        {error && (
          <div className="text-xs text-red-600 dark:text-red-400 p-3 rounded bg-red-50/40 dark:bg-red-950/30">
            Erro: {error.message}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 p-3 space-y-2">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Responda em texto livre..."
            disabled={chatStatus === 'streaming'}
            className="flex-1 h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 px-3 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          />
          <Button type="submit" disabled={chatStatus === 'streaming' || !input.trim()} size="md">
            <Send size={13} />
          </Button>
        </form>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            {messages.length > 2 && `${Math.floor(messages.length / 2)} trocas`}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExtract}
            disabled={extracting || messages.length < 4}
          >
            {extracting ? (
              <>
                <Loader2 size={11} className="animate-spin" />
                Extraindo...
              </>
            ) : (
              <>
                <Sparkles size={11} />
                Concluir conversa
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Bubble({
  role,
  children,
}: {
  role: 'user' | 'assistant' | 'system';
  children: React.ReactNode;
}) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
          isUser
            ? 'bg-brand-600 dark:bg-brand-500 text-white'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function DreamsPreview({
  result,
  onConfirm,
  onBack,
}: {
  result: DreamExtractionResult;
  onConfirm: () => void;
  onBack: () => void;
}) {
  return (
    <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/30 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
            Identifiquei {result.sonhos.length} sonho{result.sonhos.length > 1 ? 's' : ''} na nossa conversa
          </p>
          {result.resumo && (
            <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80 mt-1 italic">
              "{result.resumo}"
            </p>
          )}
        </div>
      </div>

      <ul className="space-y-2">
        {result.sonhos.map((s, i) => (
          <li
            key={i}
            className="rounded-lg border border-emerald-100 dark:border-emerald-900 bg-white dark:bg-slate-900 p-3 flex items-start gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {s.descricao} <span className="text-xs text-slate-500 dark:text-slate-400">· aos {s.idade_alvo} anos</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {s.justificativa}
              </p>
            </div>
            <p
              className={`text-sm font-semibold tabular-nums shrink-0 ${
                s.valor >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {s.valor >= 0 ? '+' : '−'} R$ {Math.abs(s.valor).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </p>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <X size={13} />
          Continuar conversa
        </Button>
        <Button size="sm" onClick={onConfirm}>
          <CheckCircle2 size={13} />
          Adicionar todos
        </Button>
      </div>
    </div>
  );
}

function buildEventFromExtracted(d: ExtractedDream): DraftEvent {
  const tipoMap: Record<string, DraftEvent['tipo']> = {
    casa: 'compra',
    viagem: 'viagem_pontual',
    faculdade: 'compra',
    casamento: 'compra',
    carro: 'compra',
    heranca: 'heranca',
    outros: 'sonho',
  };
  return {
    id: crypto.randomUUID(),
    tipo: tipoMap[d.categoria] ?? 'sonho',
    descricao: d.descricao,
    valor: d.valor,
    padrao_recorrencia: 'unico',
    idade_inicio: d.idade_alvo,
    idade_fim: null,
    intervalo_anos: null,
    indexado_inflacao: true,
  };
}
