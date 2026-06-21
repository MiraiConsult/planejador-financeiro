'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Loader2, Send, Sparkles, X } from 'lucide-react';
import type Anthropic from '@anthropic-ai/sdk';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { executarToolConsultor } from './actions';
import { READ_ONLY_TOOLS } from '@/app/api/consultor/tools';

interface Props {
  clientId: string;
}

// Mensagens da conversa, no formato esperado pela API da Anthropic.
type Msg = Anthropic.MessageParam;
type ToolUseBlock = Extract<Anthropic.ContentBlock, { type: 'tool_use' }>;
type TextBlock = Extract<Anthropic.ContentBlock, { type: 'text' }>;

interface PendingTool {
  tool_use_id: string;
  name: string;
  input: Record<string, unknown>;
}

export function ConsultorWidget({ clientId }: Props) {
  const [aberto, setAberto] = useState(false);
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [pending, setPending] = useState<PendingTool | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, pending, enviando]);

  async function enviarAoModelo(novasMsgs: Msg[]) {
    setEnviando(true);
    let msgsAtuais = novasMsgs;
    try {
      // Loop pra permitir auto-execução de tools de leitura em cascata.
      // Limite de 5 iterações é defesa contra loops do modelo.
      for (let iter = 0; iter < 5; iter++) {
        const res = await fetch('/api/consultor', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ client_id: clientId, messages: msgsAtuais }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? 'Erro no consultor');
          return;
        }
        const content = data.content as Anthropic.ContentBlock[];
        msgsAtuais = [...msgsAtuais, { role: 'assistant', content }];
        setMsgs(msgsAtuais);
        const toolBlock = content.find((b): b is ToolUseBlock => b.type === 'tool_use');
        if (!toolBlock) return;

        // Read-only: executa direto e devolve resultado pro modelo,
        // sem incomodar o usuário com confirmação.
        if (READ_ONLY_TOOLS.has(toolBlock.name)) {
          const resultado = await executarToolConsultor({
            client_id: clientId,
            tool_name: toolBlock.name,
            input: (toolBlock.input ?? {}) as Record<string, unknown>,
          });
          const conteudoResult = resultado.ok
            ? JSON.stringify({ resumo: resultado.resumo, dados: resultado.dados })
            : `Erro: ${resultado.error ?? 'falha'}`;
          msgsAtuais = [
            ...msgsAtuais,
            {
              role: 'user',
              content: [
                {
                  type: 'tool_result',
                  tool_use_id: toolBlock.id,
                  content: conteudoResult,
                  is_error: !resultado.ok,
                },
              ],
            },
          ];
          setMsgs(msgsAtuais);
          continue; // re-chama o modelo com o resultado
        }

        // Write: pede confirmação do usuário e sai do loop
        setPending({
          tool_use_id: toolBlock.id,
          name: toolBlock.name,
          input: (toolBlock.input ?? {}) as Record<string, unknown>,
        });
        return;
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha de rede');
    } finally {
      setEnviando(false);
    }
  }

  function enviar() {
    const texto = input.trim();
    if (!texto || enviando || pending) return;
    setInput('');
    const novas: Msg[] = [...msgs, { role: 'user', content: texto }];
    setMsgs(novas);
    enviarAoModelo(novas);
  }

  async function confirmarTool() {
    if (!pending) return;
    setEnviando(true);
    const resultado = await executarToolConsultor({
      client_id: clientId,
      tool_name: pending.name,
      input: pending.input,
    }).catch((e) => ({
      ok: false as const,
      error: e instanceof Error ? e.message : 'Erro',
      resumo: undefined,
      dados: undefined,
    }));
    const toolResult: Msg = {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: pending.tool_use_id,
          content: resultado.ok
            ? resultado.resumo ?? 'OK'
            : `Erro: ${resultado.error ?? 'falha desconhecida'}`,
          is_error: !resultado.ok,
        },
      ],
    };
    setPending(null);
    const novas = [...msgs, toolResult];
    setMsgs(novas);
    if (resultado.ok) toast.success(resultado.resumo ?? 'Aplicado');
    else toast.error(resultado.error ?? 'Erro');
    await enviarAoModelo(novas);
  }

  async function cancelarTool() {
    if (!pending) return;
    const toolResult: Msg = {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: pending.tool_use_id,
          content: 'Cliente cancelou a ação. Não foi aplicada.',
          is_error: false,
        },
      ],
    };
    setPending(null);
    const novas = [...msgs, toolResult];
    setMsgs(novas);
    await enviarAoModelo(novas);
  }

  return (
    <>
      {/* Botão flutuante */}
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-3 text-white shadow-lg shadow-brand-600/30 hover:bg-brand-700 transition"
        title="consultor financeiro"
        aria-label="Abrir consultor financeiro"
      >
        <Sparkles size={16} />
        <span className="text-sm font-semibold">consultor financeiro</span>
      </button>

      {/* Painel */}
      {aberto && (
        <div className="fixed bottom-20 right-5 z-40 w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-6rem)] rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-brand-50">
            <div className="flex items-center gap-2">
              <Bot size={16} className="text-brand-700" />
              <span className="text-sm font-bold text-brand-900">consultor financeiro</span>
            </div>
            <button
              type="button"
              onClick={() => setAberto(false)}
              aria-label="Fechar"
              className="text-slate-400 hover:text-slate-700"
            >
              <X size={16} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {msgs.length === 0 && (
              <div className="text-xs text-slate-500 space-y-2">
                <p>
                  Oi! Sou o consultor financeiro. Posso ajustar dados do plano com sua
                  confirmação. Exemplos:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li>Mudar idade de aposentadoria de 65 para 64</li>
                  <li>Criar meta: comprar casa em Floripa aos 70 por R$ 800k</li>
                  <li>Registrar ação para excedentes: aportar em renda fixa</li>
                </ul>
              </div>
            )}

            {msgs.map((m, i) => (
              <MsgBlock key={i} m={m} />
            ))}

            {pending && (
              <div className="rounded-xl border-2 border-brand-500 bg-brand-50 p-3 space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-brand-700 font-bold">
                  Confirmar alteração
                </p>
                <p className="text-xs font-semibold text-slate-800">{descricaoTool(pending)}</p>
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={confirmarTool}
                    disabled={enviando}
                    type="button"
                  >
                    {enviando ? <Loader2 size={12} className="animate-spin" /> : null}
                    Sim, aplicar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={cancelarTool} disabled={enviando} type="button">
                    Não
                  </Button>
                </div>
              </div>
            )}

            {enviando && !pending && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 size={12} className="animate-spin" />
                pensando…
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 p-2 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && enviar()}
              placeholder={pending ? 'Confirme ou cancele acima…' : 'Pergunte ou peça uma mudança…'}
              disabled={enviando || !!pending}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:bg-slate-50"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={enviar}
              disabled={enviando || !!pending || !input.trim()}
              type="button"
              aria-label="Enviar"
            >
              <Send size={14} />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

function descricaoTool(p: PendingTool): string {
  const i = p.input;
  const brl = (n: unknown) => `R$ ${Number(n).toLocaleString('pt-BR')}`;
  switch (p.name) {
    case 'atualizar_idade_aposentadoria':
      return `Atualizar idade de aposentadoria para ${i.idade}.`;
    case 'atualizar_idade_reducao_trabalho':
      return `Atualizar idade de redução de trabalho para ${i.idade}.`;
    case 'atualizar_expectativa_vida':
      return `Atualizar expectativa de vida para ${i.anos} anos.`;
    case 'atualizar_perfil_carteira':
      return `Mudar perfil de carteira para ${i.perfil}.`;
    case 'criar_ativo':
      return `Criar ativo "${i.nome}" (${i.tipo}, ${i.natureza}) — ${brl(i.valor)}, idade ${i.idade_inicio}–${i.idade_fim}.`;
    case 'remover_ativo':
      return `Remover ativo (id: ${i.asset_id}).`;
    case 'criar_despesa':
      return `Criar despesa "${i.descricao}" (${i.categoria}) — ${brl(i.valor_mensal)}/mês, idade ${i.idade_inicio}–${i.idade_fim}.`;
    case 'remover_despesa':
      return `Remover despesa (id: ${i.expense_id}).`;
    case 'criar_evento':
      return `Criar evento "${i.descricao}" (${i.tipo}) — ${brl(i.valor)} aos ${i.idade_inicio} anos.`;
    case 'remover_evento':
      return `Remover evento (id: ${i.event_id}).`;
    case 'criar_passivo':
      return `Criar passivo "${i.nome}" — saldo ${brl(i.saldo_atual)}, parcela ${brl(i.parcela_mensal)}/mês.`;
    case 'remover_passivo':
      return `Remover passivo (id: ${i.liability_id}).`;
    case 'registrar_acao_excedente':
      return `Registrar ação${i.idade != null ? ` para idade ${i.idade}` : ''}: "${i.acao}".`;
    case 'remover_acao_excedente':
      return `Remover ação de excedente (id: ${i.acao_id}).`;
    case 'remover_cenario_personalizado':
      return `Remover cenário personalizado (id: ${i.scenario_id}).`;
    default:
      return `Executar ${p.name} com ${JSON.stringify(i)}.`;
  }
}

function MsgBlock({ m }: { m: Msg }) {
  const isUser = m.role === 'user';
  // Tool results não são úteis ao usuário; ignora visualmente
  if (Array.isArray(m.content)) {
    const isToolStuff = m.content.every(
      (b) => typeof b === 'object' && (b.type === 'tool_result' || b.type === 'tool_use'),
    );
    if (isToolStuff && !isUser) {
      // Só mostra o texto se houver — esconde tool_use puros
      const textos = m.content.filter((b): b is TextBlock => typeof b === 'object' && b.type === 'text');
      if (textos.length === 0) return null;
      return (
        <Bubble user={false}>
          {textos.map((t, i) => <p key={i}>{t.text}</p>)}
        </Bubble>
      );
    }
    if (isToolStuff && isUser) return null;
    return (
      <Bubble user={isUser}>
        {m.content.map((b, i) => {
          if (typeof b === 'object' && b.type === 'text') return <p key={i}>{b.text}</p>;
          return null;
        })}
      </Bubble>
    );
  }
  return <Bubble user={isUser}>{m.content as string}</Bubble>;
}

function Bubble({ user, children }: { user: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex ${user ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
          user ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-800'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
