'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function alterarSenha(args: { novaSenha: string }): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Não autenticado' };

  const s = args.novaSenha.trim();
  if (s.length < 6) return { ok: false, error: 'Mínimo 6 caracteres' };

  const { error } = await supabase.auth.updateUser({ password: s });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/account');
  return { ok: true };
}
