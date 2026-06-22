import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadSimulationInput } from '@/lib/loadSimulation';
import { ativarControleMensal } from '../../actions';
import { BalancoView } from './BalancoView';

type Params = Promise<{ id: string }>;

export default async function ClientDetailPage({ params }: { params: Params }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: meta } = await supabase
    .from('clients')
    .select('id, tem_balanco_patrimonial, tem_controle_mensal, onboarding_step, onboarding_step_cm')
    .eq('id', id)
    .maybeSingle();
  if (!meta) notFound();

  // Onboardings pendentes vão pros wizards
  if (meta.tem_balanco_patrimonial && meta.onboarding_step != null) {
    redirect(`/clients/new?id=${id}`);
  }
  if (
    !meta.tem_balanco_patrimonial &&
    meta.tem_controle_mensal &&
    meta.onboarding_step_cm != null
  ) {
    redirect(`/clients/${id}/onboarding-cm`);
  }
  if (!meta.tem_balanco_patrimonial && meta.tem_controle_mensal) {
    redirect(`/clients/${id}/controle-mensal`);
  }

  // Carrega tudo em paralelo. simulate() não roda aqui — vai pro client.
  const [loaded, cmRes, excedenteRes] = await Promise.all([
    loadSimulationInput(id),
    meta.tem_controle_mensal
      ? supabase
          .from('controle_mensal_lancamentos')
          .select('valor, eh_receita')
          .eq('client_id', id)
          .eq('competencia', (() => {
            const h = new Date();
            return h.getFullYear() * 100 + (h.getMonth() + 1);
          })())
      : Promise.resolve({ data: null }),
    supabase
      .from('excedente_acoes')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', id),
  ]);
  if (!loaded) notFound();

  let cmSummary = null;
  if (meta.tem_controle_mensal) {
    const hoje = new Date();
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ];
    const rows = (cmRes.data ?? []) as Array<{ valor: number; eh_receita: boolean | null }>;
    const receitaMes = rows
      .filter((r) => r.eh_receita === true || (r.eh_receita == null && Number(r.valor) > 0))
      .reduce((s, r) => s + Math.abs(Number(r.valor)), 0);
    const gastoMes = rows
      .filter((r) => r.eh_receita === false || (r.eh_receita == null && Number(r.valor) < 0))
      .reduce((s, r) => s + Math.abs(Number(r.valor)), 0);
    cmSummary = {
      pendente: meta.onboarding_step_cm != null,
      step: meta.onboarding_step_cm,
      receitaMes,
      gastoMes,
      lancMes: rows.length,
      mesAtualLabel: `${meses[hoje.getMonth()]} ${hoje.getFullYear()}`,
    };
  }

  return (
    <BalancoView
      clientId={id}
      client={loaded.client}
      input={loaded.input}
      temControleMensal={meta.tem_controle_mensal}
      cmSummary={cmSummary}
      qtdAcoesExcedente={excedenteRes.count ?? 0}
      ativarCmAction={ativarControleMensal}
    />
  );
}
