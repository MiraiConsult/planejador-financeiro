import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/PageHeader';
import type { Lancamento } from '@/lib/controle-mensal/analytics';
import { LancamentosTable } from '../LancamentosTable';
import { listarCentros, garantirCentros } from '../centros/actions';

type Params = Promise<{ id: string }>;

const COLS =
  'id,data,descricao,valor,categoria,subcategoria,categoria_id,rubrica_id,mes,mes_num,ano,competencia,tipo,centro_id,eh_receita,origem,cliente_obs,viagem,sistema,is_nexlex';

function uniqOrdenado(vals: Array<string | null | undefined>): string[] {
  return [...new Set(vals.map((v) => (v ?? '').trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  );
}

export default async function LancamentosPage({ params }: { params: Params }) {
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

  await garantirCentros(id);

  // Carrega TODOS os lançamentos (não filtra por revisado) — esta tela é
  // pra ver/editar a lista bruta. Resolve nomes do plano de contas.
  const [{ data: rowsRaw }, { data: catRows }, centros] = await Promise.all([
    supabase.from('controle_mensal_lancamentos').select(COLS).eq('client_id', id).order('data', { ascending: false }),
    supabase.from('controle_mensal_categorias').select('id, nome').eq('client_id', id),
    listarCentros(id),
  ]);

  const catMap = new Map<string, string>((catRows ?? []).map((c) => [c.id as string, c.nome as string]));

  const rows: Lancamento[] = ((rowsRaw ?? []) as unknown as Lancamento[]).map((r) => ({
    ...r,
    categoria: (r.categoria_id && catMap.get(r.categoria_id)) || r.categoria,
    subcategoria: (r.rubrica_id && catMap.get(r.rubrica_id)) || r.subcategoria,
  }));

  const sugestoes = {
    categorias: uniqOrdenado(rows.map((r) => r.categoria)),
    subcategorias: uniqOrdenado(rows.map((r) => r.subcategoria)),
    origens: uniqOrdenado(rows.map((r) => r.origem)),
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Controle Financeiro"
        title={`Lançamentos — ${client.nome_completo}`}
        description={`${rows.length.toLocaleString('pt-BR')} lançamentos no total. Filtre, edite ou exporte direto da tabela.`}
      />
      <LancamentosTable
        rows={rows}
        clientId={id}
        sugestoes={sugestoes}
        centros={centros}
        titulo="Todos os lançamentos"
        mostrarCentro
      />
    </div>
  );
}
