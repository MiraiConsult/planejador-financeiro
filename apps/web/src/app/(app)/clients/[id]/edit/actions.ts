'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// ── helpers ────────────────────────────────────────────────────────────────

/** Lê um campo "%" do form e devolve fração (11 → 0.11). Vazio/invalido → null. */
function pctOrNull(fd: FormData, key: string): number | null {
  const raw = fd.get(key);
  if (raw === null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n / 100;
}

function intOrNull(fd: FormData, key: string): number | null {
  const raw = fd.get(key);
  if (raw === null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  return n;
}

function recorrenciaFromForm(fd: FormData, fallback = 'recorrente_anual'): string {
  const v = String(fd.get('padrao_recorrencia') ?? '');
  if (v === 'unico' || v === 'recorrente_anual' || v === 'recorrente_espacado') return v;
  return fallback;
}

// ─────────── ASSETS ───────────

export async function addAsset(formData: FormData) {
  const client_id = String(formData.get('client_id') ?? '');
  const supabase = await createClient();
  const natureza = String(formData.get('natureza') ?? 'estoque');
  const recorrencia = natureza === 'fluxo' ? recorrenciaFromForm(formData) : null;
  await supabase.from('assets').insert({
    client_id,
    nome: String(formData.get('nome') ?? ''),
    tipo: String(formData.get('tipo') ?? 'outro'),
    natureza,
    valor: Number(formData.get('valor') ?? 0),
    idade_inicio: Number(formData.get('idade_inicio') ?? 0),
    idade_fim: Number(formData.get('idade_fim') ?? 0),
    indexado_inflacao: formData.get('indexado_inflacao') === 'on',
    taxa_retorno_aa: pctOrNull(formData, 'taxa_retorno_aa'),
    valorizacao_aa: pctOrNull(formData, 'valorizacao_aa'),
    crescimento_real_aa: pctOrNull(formData, 'crescimento_real_aa'),
    padrao_recorrencia: recorrencia,
    intervalo_anos:
      recorrencia === 'recorrente_espacado' ? intOrNull(formData, 'intervalo_anos') : null,
  });
  revalidatePath(`/clients/${client_id}`);
  revalidatePath(`/clients/${client_id}/edit`);
}

export async function updateAsset(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const client_id = String(formData.get('client_id') ?? '');
  console.log('[updateAsset] start', { id, client_id });
  const supabase = await createClient();
  const natureza = String(formData.get('natureza') ?? 'estoque');
  const recorrencia = natureza === 'fluxo' ? recorrenciaFromForm(formData) : null;
  const payload = {
    nome: String(formData.get('nome') ?? ''),
    tipo: String(formData.get('tipo') ?? 'outro'),
    natureza,
    valor: Number(formData.get('valor') ?? 0),
    idade_inicio: Number(formData.get('idade_inicio') ?? 0),
    idade_fim: Number(formData.get('idade_fim') ?? 0),
    indexado_inflacao: formData.get('indexado_inflacao') === 'on',
    taxa_retorno_aa: pctOrNull(formData, 'taxa_retorno_aa'),
    valorizacao_aa: pctOrNull(formData, 'valorizacao_aa'),
    crescimento_real_aa: pctOrNull(formData, 'crescimento_real_aa'),
    padrao_recorrencia: recorrencia,
    intervalo_anos:
      recorrencia === 'recorrente_espacado' ? intOrNull(formData, 'intervalo_anos') : null,
  };
  const { error } = await supabase.from('assets').update(payload).eq('id', id);
  if (error) console.error('[updateAsset] supabase error', error, payload);
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
  const recorrencia = recorrenciaFromForm(formData);
  await supabase.from('expenses').insert({
    client_id,
    categoria: String(formData.get('categoria') ?? 'outro'),
    descricao: String(formData.get('descricao') ?? ''),
    valor_mensal: Number(formData.get('valor_mensal') ?? 0),
    idade_inicio: Number(formData.get('idade_inicio') ?? 0),
    idade_fim: Number(formData.get('idade_fim') ?? 0),
    indexado_inflacao: formData.get('indexado_inflacao') !== 'off',
    essencial: formData.get('essencial') === 'on',
    crescimento_real_aa: pctOrNull(formData, 'crescimento_real_aa'),
    padrao_recorrencia: recorrencia,
    intervalo_anos:
      recorrencia === 'recorrente_espacado' ? intOrNull(formData, 'intervalo_anos') : null,
  });
  revalidatePath(`/clients/${client_id}`);
  revalidatePath(`/clients/${client_id}/edit`);
}

export async function updateExpense(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const client_id = String(formData.get('client_id') ?? '');
  console.log('[updateExpense] start', { id, client_id });
  const supabase = await createClient();
  const recorrencia = recorrenciaFromForm(formData);
  const payload = {
    categoria: String(formData.get('categoria') ?? 'outro'),
    descricao: String(formData.get('descricao') ?? ''),
    valor_mensal: Number(formData.get('valor_mensal') ?? 0),
    idade_inicio: Number(formData.get('idade_inicio') ?? 0),
    idade_fim: Number(formData.get('idade_fim') ?? 0),
    indexado_inflacao: formData.get('indexado_inflacao') === 'on',
    essencial: formData.get('essencial') === 'on',
    crescimento_real_aa: pctOrNull(formData, 'crescimento_real_aa'),
    padrao_recorrencia: recorrencia,
    intervalo_anos:
      recorrencia === 'recorrente_espacado' ? intOrNull(formData, 'intervalo_anos') : null,
  };
  const { error } = await supabase.from('expenses').update(payload).eq('id', id);
  if (error) console.error('[updateExpense] supabase error', error, payload);
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
  console.log('[updateEvent] start', { id, client_id });
  const supabase = await createClient();
  const recorrencia = String(formData.get('padrao_recorrencia') ?? 'unico');
  const payload = {
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
  };
  const { error } = await supabase.from('events').update(payload).eq('id', id);
  if (error) console.error('[updateEvent] supabase error', error, payload);
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

// ─────────── OVERRIDES (edição ponto-a-ponto no gráfico) ───────────

type Entity = 'assets' | 'expenses' | 'events';

const ALLOWED_TABLES: Record<Entity, true> = {
  assets: true,
  expenses: true,
  events: true,
};

/**
 * Define ou remove um override para uma idade específica.
 * Se `value` for null → remove a chave. Caso contrário grava o valor anual nominal.
 */
export async function setOverride(args: {
  entity: Entity;
  id: string;
  client_id: string;
  idade: number;
  value: number | null;
}) {
  return setOverridesBatch({
    entity: args.entity,
    id: args.id,
    client_id: args.client_id,
    patch: { [String(args.idade)]: args.value },
  });
}

/**
 * Aplica um conjunto de overrides de uma vez (modo pincel).
 * `patch` é um mapa idade(string) → valor | null (null remove).
 */
export async function setOverridesBatch(args: {
  entity: Entity;
  id: string;
  client_id: string;
  patch: Record<string, number | null>;
}) {
  if (!ALLOWED_TABLES[args.entity]) throw new Error('invalid entity');
  const supabase = await createClient();

  const { data, error } = await supabase
    .from(args.entity)
    .select('overrides')
    .eq('id', args.id)
    .single();
  if (error) throw error;

  const overrides: Record<string, number> = (data?.overrides as Record<string, number>) ?? {};
  for (const [k, v] of Object.entries(args.patch)) {
    if (v === null) delete overrides[k];
    else overrides[k] = v;
  }

  const { error: upErr } = await supabase
    .from(args.entity)
    .update({ overrides })
    .eq('id', args.id);
  if (upErr) throw upErr;

  revalidatePath(`/clients/${args.client_id}`);
  revalidatePath(`/clients/${args.client_id}/edit`);
}

/** Limpa TODOS os overrides de uma entidade (volta pra curva paramétrica). */
export async function clearOverrides(args: {
  entity: Entity;
  id: string;
  client_id: string;
}) {
  if (!ALLOWED_TABLES[args.entity]) throw new Error('invalid entity');
  const supabase = await createClient();
  const { error } = await supabase
    .from(args.entity)
    .update({ overrides: {} })
    .eq('id', args.id);
  if (error) throw error;
  revalidatePath(`/clients/${args.client_id}`);
  revalidatePath(`/clients/${args.client_id}/edit`);
}
