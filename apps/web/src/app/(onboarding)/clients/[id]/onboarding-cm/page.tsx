import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { WizardCM } from './WizardCM';
import type { DraftCategoria } from './types';

type Params = Promise<{ id: string }>;

export default async function OnboardingCMPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: client } = await supabase
    .from('clients')
    .select('id, nome_completo, tem_controle_mensal, tem_balanco_patrimonial, onboarding_step, onboarding_step_cm')
    .eq('id', id)
    .maybeSingle();
  if (!client) notFound();

  if (!client.tem_controle_mensal) {
    // cliente não contratou esse produto — volta pro detalhe
    redirect(`/clients/${id}`);
  }

  // Já finalizou? vai direto pra tela operacional
  if (client.onboarding_step_cm == null) {
    redirect(`/clients/${id}/controle-mensal`);
  }

  const bpFinalizado = client.tem_balanco_patrimonial && client.onboarding_step == null;

  // Carrega o que já foi configurado pra pré-preencher o wizard
  const [{ count: centrosCount }, { data: catRows }] = await Promise.all([
    supabase
      .from('controle_mensal_centros')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', id),
    supabase
      .from('controle_mensal_categorias')
      .select('id, nome, tipo, cor, icone, parent_id, ordem')
      .eq('client_id', id)
      .order('ordem', { ascending: true }),
  ]);

  const idToTemp = new Map<string, string>();
  for (const r of catRows ?? []) idToTemp.set(r.id, `cat-${r.id.slice(0, 8)}`);

  const initialCategorias: DraftCategoria[] = (catRows ?? []).map((r) => ({
    tempId: idToTemp.get(r.id)!,
    nome: r.nome,
    tipo: r.tipo,
    cor: r.cor,
    icone: r.icone,
    parentTempId: r.parent_id ? idToTemp.get(r.parent_id) ?? null : null,
  }));

  return (
    <WizardCM
      clientId={id}
      clientName={client.nome_completo}
      initialStep={client.onboarding_step_cm ?? 1}
      initialCentrosCount={centrosCount ?? 0}
      initialCategorias={initialCategorias}
      bpFinalizado={bpFinalizado}
    />
  );
}
