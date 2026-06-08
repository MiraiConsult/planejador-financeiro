import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/PageHeader';
import { listarCentros, garantirCentros } from './actions';
import { CentrosManager } from './CentrosManager';

type Params = Promise<{ id: string }>;

export default async function CentrosPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: client } = await supabase
    .from('clients')
    .select('id, nome_completo')
    .eq('id', id)
    .single();
  if (!client) notFound();

  // Garante centros default se vazio (auto-backfill a partir dos tipos antigos).
  await garantirCentros(id);
  const centros = await listarCentros(id);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link href={`/clients/${id}/controle-mensal`}>
        <Button variant="ghost" size="sm">
          <ArrowLeft size={14} />
          Voltar ao Controle Mensal
        </Button>
      </Link>

      <PageHeader
        eyebrow="Controle Mensal · Configuração"
        title={`Centros — ${client.nome_completo}`}
        description="Crie divisões para organizar lançamentos do cliente. Pode ser pessoa, empresa, projeto. Centros aninhados agrupam vários (ex: 'Família' contendo 'Diego' e 'Esposa'). Centros tipo 'empresa' marcados como demonstrativo mostram receita − despesas = líquido."
      />

      <CentrosManager clientId={id} centros={centros} />
    </div>
  );
}
