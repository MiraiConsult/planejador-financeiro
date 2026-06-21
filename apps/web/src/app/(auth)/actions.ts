'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function signIn(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? 'Falha no login')}`);
  }
  revalidatePath('/', 'layout');

  // Manda direto pro destino certo (evita signIn -> /clients -> redirect
  // do layout, que às vezes deixa a tela em branco no primeiro carregamento).
  const { data: self } = await supabase
    .from('clients')
    .select('id, tem_balanco_patrimonial')
    .eq('client_user_id', data.user.id)
    .maybeSingle();
  if (self) {
    redirect(`/clients/${self.id}/${self.tem_balanco_patrimonial ? 'balanco' : 'controle-mensal'}`);
  }
  redirect('/clients');
}

export async function signUp(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const fullName = String(formData.get('full_name') ?? '').trim() || email.split('@')[0]!;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  // Cria o profile vinculado (role default = consultant)
  if (data.user) {
    await supabase.from('profiles').upsert({
      id: data.user.id,
      role: 'consultant',
      full_name: fullName,
    });
  }

  revalidatePath('/', 'layout');
  redirect('/clients');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
