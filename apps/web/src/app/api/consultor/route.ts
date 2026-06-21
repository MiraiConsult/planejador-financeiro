import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { CONSULTOR_TOOLS } from './tools';

export const runtime = 'nodejs';

const MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `Você é o "consultor financeiro" do app de planejamento. Você ajuda o cliente a entender o impacto de mudanças no plano financeiro dele (idade de aposentadoria, receitas, gastos, metas, alocação de excedentes).

Estilo: português brasileiro, direto, sem jargão excessivo, sem markdown pesado. Frases curtas.

Regra crítica: ANTES de chamar QUALQUER tool, peça confirmação ao cliente em uma frase clara. Não execute mudanças sem confirmação explícita.

Quando o cliente pedir algo que envolva uma das tools disponíveis, primeiro responda em texto resumindo o que vai fazer e pergunte "Você confirma?". Se o cliente responder "sim/confirmo/pode/vai", aí sim chame a tool.

Você não tem acesso direto ao saldo, idade atual ou histórico do cliente — apenas as ações listadas como tools. Se o cliente perguntar algo que dependa desses dados, peça pra ele te dizer ou recomende que ele consulte o balanço.`;

interface ReqBody {
  client_id: string;
  messages: Anthropic.MessageParam[];
}

export async function POST(req: Request) {
  const body = (await req.json()) as ReqBody;
  if (!body.client_id || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
  }

  // Auth + ownership check via Supabase (RLS)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { data: client } = await supabase
    .from('clients')
    .select('id, nome_completo')
    .eq('id', body.client_id)
    .maybeSingle();
  if (!client) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY não configurada no servidor' },
      { status: 500 },
    );
  }

  const anthropic = new Anthropic({ apiKey });

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: `${SYSTEM_PROMPT}\n\nCliente atual: ${client.nome_completo} (id: ${client.id}).`,
      tools: CONSULTOR_TOOLS,
      messages: body.messages,
    });
    return NextResponse.json({
      id: response.id,
      content: response.content,
      stop_reason: response.stop_reason,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
