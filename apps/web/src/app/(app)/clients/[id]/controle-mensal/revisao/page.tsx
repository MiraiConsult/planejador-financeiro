import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/PageHeader';
import { RevisaoManager, type RevisaoRow, type CategoriaNode } from './RevisaoManager';

type Params = Promise<{ id: string }>;

export default async function RevisaoPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: client } = await supabase
    .from('clients')
    .select('id, nome_completo, tem_controle_mensal')
    .eq('id', id)
    .maybeSingle();
  if (!client) notFound();
  if (!client.tem_controle_mensal) redirect(`/clients/${id}`);

  const [{ data: rows }, { data: cats }] = await Promise.all([
    supabase
      .from('controle_mensal_lancamentos')
      .select('id, data, descricao, valor, categoria_id, rubrica_id, eh_receita, eh_pagamento_fatura, status_transacao, origem_externa')
      .eq('client_id', id)
      .eq('revisado', false)
      .order('data', { ascending: false })
      .limit(1000),
    supabase
      .from('controle_mensal_categorias')
      .select('id, nome, tipo, cor, parent_id')
      .eq('client_id', id)
      .eq('ativo', true)
      .order('nome', { ascending: true }),
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/clients/${id}/controle-mensal`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft size={14} />
            Voltar para o controle mensal
          </Button>
        </Link>
      </div>

      <PageHeader
        eyebrow="Controle Mensal"
        title={`Revisão de lançamentos — ${client.nome_completo}`}
        description="Lançamentos importados dos bancos. Confira a categoria sugerida (mapeada automaticamente), ajuste o que precisar e aprove. Só os aprovados entram nos gráficos e no demonstrativo."
      />

      <RevisaoManager
        clientId={id}
        rows={(rows ?? []) as RevisaoRow[]}
        categorias={(cats ?? []) as CategoriaNode[]}
      />
    </div>
  );
}
