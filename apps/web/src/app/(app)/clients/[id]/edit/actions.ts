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
  await supabase.from('assets').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  revalidatePath(`/clients/${client_id}`);
  revalidatePath(`/clients/${client_id}/edit`);
}

export async function duplicateAsset(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const client_id = String(formData.get('client_id') ?? '');
  const supabase = await createClient();
  const { data: orig, error } = await supabase
    .from('assets')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !orig) {
    console.error('[duplicateAsset] failed', error);
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, created_at, updated_at, deleted_at, ...rest } = orig;
  void created_at;
  void updated_at;
  void deleted_at;
  await supabase.from('assets').insert({ ...rest, nome: `${rest.nome} (cópia)` });
  revalidatePath(`/clients/${client_id}`);
  revalidatePath(`/clients/${client_id}/edit`);
}

/**
 * Cria asset com defaults sensatos pra abrir já no painel de edição.
 * Não usa formData — chamado direto via onClick (server action wrapper).
 */
export async function quickAddAsset(args: {
  client_id: string;
  tipo: string;
  natureza: string;
  idade_inicio: number;
  idade_fim: number;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const defaultName: Record<string, string> = {
    financeiro_liquido: 'Nova aplicação',
    imovel: 'Novo imóvel',
    terreno: 'Novo terreno',
    carro: 'Novo veículo',
    salario: 'Salário',
    aluguel: 'Aluguel recebido',
    heranca_recebida: 'Herança',
    outro: 'Novo ativo',
  };
  const defaultValue =
    args.natureza === 'fluxo' ? 60000 /* R$ 60k/ano */ : 100000 /* R$ 100k */;
  const { data, error } = await supabase
    .from('assets')
    .insert({
      client_id: args.client_id,
      nome: defaultName[args.tipo] ?? 'Novo ativo',
      tipo: args.tipo,
      natureza: args.natureza,
      valor: defaultValue,
      idade_inicio: args.idade_inicio,
      idade_fim: args.idade_fim,
      indexado_inflacao: true,
      padrao_recorrencia: args.natureza === 'fluxo' ? 'recorrente_anual' : null,
    })
    .select('id')
    .single();
  if (error || !data) {
    console.error('[quickAddAsset] failed', error);
    return { ok: false, error: error?.message ?? 'unknown' };
  }
  revalidatePath(`/clients/${args.client_id}`);
  revalidatePath(`/clients/${args.client_id}/edit`);
  return { ok: true, id: data.id };
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
  await supabase.from('expenses').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  revalidatePath(`/clients/${client_id}`);
  revalidatePath(`/clients/${client_id}/edit`);
}

export async function duplicateExpense(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const client_id = String(formData.get('client_id') ?? '');
  const supabase = await createClient();
  const { data: orig, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !orig) {
    console.error('[duplicateExpense] failed', error);
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, created_at, updated_at, deleted_at, ...rest } = orig;
  void created_at;
  void updated_at;
  void deleted_at;
  await supabase.from('expenses').insert({ ...rest, descricao: `${rest.descricao} (cópia)` });
  revalidatePath(`/clients/${client_id}`);
  revalidatePath(`/clients/${client_id}/edit`);
}

export async function quickAddExpense(args: {
  client_id: string;
  idade_inicio: number;
  idade_fim: number;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      client_id: args.client_id,
      categoria: 'outro',
      descricao: 'Nova despesa',
      valor_mensal: 1000,
      idade_inicio: args.idade_inicio,
      idade_fim: args.idade_fim,
      indexado_inflacao: true,
      essencial: false,
      padrao_recorrencia: 'recorrente_anual',
    })
    .select('id')
    .single();
  if (error || !data) {
    console.error('[quickAddExpense] failed', error);
    return { ok: false, error: error?.message ?? 'unknown' };
  }
  revalidatePath(`/clients/${args.client_id}`);
  revalidatePath(`/clients/${args.client_id}/edit`);
  return { ok: true, id: data.id };
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

export async function quickAddEvent(args: {
  client_id: string;
  idade_inicio: number;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('events')
    .insert({
      client_id: args.client_id,
      tipo: 'sonho',
      descricao: 'Novo evento',
      valor: 10000,
      padrao_recorrencia: 'unico',
      idade_inicio: args.idade_inicio,
      indexado_inflacao: true,
    })
    .select('id')
    .single();
  if (error || !data) {
    console.error('[quickAddEvent] failed', error);
    return { ok: false, error: error?.message ?? 'unknown' };
  }
  revalidatePath(`/clients/${args.client_id}`);
  revalidatePath(`/clients/${args.client_id}/edit`);
  return { ok: true, id: data.id };
}

export async function deleteEvent(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const client_id = String(formData.get('client_id') ?? '');
  const supabase = await createClient();
  await supabase.from('events').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  revalidatePath(`/clients/${client_id}`);
  revalidatePath(`/clients/${client_id}/edit`);
}

export async function duplicateEvent(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const client_id = String(formData.get('client_id') ?? '');
  const supabase = await createClient();
  const { data: orig, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !orig) {
    console.error('[duplicateEvent] failed', error);
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, created_at, updated_at, deleted_at, ...rest } = orig;
  void created_at;
  void updated_at;
  void deleted_at;
  await supabase.from('events').insert({ ...rest, descricao: `${rest.descricao} (cópia)` });
  revalidatePath(`/clients/${client_id}`);
  revalidatePath(`/clients/${client_id}/edit`);
}

// ─────────── LIABILITIES ───────────

export async function quickAddLiability(args: {
  client_id: string;
  idade_inicio: number;
  idade_fim: number;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('liabilities')
    .insert({
      client_id: args.client_id,
      nome: 'Novo passivo',
      tipo: 'outro',
      saldo_atual: 50000,
      juros_aa: 0.10,
      parcela_mensal: 1000,
      idade_inicio: args.idade_inicio,
      idade_fim: args.idade_fim,
    })
    .select('id')
    .single();
  if (error || !data) {
    console.error('[quickAddLiability] failed', error);
    return { ok: false, error: error?.message ?? 'unknown' };
  }
  revalidatePath(`/clients/${args.client_id}`);
  revalidatePath(`/clients/${args.client_id}/edit`);
  return { ok: true, id: data.id };
}

export async function deleteLiability(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const client_id = String(formData.get('client_id') ?? '');
  const supabase = await createClient();
  await supabase
    .from('liabilities')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  revalidatePath(`/clients/${client_id}`);
  revalidatePath(`/clients/${client_id}/edit`);
}

export async function duplicateLiability(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const client_id = String(formData.get('client_id') ?? '');
  const supabase = await createClient();
  const { data: orig, error } = await supabase
    .from('liabilities')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !orig) {
    console.error('[duplicateLiability] failed', error);
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, created_at, updated_at, deleted_at, ...rest } = orig;
  void created_at;
  void updated_at;
  void deleted_at;
  await supabase.from('liabilities').insert({ ...rest, nome: `${rest.nome} (cópia)` });
  revalidatePath(`/clients/${client_id}`);
  revalidatePath(`/clients/${client_id}/edit`);
}

// ─────────── FINANCIAMENTO DE EVENTO (compra parcelada) ───────────

/**
 * Converte um evento de compra (ex: casa) em compra parcelada:
 *  - reduz o `valor` do evento pra apenas o valor da ENTRADA (sinal negativo),
 *  - cria um passivo do tipo `financiamento_imovel` com PMT calculado.
 *
 * PMT (Price/SAF francês): P = principal financiado, r = juros mensais,
 * n = total de parcelas → parcela = P · r / (1 − (1+r)^−n).
 * Se juros = 0, é só P / n.
 */
export async function convertEventToFinancing(args: {
  event_id: string;
  client_id: string;
  entrada_pct: number; // 0–100 (ex: 20 → 20%)
  prazo_anos: number; // ex: 30
  juros_aa_pct: number; // ex: 10 → 10% a.a.
  liability_tipo?: string;
}): Promise<
  | { ok: true; liability_id: string; entrada: number; parcela_mensal: number; financiado: number }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data: ev, error: evErr } = await supabase
    .from('events')
    .select('id, descricao, valor, idade_inicio')
    .eq('id', args.event_id)
    .single();
  if (evErr || !ev) return { ok: false, error: evErr?.message ?? 'evento não encontrado' };

  const total = Math.abs(Number(ev.valor));
  if (!Number.isFinite(total) || total <= 0) {
    return { ok: false, error: 'evento sem valor de compra válido' };
  }
  const entradaPct = Math.max(0, Math.min(100, args.entrada_pct)) / 100;
  const prazoAnos = Math.max(1, Math.round(args.prazo_anos));
  const jurosAa = Math.max(0, args.juros_aa_pct) / 100;
  const entrada = total * entradaPct;
  const financiado = total - entrada;
  const n = prazoAnos * 12;
  const rMensal = Math.pow(1 + jurosAa, 1 / 12) - 1;
  const parcela =
    rMensal === 0
      ? financiado / n
      : (financiado * rMensal) / (1 - Math.pow(1 + rMensal, -n));

  // 1) cria passivo
  const { data: liab, error: liabErr } = await supabase
    .from('liabilities')
    .insert({
      client_id: args.client_id,
      nome: `Financiamento — ${ev.descricao}`,
      tipo: args.liability_tipo ?? 'financiamento_imovel',
      saldo_atual: Math.round(financiado),
      juros_aa: jurosAa,
      parcela_mensal: Math.round(parcela),
      idade_inicio: ev.idade_inicio,
      idade_fim: ev.idade_inicio + prazoAnos,
    })
    .select('id')
    .single();
  if (liabErr || !liab) return { ok: false, error: liabErr?.message ?? 'falha ao criar passivo' };

  // 2) ajusta evento pra refletir somente a entrada
  const sinal = Number(ev.valor) < 0 ? -1 : -1; // compra é sempre saída
  await supabase
    .from('events')
    .update({
      valor: sinal * Math.round(entrada),
      descricao: `${ev.descricao} — entrada`,
    })
    .eq('id', args.event_id);

  revalidatePath(`/clients/${args.client_id}`);
  revalidatePath(`/clients/${args.client_id}/edit`);
  return {
    ok: true,
    liability_id: liab.id,
    entrada: Math.round(entrada),
    parcela_mensal: Math.round(parcela),
    financiado: Math.round(financiado),
  };
}

