import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/PageHeader';
import { ConciliacaoManager, type LancConc } from './ConciliacaoManager';

type Params = Promise<{ id: string }>;

export default async function ConciliacaoPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: client } = await supabase
    .from('clients')
    .select('id, nome_completo')
    .eq('id', id)
    .maybeSingle();
  if (!client) notFound();

  const [{ data: lancs }, { data: bancos }] = await Promise.all([
    supabase
      .from('controle_mensal_lancamentos')
      .select('id, data, descricao, valor, origem, competencia, eh_receita, conciliado')
      .eq('client_id', id)
      .order('data', { ascending: false }),
    supabase
      .from('bank_connections')
      .select('institution_name')
      .eq('client_id', id)
      .eq('status', 'active'),
  ]);

  const rows = (lancs ?? []) as LancConc[];

  // Bancos = união de origens usadas nos lançamentos + bancos cadastrados.
  const origensLanc = rows.map((r) => (r.origem ?? '').trim()).filter(Boolean);
  const nomesBancos = (bancos ?? []).map((b) => (b.institution_name ?? '').trim()).filter(Boolean);
  const listaBancos = [...new Set([...nomesBancos, ...origensLanc])].sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Controle Financeiro"
        title={`Conciliação bancária — ${client.nome_completo}`}
        description="Escolha um banco e um mês, marque os lançamentos que batem com o extrato e compare o saldo movimentado com o saldo informado pelo banco."
      />
      <ConciliacaoManager clientId={id} rows={rows} bancos={listaBancos} />
    </div>
  );
}
