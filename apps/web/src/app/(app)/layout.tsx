import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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

/** Painel inicial do cliente: balanço se tiver, senão controle mensal. */
function painelDoCliente(c: ClientRow): string {
  if (c.tem_balanco_patrimonial) return `/clients/${c.id}/balanco`;
  return `/clients/${c.id}/controle-mensal`;
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const path = (await headers()).get('x-pathname') ?? '';

  const { data: { user } } = await supabase.auth.getUser();

  // É um cliente final? (login vinculado via client_user_id)
  const { data: selfClient } = await supabase
    .from('clients')
    .select(SELECT_CLIENT)
    .eq('client_user_id', user?.id ?? '')
    .maybeSingle();

  // ── Modo CLIENTE FINAL: navegação restrita ao próprio painel ──────────
  if (selfClient) {
    const base = `/clients/${selfClient.id}`;
    // Whitelist: própria conta + próprio painel
    const permitido = path === '/account' || path.startsWith('/account/') || path.startsWith(base);
    if (!permitido) {
      redirect(painelDoCliente(selfClient));
    }
    return (
      <div className="flex min-h-screen bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.06),transparent)]">
        <Sidebar
          userEmail={user?.email ?? '—'}
          signOutAction={signOut}
          currentClient={toCurrentClient(selfClient)}
          clientMode
        />
        <div className="flex-1 flex flex-col min-w-0">
          <MobileTopBar userEmail={user?.email ?? '—'} signOutAction={signOut} />
          <main className="flex-1 p-6 lg:p-10 animate-fade-up">{children}</main>
        </div>
      </div>
    );
  }

  // ── Modo CONSULTOR / ADMIN: menu global + seção contextual do cliente ──
  let currentClient: CurrentClient | null = null;
  const m = path.match(/^\/clients\/([0-9a-f-]{36})(?:\/|$)/i);
  if (m) {
    const { data } = await supabase.from('clients').select(SELECT_CLIENT).eq('id', m[1]!).maybeSingle();
    if (data) currentClient = toCurrentClient(data);
  }

  return (
    <div className="flex min-h-screen bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.06),transparent)]">
      <Sidebar userEmail={user?.email ?? '—'} signOutAction={signOut} currentClient={currentClient} />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileTopBar userEmail={user?.email ?? '—'} signOutAction={signOut} />
        <main className="flex-1 p-6 lg:p-10 animate-fade-up">{children}</main>
      </div>
    </div>
  );
}
