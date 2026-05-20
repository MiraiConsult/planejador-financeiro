'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const numFields = [
  'inflacao_anual_br',
  'retorno_conservador',
  'volatilidade_conservador',
  'retorno_moderado',
  'volatilidade_moderado',
  'retorno_arrojado',
  'volatilidade_arrojado',
  'valorizacao_imovel_uso',
  'taxa_desconto_npv',
  'imposto_renda_efetivo',
  'custo_credito_aa',
] as const;

export async function upsertConsultantAssumptions(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // valores no form em PERCENTAGEM (4 = 4%); engine usa decimal (0.04)
  const values = Object.fromEntries(
    numFields.map((k) => {
      const raw = formData.get(k);
      const pct = raw != null && raw !== '' ? Number(String(raw).replace(',', '.')) : null;
      return [k, pct == null || Number.isNaN(pct) ? null : pct / 100];
    }),
  );

  // procura premissa do consultor (client_id IS NULL)
  const { data: existing } = await supabase
    .from('assumptions')
    .select('id')
    .eq('consultant_id', user.id)
    .is('client_id', null)
    .maybeSingle();

  if (existing) {
    await supabase.from('assumptions').update(values).eq('id', existing.id);
  } else {
    await supabase.from('assumptions').insert({ consultant_id: user.id, ...values });
  }

  revalidatePath('/settings');
}
