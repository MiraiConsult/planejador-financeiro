import { isAIConfigured, getProviderName } from '@/lib/ai/provider';

export const runtime = 'edge';

export async function GET() {
  return new Response(
    JSON.stringify({
      configured: isAIConfigured(),
      provider: isAIConfigured() ? getProviderName() : null,
    }),
    { headers: { 'content-type': 'application/json' } },
  );
}