// ─────────── PATCH GRANULAR (auto-save) ───────────

const ASSET_FIELDS = new Set([
  'nome', 'tipo', 'natureza', 'valor', 'idade_inicio', 'idade_fim',
  'indexado_inflacao', 'taxa_retorno_aa', 'valorizacao_aa',
  'crescimento_real_aa', 'padrao_recorrencia', 'intervalo_anos',
  'aporte_mensal', 'idade_aporte_inicio', 'idade_aporte_fim',
  'prioridade_liquidacao', 'notas',
]);
const EXPENSE_FIELDS = new Set([
  'categoria', 'descricao', 'valor_mensal', 'idade_inicio', 'idade_fim',
  'indexado_inflacao', 'essencial', 'crescimento_real_aa',
  'padrao_recorrencia', 'intervalo_anos', 'notas',
]);
const EVENT_FIELDS = new Set([
  'tipo', 'descricao', 'valor', 'padrao_recorrencia', 'idade_inicio',
  'idade_fim', 'intervalo_anos', 'indexado_inflacao', 'prioridade',
  'ativo_referenciado', 'notas',
]);
const LIABILITY_FIELDS = new Set([
  'nome', 'tipo', 'saldo_atual', 'juros_aa', 'parcela_mensal',
  'idade_inicio', 'idade_fim', 'notas',
]);
const FIELD_WHITELIST: Record<Entity, Set<string>> = {
  assets: ASSET_FIELDS,
  expenses: EXPENSE_FIELDS,
  events: EVENT_FIELDS,
  liabilities: LIABILITY_FIELDS,
};

