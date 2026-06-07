import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/Button';
import { ChatWorkspace } from './ChatWorkspace';
import { loadChatHistory } from './actions';

type Params = Promise<{ id: string }>;

export default async function TranscriptPage({ params }: { params: Params }) {
  const { id: client_id } = await params;
  const supabase = await createClient();
  const { data: client } = await supabase
    .from('clients')
    .select('id, nome_completo, transcricao')
    .eq('id', client_id)
    .maybeSingle();

  if (!client) notFound();

  const messages = await loadChatHistory(client_id);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/clients/${client_id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft size={14} />
            Voltar para o cliente
          </Button>
        </Link>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
          Refinar plano com IA
        </p>
        <h1 className="text-display-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
          {client.nome_completo}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Converse com a IA pra ajustar receitas, despesas, eventos e passivos. Ela pergunta o que
          falta antes de aplicar.
        </p>
      </div>

      <ChatWorkspace
        clientId={client_id}
        initialTranscricao={client.transcricao ?? ''}
        initialMessages={messages}
      />
    </div>
  );
}
