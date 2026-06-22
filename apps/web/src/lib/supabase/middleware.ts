import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  // Propaga pathname pra server components (lido via headers())
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request: { headers: requestHeaders } });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Validação JWT local (sem round-trip pro auth.users): rotinas modernas
  // do supabase-ssr/2.x expõem getClaims(). Cai pra getUser() em fallback.
  // Middleware roda em CADA navegação — é o gargalo mais sensível.
  let signedIn = false;
  type ClaimsLike = { data?: { claims?: { sub?: string } | null } | null };
  const getClaimsFn = (supabase.auth as { getClaims?: () => Promise<ClaimsLike> }).getClaims;
  if (typeof getClaimsFn === 'function') {
    try {
      const r = await getClaimsFn.call(supabase.auth);
      signedIn = !!r?.data?.claims?.sub;
    } catch {
      // fallback abaixo
    }
  }
  if (!signedIn) {
    const { data } = await supabase.auth.getUser();
    signedIn = !!data.user;
  }

  const path = request.nextUrl.pathname;
  const isPublic = path === '/login' || path.startsWith('/auth/') || path.startsWith('/preview');

  if (!signedIn && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (signedIn && path === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/clients';
    return NextResponse.redirect(url);
  }

  return response;
}
