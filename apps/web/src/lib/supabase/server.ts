import { cookies } from 'next/headers';
import { cache } from 'react';
import { createServerClient } from '@supabase/ssr';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component context — cookies are read-only there. Middleware refreshes.
          }
        },
      },
    },
  );
}

/**
 * Versão cacheada por request do auth lookup. Faz validação JWT local
 * (getClaims) — sem round-trip pro auth.users — e dedupe entre layout/
 * page/actions na mesma navegação. ~150-300ms a menos por nav.
 *
 * Use SEMPRE este helper em vez de chamar supabase.auth.getUser()
 * direto, exceto quando precisar do user completo (email, metadata).
 */
export const getAuthUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  // getClaims valida o JWT localmente (sem round-trip) quando o token
  // está bem assinado. Cai pra getUser() se a versão do supabase não
  // suportar ou o token não tiver claims.
  type ClaimsLike = { data?: { claims?: { sub?: string } | null } | null };
  const fn = (supabase.auth as { getClaims?: () => Promise<ClaimsLike> }).getClaims;
  if (typeof fn === 'function') {
    try {
      const r = await fn.call(supabase.auth);
      const sub = r?.data?.claims?.sub;
      if (sub) return sub;
    } catch {
      // fallback abaixo
    }
  }
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
});

/**
 * Email do usuário corrente, cacheado. Usa getUser (com round-trip)
 * porque getClaims não traz email em todas as configurações. Só chame
 * quando o email for de fato necessário.
 */
export const getAuthUserEmail = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? null;
});
