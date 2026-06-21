import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { Sidebar, MobileTopBar, type CurrentClient } from '@/components/Sidebar';
import { signOut } from '../(auth)/actions';

async function carregarClienteAtual(supabase: Awaited<ReturnType<typeof createClient>>): Promise<CurrentClient | null> {
  const path = (await headers()).get('x-pathname') ?? '';
  const m = path.match(/^\/clients\/([0-9a-f-]{36})(?:\/|$)/i);
  if (!m) return null;
  const id = m[1]!;
  const { data } = await supabase
    .from('clients')
    .select('id, nome_completo, tem_balanco_patrimonial, tem_controle_mensal, onboarding_step, onboarding_step_cm')
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    nome: data.nome_completo,
    tem_bp: data.tem_balanco_patrimonial,
    tem_cm: data.tem_controle_mensal,
    bp_pendente: data.onboarding_step != null,
    cm_pendente: data.onboarding_step_cm != null,
  };
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const [{ data: { user } }, currentClient] = await Promise.all([
    supabase.auth.getUser(),
    carregarClienteAtual(supabase),
  ]);

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