/**
 * Atualização granular pra auto-save. Aceita Partial<T> e filtra contra
 * uma whitelist para evitar gravação de campos não pertencentes ao schema.
 *
 * Retorna { ok: boolean } para o cliente poder ajustar UI.
 */
export async function patchEntity(args: {
  entity: Entity;
  id: string;
  client_id: string;
  patch: Record<string, unknown>;
}) {
  if (!ALLOWED_TABLES[args.entity]) return { ok: false as const, error: 'invalid entity' };
  const allowed = FIELD_WHITELIST[args.entity];
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args.patch)) {
    if (allowed.has(k)) clean[k] = v;
  }
  if (Object.keys(clean).length === 0) return { ok: true as const };

  const supabase = await createClient();
  const { error } = await supabase
    .from(args.entity)
    .update(clean)
    .eq('id', args.id);

  if (error) {
    console.error(`[patchEntity:${args.entity}] failed`, error, clean);
    return { ok: false as const, error: error.message };
  }
  // Importante: NÃO chama revalidatePath aqui. O auto-save dispara várias
  // vezes durante a edição; revalidar a árvore inteira reseta state local
  // dos editors. A página re-busca dados ao navegar; o cliente segura
  // a fonte de verdade enquanto edita.
  // Mas revalida o dashboard do cliente (que usa a simulação completa).
  revalidatePath(`/clients/${args.client_id}`);
  return { ok: true as const };
}

