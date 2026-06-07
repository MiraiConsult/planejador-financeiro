import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Wallet, TrendingDown, Plane, Building2, Scale } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/KpiCard';
import * as analytics from '@/lib/controle-mensal/analytics';
import type { Lancamento } from '@/lib/controle-mensal/analytics';
import { brl } from '@/lib/controle-mensal/format';
import { ImportCard } from './ImportCard';
import { ControleMensalViews } from './ControleMensalViews';

type Params = Promise<{ id: string }>;

const COLS =
  'data,descricao,valor,categoria,subcategoria,mes,mes_num,ano,competencia,tipo,origem,cliente_obs,viagem,sistema,is_nexlex';

export default async function ControleMensalPage({ params }: { params: Params }) {
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

  const { data: rowsRaw } = await supabase
    .from('controle_mensal_lancamentos')
    .select(COLS)
    .eq('client_id', id);
  const rows = (rowsRaw ?? []) as unknown as Lancamento[];

  const overview = analytics.overview(rows);
  const t = overview.por_tipo;
  const resultado = (t.receita ?? 0) + (t.pessoal ?? 0) + (t.viagem ?? 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <Link href={`/clients/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft size={14} />
            Voltar para o cliente
          </Button>
        </Link>
      </div>

      <PageHeader
        eyebrow="Controle Mensal"
        title={`Realizado — ${client.nome_completo}`}
        description="Lançamentos reais (receitas e gastos) importados mês a mês. Fonte: planilha de Lançamentos. O tipo Mirai nunca entra nos gastos pessoais; viagens ficam à parte."
      />

      {rows.length === 0 ? (
        <ImportCard clientId={id} vazio />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard label="Receitas" value={brl(t.receita ?? 0)} tone="positive" icon={Wallet} />
            <KpiCard label="Gastos pessoais" value={brl(t.pessoal ?? 0)} tone="negative" icon={TrendingDown} />
            <KpiCard label="Viagens" value={brl(t.viagem ?? 0)} tone="negative" icon={Plane} />
            <KpiCard label="Mirai (despesas)" value={brl(t.mirai ?? 0)} tone="negative" icon={Building2} />
            <KpiCard
              label="Resultado (s/ Mirai)"
              value={brl(resultado)}
              tone={resultado < 0 ? 'negative' : 'positive'}
              icon={Scale}
            />
          </div>

          <ImportCard clientId={id} />

          <ControleMensalViews
            overview={overview}
            pessoal={analytics.pessoal(rows)}
            mirai={analytics.mirai(rows)}
            viagens={analytics.viagens(rows)}
            receitas={analytics.receitas(rows)}
          />
        </>
      )}
    </div>
  );
}
