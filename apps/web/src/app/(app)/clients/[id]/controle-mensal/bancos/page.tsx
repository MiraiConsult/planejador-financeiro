import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/PageHeader';
import { BancosManager, type BancoRow, type SyncLogRow } from './BancosManager';

type Params = Promise<{ id: string }>;

export default async function BancosPage({ params }: { params: Params }) {
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

  const [{ data: conexoes }, { data: logs }] = await Promise.all([
    supabase
      .from('bank_connections')
      .select('id, external_account_id, external_item_id, institution_name, account_type, account_subtype, account_number, status, last_sync_at, last_sync_error, last_balance')
      .eq('client_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('bank_sync_log')
      .select('id, bank_connection_id, started_at, finished_at, status, transactions_inserted, transactions_skipped, error_message, triggered_by')
      .eq('client_id', id)
      .order('started_at', { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <Link href={`/clients/${id}/controle-mensal`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft size={14} />
            Voltar para o Controle Financeiro
          </Button>
        </Link>
      </div>

      <PageHeader
        eyebrow="Controle Financeiro"
        title={`Bancos conectados — ${client.nome_completo}`}
        description="Sincronização automática diária dos extratos dos bancos conectados via Banco MCP (Open Finance). Cada transação vira um lançamento no Controle Financeiro, com dedup automático por id externo."
      />

      <BancosManager
        clientId={id}
        conexoes={(conexoes ?? []) as BancoRow[]}
        logs={(logs ?? []) as SyncLogRow[]}
      />
    </div>
  );
}
