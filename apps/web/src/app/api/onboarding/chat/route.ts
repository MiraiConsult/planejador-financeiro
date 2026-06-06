import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { getAIModel, isAIConfigured } from '@/lib/ai/provider';
import { dreamFacilitatorSystemPrompt } from '@/lib/ai/prompts';

export const runtime = 'edge';
export const maxDuration = 60;

interface RequestBody {
  messages: UIMessage[];
  context?: {
    nome_cliente?: string;
    idade?: number;
    expectativa_vida?: number;
    visao_30_anos?: string;
    medo_principal?: string;
    significado_dinheiro?: string;
    referencia_dinheiro?: string;
    legado?: string;
  };
}

export async function POST(req: Request) {
  if (!isAIConfigured()) {
    return new Response(
      JSON.stringify({
        error:
          'IA não configurada. Configure OPENAI_API_KEY (ou GEMINI_API_KEY com AI_PROVIDER=gemini) nas variáveis de ambiente.',
      }),
      { status: 503, headers: { 'content-type': 'application/json' } },
    );
  }

  const body = (await req.json()) as RequestBody;
  const systemPrompt = dreamFacilitatorSystemPrompt(body.context ?? {});

  try {
    const modelMessages = await convertToModelMessages(body.messages);
    const result = streamText({
      model: getAIModel(),
      system: systemPrompt,
      messages: modelMessages,
      temperature: 0.7,
    });
    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error('[onboarding/chat] streamText failed', err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'erro desconhecido',
      }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    );
  }
}
