'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  marceloClient,
  marceloAssets,
  marceloExpenses,
  marceloEvents,
} from '@planejador/engine/src/fixtures/marcelo';

/**
 * Insere a fixture do Marcelo Castro como cliente do consultor logado.
 * - cria 1 client
 * - cria 10 assets
 * - cria 10 expenses
 * - cria 2 events
 * - cria 1 assumptions default vinculado ao client
 * - cria 1 scenario 'base' default
 */
export async function seedMarcelo() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // garante o profile (se signup ficou sem confirmar trigger, garantimos aqui)
  await supabase.from('profiles').upsert({
    id: user.id,
    role: 'consultant',
    full_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Consultor',
  });

  // 1) client
  const { data: clientRow, error: clientErr } = await supabase
    .from('clients')
    .insert({
      consultant_id: user.id,
      nome_completo: marceloClient.nome_completo,
      data_nascimento: marceloClient.data_nascimento,
      expectativa_vida_anos: marceloClient.expectativa_vida_anos,
      idade_aposentadoria: marceloClient.idade_aposentadoria,
      idade_reducao_trabalho: marceloClient.idade_reducao_trabalho,
      perfil_carteira: marceloClient.perfil_carteira,
      pais_residencia: 'BR',
      tem_balanco_patrimonial: true,
    })
    .select('id')
    .single();
  if (clientErr) throw clientErr;
  const client_id = clientRow.id;

  // 2) assets
  const assetsPayload = marceloAssets.map((a) => ({
    client_id,
    nome: a.nome,
    tipo: a.tipo,
    natureza: a.natureza,
    valor: a.valor,
    idade_inicio: a.idade_inicio,
    idade_fim: a.idade_fim,
    indexado_inflacao: a.indexado_inflacao,
    notas: a.notas ?? null,
  }));
  const { error: aErr } = await supabase.from('assets').insert(assetsPayload);
  if (aErr) throw aErr;

  // 3) expenses
  const expPayload = marceloExpenses.map((d) => ({
    client_id,
    categoria: d.categoria,
    descricao: d.descricao,
    valor_mensal: d.valor_mensal,
    idade_inicio: d.idade_inicio,
    idade_fim: d.idade_fim,
    indexado_inflacao: d.indexado_inflacao,
    essencial: d.essencial,
  }));
  const { error: eErr } = await supabase.from('expenses').insert(expPayload);
  if (eErr) throw eErr;

  // 4) events
  const evPayload = marceloEvents.map((ev) => ({
    client_id,
    tipo: ev.tipo,
    descricao: ev.descricao,
    valor: ev.valor,
    padrao_recorrencia: ev.padrao_recorrencia,
    idade_inicio: ev.idade_inicio,
    idade_fim: ev.idade_fim ?? null,
    intervalo_anos: ev.intervalo_anos ?? null,
    indexado_inflacao: ev.indexado_inflacao,
    prioridade: ev.prioridade ?? null,
  }));
  const { error: evErr } = await supabase.from('events').insert(evPayload);
  if (evErr) throw evErr;

  // 5) assumptions default vinculado ao client (defaults da tabela cobrem todos os valores)
  await supabase.from('assumptions').insert({
    consultant_id: user.id,
    client_id,
  });

  // 6) scenarios: base default + otimista + pessimista
  await supabase.from('scenarios').insert([
    { client_id, nome: 'Base',       tipo: 'base',       is_default: true  },
    { client_id, nome: 'Otimista',   tipo: 'otimista',   is_default: false },
    { client_id, nome: 'Pessimista', tipo: 'pessimista', is_default: false },
  ]);

  revalidatePath('/clients');
  redirect(`/clients/${client_id}`);
}

export async function deleteClient(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('clients').delete().eq('id', id);
  revalidatePath('/clients');
}
