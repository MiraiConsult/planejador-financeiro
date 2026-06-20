import { redirect } from 'next/navigation';

type Params = Promise<{ id: string }>;

// Rota antiga — agora unificada em /dados-cadastrais (Plano de Contas + Centros).
export default async function CentrosPageRedirect({ params }: { params: Params }) {
  const { id } = await params;
  redirect(`/clients/${id}/controle-mensal/dados-cadastrais?tab=centros`);
}
