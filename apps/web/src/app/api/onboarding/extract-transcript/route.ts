import { generateObject } from 'ai';
import { getAIModel, isAIConfigured } from '@/lib/ai/provider';
import { transcriptExtractorSystemPrompt } from '@/lib/ai/transcript-prompts';
import { transcriptExtractionSchema } from '@/lib/ai/extractSchema';

export const runtime = 'edge';
export const maxDuration = 120;

interface RequestBody {
  transcript: string;
}

export async function POST(req: Request) {
  if (!isAIConfigured()) {
    return new Response(
      JSON.stringify({ error: 'IA não configurada (defina OPENAI_API_KEY ou GEMINI_API_KEY)' }),
      { status: 503, headers: { 'content-type': 'application/json' } },
    );
  }

  const body = (await req.json()) as RequestBody;
  if (!body.transcript || body.transcript.trim().length < 50) {
    return new Response(
      JSON.stringify({ error: 'Transcrição muito curta. Cole o texto completo da reunião.' }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    );
  }

  try {
    const result = await generateObject({
      model: getAIModel(),
      schema: transcriptExtractionSchema,
      system: transcriptExtractorSystemPrompt,
      prompt: `Transcrição da reunião:\n\n${body.transcript.trim()}\n\nExtraia todos os dados estruturados desta reunião.`,
    });
    return new Response(JSON.stringify(result.object), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    console.error('[extract-transcript] generateObject failed', err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'erro desconhecido',
      }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    );
  }
}
