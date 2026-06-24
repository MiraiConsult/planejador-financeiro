import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/PageHeader';
import { ImportForm } from './ImportForm';

type Params = Promise<{ id: string }>;

export default async function ImportXLSXPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: c } = await supabase
    .from('clients')
    .select('id, nome_completo')
    .eq('id', id)
    .maybeSingle();
  if (!c) notFound();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Controle Financeiro"
        title="Importar planilha XLSX"
        description={`Sobe lançamentos do cliente ${c.nome_completo}. Detecta duplicatas via hash (data + valor + descrição + rubrica) — pode subir o mesmo arquivo várias vezes sem duplicar nada.`}
      />
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="text-sm text-slate-600 space-y-2">
          <p className="font-semibold text-slate-900">Formato esperado da planilha</p>
          <p>Colunas: <code>Data</code>, <code>Bco</code>, <code>Histórico</code>, <code>Rubr</code>, <code>Descrição Rúbrica</code>, <code>Valor</code> (a coluna <code>Mês</code> é opcional). Aceita várias abas (Jan/Fev/.../Dez ou única).</p>
          <ul className="list-disc list-inside text-xs text-slate-500 space-y-0.5 pl-2">
            <li><code>Valor</code> positivo = receita; negativo = despesa</li>
            <li><code>Bco</code>: 1=Banco do Brasil, 6=Itaú, 29=C6, 104=Itaú MO, 5/50=Prática (ou texto)</li>
            <li><code>Descrição Rúbrica</code> casa com o nome de uma rubrica do plano de contas (case-insensitive)</li>
            <li>Linhas com valor 0, sem data ou sem valor são ignoradas</li>
          </ul>
        </div>
        <ImportForm clientId={id} />
      </div>
    </div>
  );
}