// ─────────── UNDO DELETE ───────────

export async function undoDelete(args: {
  entity: Entity;
  id: string;
  client_id: string;
}) {
  if (!ALLOWED_TABLES[args.entity]) throw new Error('invalid entity');
  const supabase = await createClient();
  const { error } = await supabase
    .from(args.entity)
    .update({ deleted_at: null })
    .eq('id', args.id);
  if (error) {
    console.error('[undoDelete] failed', error);
    return { ok: false } as const;
  }
  revalidatePath(`/clients/${args.client_id}`);
  revalidatePath(`/clients/${args.client_id}/edit`);
  return { ok: true } as const;
}

// ─────────── CUSTOM CATEGORIES ───────────

type CategoryKind = 'asset_tipo' | 'expense_categoria' | 'event_tipo' | 'liability_tipo';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

/**
 * Cria uma categoria customizada para o consultor logado.
 * Para asset_tipo, exige `natureza` ('estoque' | 'fluxo') em extra.
 * Retorna { value, label } pra UI selecionar o item recém-criado.
 */
export async function addCustomCategory(args: {
  kind: CategoryKind;
  label: string;
  natureza?: 'estoque' | 'fluxo';
  client_id?: string;
}): Promise<
  | { ok: true; value: string; label: string }
  | { ok: false; error: string }
> {
  const label = args.label.trim().slice(0, 60);
  if (!label) return { ok: false, error: 'Label vazio' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Não autenticado' };

  const value = `c_${slugify(label) || 'item'}_${Math.random().toString(36).slice(2, 6)}`;
  const extra: Record<string, unknown> = {};
  if (args.kind === 'asset_tipo') {
    extra.natureza = args.natureza ?? 'estoque';
  }

  const { error } = await supabase.from('custom_categories').insert({
    consultant_id: user.id,
    kind: args.kind,
    value,
    label,
    extra,
  });
  if (error) {
    console.error('[addCustomCategory] failed', error);
    return { ok: false, error: error.message };
  }

  if (args.client_id) {
    revalidatePath(`/clients/${args.client_id}/edit`);
  }
  return { ok: true, value, label };
}

// ─────────── OVERRIDES (edição ponto-a-ponto no gráfico) ───────────

type Entity = 'assets' | 'expenses' | 'events' | 'liabilities';

const ALLOWED_TABLES: Record<Entity, true> = {
  assets: true,
  expenses: true,
  events: true,
  liabilities: true,
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
