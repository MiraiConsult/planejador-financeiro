import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/PageHeader';
import { listarCentros, garantirCentros } from '../centros/actions';
import { CentrosManager } from '../centros/CentrosManager';
import { PlanoDeContasManager, type CategoriaRow } from './PlanoDeContasManager';
import { DadosCadastraisTabs } from './Tabs';

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ tab?: string }>;

export default async function DadosCadastraisPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const defaultTab = sp.tab === 'centros' ? 'centros' : 'plano';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: client } = await supabase
    .from('clients')
    .select('id, nome_completo')
    .eq('id', id)
    .single();
  if (!client) notFound();

  // Carrega plano de contas + contagem de lançamentos por categoria/rubrica
  const [{ data: catsRaw }, { data: byCat }, { data: byRub }] = await Promise.all([
    supabase
      .from('controle_mensal_categorias')
      .select('id, nome, tipo, cor, parent_id, ordem, ativo')
      .eq('client_id', id)
      .order('parent_id', { ascending: true, nullsFirst: true })
      .order('ordem', { ascending: true }),
    supabase
      .from('controle_mensal_lancamentos')
      .select('categoria_id')
      .eq('client_id', id)
      .not('categoria_id', 'is', null),
    supabase
      .from('controle_mensal_lancamentos')
      .select('rubrica_id')
      .eq('client_id', id)
      .not('rubrica_id', 'is', null),
  ]);

  const contagemCat = new Map<string, number>();
  for (const r of byCat ?? []) {
    const k = r.categoria_id as string;
    contagemCat.set(k, (contagemCat.get(k) ?? 0) + 1);
  }
  const contagemRub = new Map<string, number>();
  for (const r of byRub ?? []) {
    const k = r.rubrica_id as string;
    contagemRub.set(k, (contagemRub.get(k) ?? 0) + 1);
  }

  const planoRows: CategoriaRow[] = (catsRaw ?? []).map((c) => ({
    id: c.id,
    nome: c.nome,
    tipo: c.tipo as 'receita' | 'despesa',
    cor: c.cor,
    parent_id: c.parent_id,
    ordem: c.ordem,
    ativo: c.ativo,
    lancamentos: c.parent_id
      ? contagemRub.get(c.id) ?? 0
      : contagemCat.get(c.id) ?? 0,
  }));

  await garantirCentros(id);
  const centros = await listarCentros(id);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link href={`/clients/${id}/controle-mensal`}>
        <Button variant="ghost" size="sm">
          <ArrowLeft size={14} />
          Voltar ao Controle Financeiro
        </Button>
      </Link>

      <PageHeader
        eyebrow="Controle Financeiro · Configuração"
        title={`Dados Cadastrais — ${client.nome_completo}`}
        description="Plano de contas (categorias e rubricas) e centros do cliente. Edite, adicione ou remova diretamente."
      />

      <DadosCadastraisTabs
        defaultTab={defaultTab}
        planoDeContas={
          <PlanoDeContasManager
            clientId={id}
            rows={planoRows}
            centros={centros.map((c) => ({ id: c.id, nome: c.nome }))}
          />
        }
        centros={<CentrosManager clientId={id} centros={centros} />}
      />
    </div>
  );
}
