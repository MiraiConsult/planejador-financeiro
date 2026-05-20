import type { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/server';
import { Sidebar, MobileTopBar } from '@/components/Sidebar';
import { signOut } from '../(auth)/actions';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.06),transparent)]">
      <Sidebar userEmail={user?.email ?? '—'} signOutAction={signOut} />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileTopBar userEmail={user?.email ?? '—'} signOutAction={signOut} />
        <main className="flex-1 p-6 lg:p-10 animate-fade-up">{children}</main>
      </div>
    </div>
  );
}
