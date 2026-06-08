import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/PageHeader';
import type { Lancamento } from '@/lib/controle-mensal/analytics';
import { ImportCard } from './ImportCard';
import { ControleMensalViews } from './ControleMensalViews';
import { NovoLancamentoButton } from './NovoLancamentoButton';

type Params = Promise<{ id: string }>;

const COLS =
  'id,data,descricao,valor,categoria,subcategoria,mes,mes_num,ano,competencia,tipo,origem,cliente_obs,viagem,sistema,is_nexlex';

function uniqOrdenado(vals: Array<string | null | undefined>): string[] {
  return [...new Set(vals.map((v) => (v ?? '').trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  );
}

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

  const sugestoes = {
    categorias: uniqOrdenado(rows.map((r) => r.categoria)),
    subcategorias: uniqOrdenado(rows.map((r) => r.subcategoria)),
    origens: uniqOrdenado(rows.map((r) => r.origem)),
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <Link href={`/clients/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft size={14} />
            Voltar para o cliente
          </Button>
        </Link>
        <NovoLancamentoButton clientId={id} sugestoes={sugestoes} />
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
          <ImportCard clientId={id} />
          <ControleMensalViews rows={rows} clientId={id} sugestoes={sugestoes} />
        </>
      )}
    </div>
  );
}
