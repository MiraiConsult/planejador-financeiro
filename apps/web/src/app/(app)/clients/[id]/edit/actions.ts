'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// ─────────── ASSETS ───────────

export async function addAsset(formData: FormData) {
  const client_id = String(formData.get('client_id') ?? '');
  const supabase = await createClient();
  await supabase.from('assets').insert({
    client_id,
    nome: String(formData.get('nome') ?? ''),
    tipo: String(formData.get('tipo') ?? 'outro'),
    natureza: String(formData.get('natureza') ?? 'estoque'),
    valor: Number(formData.get('valor') ?? 0),
    idade_inicio: Number(formData.get('idade_inicio') ?? 0),
    idade_fim: Number(formData.get('idade_fim') ?? 0),
    indexado_inflacao: formData.get('indexado_inflacao') === 'on',
  });
  revalidatePath(`/clients/${client_id}`);
  revalidatePath(`/clients/${client_id}/edit`);
}

export async function updateAsset(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const client_id = String(formData.get('client_id') ?? '');
  const supabase = await createClient();
  await supabase
    .from('assets')
    .update({
      nome: String(formData.get('nome') ?? ''),
      tipo: String(formData.get('tipo') ?? 'outro'),
      natureza: String(formData.get('natureza') ?? 'estoque'),
      valor: Number(formData.get('valor') ?? 0),
      idade_inicio: Number(formData.get('idade_inicio') ?? 0),
      idade_fim: Number(formData.get('idade_fim') ?? 0),
      indexado_inflacao: formData.get('indexado_inflacao') === 'on',
    })
    .eq('id', id);
  revalidatePath(`/clients/${client_id}`);
  revalidatePath(`/clients/${client_id}/edit`);
}

export async function deleteAsset(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const client_id = String(formData.get('client_id') ?? '');
  const supabase = await createClient();
  await supabase.from('assets').delete().eq('id', id);
  revalidatePath(`/clients/${client_id}`);
  revalidatePath(`/clients/${client_id}/edit`);
}

// ─────────── EXPENSES ───────────

export async function addExpense(formData: FormData) {
  const client_id = String(formData.get('client_id') ?? '');
  const supabase = await createClient();
  await supabase.from('expenses').insert({
    client_id,
    categoria: String(formData.get('categoria') ?? 'outro'),
    descricao: String(formData.get('descricao') ?? ''),
    valor_mensal: Number(formData.get('valor_mensal') ?? 0),
    idade_inicio: Number(formData.get('idade_inicio') ?? 0),
    idade_fim: Number(formData.get('idade_fim') ?? 0),
    indexado_inflacao: true,
    essencial: formData.get('essencial') === 'on',
  });
  revalidatePath(`/clients/${client_id}`);
  revalidatePath(`/clients/${client_id}/edit`);
}

export async function updateExpense(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const client_id = String(formData.get('client_id') ?? '');
  const supabase = await createClient();
  await supabase
    .from('expenses')
    .update({
      categoria: String(formData.get('categoria') ?? 'outro'),
      descricao: String(formData.get('descricao') ?? ''),
      valor_mensal: Number(formData.get('valor_mensal') ?? 0),
      idade_inicio: Number(formData.get('idade_inicio') ?? 0),
      idade_fim: Number(formData.get('idade_fim') ?? 0),
      essencial: formData.get('essencial') === 'on',
    })
    .eq('id', id);
  revalidatePath(`/clients/${client_id}`);
  revalidatePath(`/clients/${client_id}/edit`);
}

export async function deleteExpense(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const client_id = String(formData.get('client_id') ?? '');
  const supabase = await createClient();
  await supabase.from('expenses').delete().eq('id', id);
  revalidatePath(`/clients/${client_id}`);
  revalidatePath(`/clients/${client_id}/edit`);
}

// ─────────── EVENTS ───────────

export async function addEvent(formData: FormData) {
  const client_id = String(formData.get('client_id') ?? '');
  const supabase = await createClient();
  const recorrencia = String(formData.get('padrao_recorrencia') ?? 'unico');
  await supabase.from('events').insert({
    client_id,
    tipo: String(formData.get('tipo') ?? 'sonho'),
    descricao: String(formData.get('descricao') ?? ''),
    valor: Number(formData.get('valor') ?? 0),
    padrao_recorrencia: recorrencia,
    idade_inicio: Number(formData.get('idade_inicio') ?? 0),
    idade_fim: formData.get('idade_fim') ? Number(formData.get('idade_fim')) : null,
    intervalo_anos:
      recorrencia === 'recorrente_espacado' && formData.get('intervalo_anos')
        ? Number(formData.get('intervalo_anos'))
        : null,
    indexado_inflacao: formData.get('indexado_inflacao') === 'on',
  });
  revalidatePath(`/clients/${client_id}`);
  revalidatePath(`/clients/${client_id}/edit`);
}

export async function updateEvent(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const client_id = String(formData.get('client_id') ?? '');
  const supabase = await createClient();
  const recorrencia = String(formData.get('padrao_recorrencia') ?? 'unico');
  await supabase
    .from('events')
    .update({
      tipo: String(formData.get('tipo') ?? 'sonho'),
      descricao: String(formData.get('descricao') ?? ''),
      valor: Number(formData.get('valor') ?? 0),
      padrao_recorrencia: recorrencia,
      idade_inicio: Number(formData.get('idade_inicio') ?? 0),
      idade_fim: formData.get('idade_fim') ? Number(formData.get('idade_fim')) : null,
      intervalo_anos:
        recorrencia === 'recorrente_espacado' && formData.get('intervalo_anos')
          ? Number(formData.get('intervalo_anos'))
          : null,
      indexado_inflacao: formData.get('indexado_inflacao') === 'on',
    })
    .eq('id', id);
  revalidatePath(`/clients/${client_id}`);
  revalidatePath(`/clients/${client_id}/edit`);
}

export async function deleteEvent(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const client_id = String(formData.get('client_id') ?? '');
  const supabase = await createClient();
  await supabase.from('events').delete().eq('id', id);
  revalidatePath(`/clients/${client_id}`);
  revalidatePath(`/clients/${client_id}/edit`);
}
