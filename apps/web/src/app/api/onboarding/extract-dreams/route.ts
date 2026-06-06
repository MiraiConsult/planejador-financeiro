import { generateObject, type UIMessage } from 'ai';
import { getAIModel, isAIConfigured } from '@/lib/ai/provider';
import { dreamExtractorSystemPrompt } from '@/lib/ai/prompts';
import { dreamExtractionResultSchema } from '@/lib/ai/schema';

export const runtime = 'edge';
export const maxDuration = 60;

interface RequestBody {
  messages: UIMessage[];
}

export async function POST(req: Request) {
  if (!isAIConfigured()) {
    return new Response(
      JSON.stringify({ error: 'IA não configurada' }),
      { status: 503, headers: { 'content-type': 'application/json' } },
    );
  }

  const body = (await req.json()) as RequestBody;

  // Transforma a conversa em texto pra alimentar o extractor
  const transcript = body.messages
    .map((m) => {
      const role = m.role === 'user' ? 'Cliente' : 'Facilitadora';
      const text = m.parts
        .filter((p) => p.type === 'text')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((p) => (p as any).text)
        .join(' ');
      return `${role}: ${text}`;
    })
    .join('\n\n');

  try {
    const result = await generateObject({
      model: getAIModel(),
      schema: dreamExtractionResultSchema,
      system: dreamExtractorSystemPrompt,
      prompt: `Transcrição da conversa:\n\n${transcript}\n\nExtraia os sonhos quantificados desta conversa.`,
    });
    return new Response(JSON.stringify(result.object), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    console.error('[extract-dreams] generateObject failed', err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'erro desconhecido',
      }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    );
  }
}
