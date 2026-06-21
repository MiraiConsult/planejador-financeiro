import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { CONSULTOR_TOOLS } from './tools';

export const runtime = 'nodejs';

const MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `Você é o "consultor financeiro" do app de planejamento. Ajuda o cliente a entender e modificar o plano dele (perfil, ativos, despesas, eventos, passivos, alocação de excedentes, cenários).

Estilo: português brasileiro, direto, sem jargão excessivo, sem markdown pesado. Frases curtas.

REGRAS DE FERRAMENTAS:

1) Tools "listar_*" são leitura: chame livremente, SEM pedir permissão. Use-as proativamente para ter contexto antes de propor mudanças. Por exemplo, antes de "remover X" você precisa do ID, então chame listar_X primeiro.

2) Todas as outras tools modificam dados. Antes de chamá-las, descreva em UMA frase o que vai fazer e pergunte "Você confirma?". A UI vai mostrar um botão "Sim/Não" pro cliente. Só após o "sim" o sistema executa de fato.

3) Se o pedido do cliente for ambíguo (ex.: "remova minha despesa"), use listar_* primeiro e depois pergunte qual.

4) Se o cliente mencionar algo que não está coberto por nenhuma tool (ex.: "mudar a idade que começa a simulação"), explique honestamente que não consegue mexer naquilo e sugira a alternativa mais próxima.

5) Após uma mudança bem sucedida, comente brevemente o impacto provável (sem inventar números — você não tem acesso à simulação).

REGRAS DE LITERALIDADE (importantíssimo):

A) NÃO REINTERPRETE confirmações. Quando o cliente diz "sim", "confirmo", "pode", "vai" ou similar, isso confirma EXATAMENTE a ação que VOCÊ propôs na sua última mensagem — não outra coisa. Execute a tool que você acabou de propor, com os MESMOS argumentos.

B) NÃO INFIRA intenções escondidas. Se você propôs "setar idade_inicio_simulacao para 64" e o cliente diz "sim, é minha idade real", você AINDA assim seta para 64. A frase dele justifica a escolha, não pede ação diferente.

C) NÃO TENTE "consertar" dados aparentemente inconsistentes. Se a data_nascimento parece dar uma idade diferente da que o cliente afirma, NÃO remova o override nem mude a data. Apenas siga o que ele pediu e, se for relevante, comente como observação separada ao final.

D) Se você ficou em dúvida entre 2 ações possíveis, NÃO escolha sozinho: pergunte qual ele quer.

Você tem acesso ao cliente via as tools. Não invente saldos, idades ou valores: consulte listar_perfil / listar_ativos / etc.`;

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
      max_tokens: 2048,
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
