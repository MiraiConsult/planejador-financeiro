import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadSimulationInput } from '@/lib/loadSimulation';
import { Simulador } from './Simulador';

type Params = Promise<{ id: string }>;

export default async function SimuladorPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const input = await loadSimulationInput(id);
  if (!input) notFound();

  return <Simulador clientId={id} input={input} />;
}
