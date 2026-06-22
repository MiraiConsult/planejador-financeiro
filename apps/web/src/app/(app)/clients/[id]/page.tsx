import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Params = Promise<{ id: string }>;

/**
 * /clients/[id] — rota de entrada do cliente. Decide pra onde mandar
 * baseado nos produtos contratados e estado do onboarding:
 *
 * - BP pendente            → /clients/new?id=...           (wizard BP)
 * - só CM pendente         → /clients/[id]/onboarding-cm   (wizard CM)
 * - só CM finalizado       → /clients/[id]/controle-mensal
 * - tem BP (finalizado)    → /clients/[id]/balanco         (padrão)
 */
export default async function ClientRoutePage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: c } = await supabase
    .from('clients')
    .select('id, tem_balanco_patrimonial, tem_controle_mensal, onboarding_step, onboarding_step_cm')
    .eq('id', id)
    .maybeSingle();
  if (!c) notFound();

  if (c.tem_balanco_patrimonial && c.onboarding_step != null) {
    redirect(`/clients/new?id=${id}`);
  }
  if (!c.tem_balanco_patrimonial && c.tem_controle_mensal && c.onboarding_step_cm != null) {
    redirect(`/clients/${id}/onboarding-cm`);
  }
  redirect(`/clients/${id}/inicio`);
}
