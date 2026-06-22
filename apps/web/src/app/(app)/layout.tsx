import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient, getAuthUserEmail, getAuthUserId } from '@/lib/supabase/server';
import { Sidebar, MobileTopBar, type CurrentClient } from '@/components/Sidebar';
import { signOut } from '../(auth)/actions';

type ClientRow = {
  id: string;
  nome_completo: string;
  tem_balanco_patrimonial: boolean;
  tem_controle_mensal: boolean;
  onboarding_step: number | null;
  onboarding_step_cm: number | null;
};

function toCurrentClient(data: ClientRow): CurrentClient {
  return {
    id: data.id,
    nome: data.nome_completo,
    tem_bp: data.tem_balanco_patrimonial,
    tem_cm: data.tem_controle_mensal,
    bp_pendente: data.onboarding_step != null,
    cm_pendente: data.onboarding_step_cm != null,
  };
}

const SELECT_CLIENT =
  'id, nome_completo, tem_balanco_patrimonial, tem_controle_mensal, onboarding_step, onboarding_step_cm';

/** Painel inicial do cliente: balanço se tiver, senão Controle Financeiro. */
function painelDoCliente(c: ClientRow): string {
  return `/clients/${c.id}/inicio`;
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const path = (await headers()).get('x-pathname') ?? '';

  // Tudo em paralelo: user id (local), selfClient lookup, e (se aplicável)
  // o currentClient. Antes era sequencial → ~3 round-trips.
  const m = path.match(/^\/clients\/([0-9a-f-]{36})(?:\/|$)/i);
  const userId = await getAuthUserId();

  const [{ data: selfClient }, currentRes] = await Promise.all([
    supabase
      .from('clients')
      .select(SELECT_CLIENT)
      .eq('client_user_id', userId ?? '')
      .maybeSingle(),
    m
      ? supabase.from('clients').select(SELECT_CLIENT).eq('id', m[1]!).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // ── Modo CLIENTE FINAL: navegação restrita ao próprio painel ──────────
  if (selfClient) {
    const base = `/clients/${selfClient.id}`;
    const permitido = path === '/account' || path.startsWith('/account/') || path.startsWith(base);
    if (!permitido) {
      redirect(painelDoCliente(selfClient));
    }
    const email = (await getAuthUserEmail()) ?? '—';
    return (
      <div className="flex min-h-screen bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.06),transparent)]">
        <Sidebar
          userEmail={email}
          signOutAction={signOut}
          currentClient={toCurrentClient(selfClient)}
          clientMode
        />
        <div className="flex-1 flex flex-col min-w-0">
          <MobileTopBar userEmail={email} signOutAction={signOut} />
          <main className="flex-1 p-6 lg:p-10 animate-fade-up">{children}</main>
        </div>
      </div>
    );
  }

  // ── Modo CONSULTOR / ADMIN ────────────────────────────────────────────
  const currentClient: CurrentClient | null = currentRes.data
    ? toCurrentClient(currentRes.data as ClientRow)
    : null;
  const email = (await getAuthUserEmail()) ?? '—';

  return (
    <div className="flex min-h-screen bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.06),transparent)]">
      <Sidebar userEmail={email} signOutAction={signOut} currentClient={currentClient} />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileTopBar userEmail={email} signOutAction={signOut} />
        <main className="flex-1 p-6 lg:p-10 animate-fade-up">{children}</main>
      </div>
    </div>
  );
}
