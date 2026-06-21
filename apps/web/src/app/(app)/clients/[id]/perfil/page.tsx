import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/PageHeader';
import { PerfilForm } from './PerfilForm';
import type { PerfilInput } from './actions';

type Params = Promise<{ id: string }>;

export default async function PerfilPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: c } = await supabase
    .from('clients')
    .select('id, nome_completo, data_nascimento, expectativa_vida_anos, idade_aposentadoria, idade_reducao_trabalho, perfil_carteira, custom_retorno_aa, custom_volatilidade_aa, pais_residencia, estado_civil')
    .eq('id', id)
    .maybeSingle();
  if (!c) notFound();

  const inicial: PerfilInput = {
    nome_completo: c.nome_completo,
    data_nascimento: c.data_nascimento,
    expectativa_vida_anos: c.expectativa_vida_anos ?? 90,
    idade_aposentadoria: c.idade_aposentadoria ?? null,
    idade_reducao_trabalho: c.idade_reducao_trabalho ?? null,
    perfil_carteira: (c.perfil_carteira ?? 'moderado') as PerfilInput['perfil_carteira'],
    custom_retorno_aa: c.custom_retorno_aa != null ? Number(c.custom_retorno_aa) : null,
    custom_volatilidade_aa: c.custom_volatilidade_aa != null ? Number(c.custom_volatilidade_aa) : null,
    pais_residencia: c.pais_residencia ?? 'BR',
    estado_civil: c.estado_civil ?? null,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Cliente"
        title={`Perfil — ${c.nome_completo}`}
        description="Dados pessoais, horizonte de planejamento e perfil de carteira. Alterar estes dados refaz a simulação."
      />
      <PerfilForm clientId={id} inicial={inicial} />
    </div>
  );
}
