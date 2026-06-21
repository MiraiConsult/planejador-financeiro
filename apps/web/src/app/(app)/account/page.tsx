import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/PageHeader';
import { AlterarSenhaForm } from './AlterarSenhaForm';

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <PageHeader
        eyebrow="Minha conta"
        title="Conta e segurança"
        description="Gerencie a senha de acesso. Recomendamos trocar a senha padrão no primeiro acesso."
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">E-mail</p>
          <p className="text-sm text-slate-900 mt-1">{user.email}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Alterar senha</h2>
          <p className="text-xs text-slate-500 mt-1">Mínimo 6 caracteres. Você continua logado após a troca.</p>
        </div>
        <AlterarSenhaForm />
      </section>
    </div>
  );
}
