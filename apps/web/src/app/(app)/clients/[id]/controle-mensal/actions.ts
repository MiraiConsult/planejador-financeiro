'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { parseLancamentos } from '@/lib/controle-mensal/parse';

export interface ImportResult {
  ok: boolean;
  adicionados?: number;
  ignorados?: number;
  total?: number;
  erro?: string;
}

/**
 * Importa um CSV de lançamentos para o cliente, de forma incremental e idempotente.
 * Reimportar o mesmo arquivo não duplica (unique (client_id, hash) + checagem prévia).
 */
export async function importarLancamentos(clientId: string, formData: FormData): Promise<ImportResult> {
  const file = formData.get('file');
  if (!(file instanceof File)) return { ok: false, erro: 'Nenhum arquivo enviado.' };
  if (!file.name.toLowerCase().endsWith('.csv')) {
    return { ok: false, erro: 'Por enquanto só CSV é suportado. Exporte o Excel como CSV (separador , ou ;).' };
  }

  let registros;
  try {
    registros = parseLancamentos(await file.text());
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Falha ao ler o arquivo.' };
  }
  if (!registros.length) return { ok: false, erro: 'Nenhum lançamento válido encontrado.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: 'Não autenticado.' };

  // Confere a posse do cliente antes de inserir (defesa extra além do RLS).
  const { data: cli } = await supabase.from('clients').select('id').eq('id', clientId).single();
  if (!cli) return { ok: false, erro: 'Cliente não encontrado ou sem acesso.' };

  const payload = registros.map((r) => ({ ...r, client_id: clientId }));
  const hashes = payload.map((p) => p.hash);

  const { data: existentes } = await supabase
    .from('controle_mensal_lancamentos')
    .select('hash')
    .eq('client_id', clientId)
    .in('hash', hashes);
  const jaTem = new Set((existentes ?? []).map((e) => e.hash as string));
  const novos = payload.filter((p) => !jaTem.has(p.hash));

  if (novos.length) {
    const { error } = await supabase
      .from('controle_mensal_lancamentos')
      .upsert(novos, { onConflict: 'client_id,hash', ignoreDuplicates: true });
    if (error) return { ok: false, erro: error.message };
  }

  revalidatePath(`/clients/${clientId}/controle-mensal`);
  return {
    ok: true,
    adicionados: novos.length,
    ignorados: payload.length - novos.length,
    total: payload.length,
  };
}
