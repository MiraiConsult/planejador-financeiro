'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { OnboardingPayload, DraftAsset, DraftExpense, DraftEvent, DraftLiability } from './types';

// ─── Helpers ───

async function getUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return user.id;
}

// ─── Criação final (mantido pro fluxo de submit single-shot) ───

export async function createClientFromOnboarding(payload: OnboardingPayload) {
  const supabase = await createClient();
  const userId = await getUserId();

  const { data: clientRow, error: clientErr } = await supabase
    .from('clients')
    .insert({
      consultant_id: userId,
      nome_completo: payload.nome_completo,
      data_nascimento: payload.data_nascimento,
      expectativa_vida_anos: payload.expectativa_vida_anos,
      idade_aposentadoria: payload.idade_aposentadoria,
      idade_reducao_trabalho: payload.idade_reducao_trabalho,
      perfil_carteira: payload.perfil_carteira,
      custom_retorno_aa: payload.perfil_carteira === 'custom' ? payload.custom_retorno_aa : null,
      custom_volatilidade_aa: payload.perfil_carteira === 'custom' ? payload.custom_volatilidade_aa : null,
      pais_residencia: 'BR',
    })
    .select('id')
    .single();
  if (clientErr || !clientRow) {
    return { ok: false as const, error: clientErr?.message ?? 'falha ao criar cliente' };
  }
  const client_id = clientRow.id;

  await syncItems(client_id, payload, true);

  await supabase.from('assumptions').insert({ consultant_id: userId, client_id });
  await supabase.from('scenarios').insert([
    { client_id, nome: 'Base', tipo: 'base', is_default: true },
    { client_id, nome: 'Otimista', tipo: 'otimista', is_default: false },
    { client_id, nome: 'Pessimista', tipo: 'pessimista', is_default: false },
  ]);

  revalidatePath('/clients');
  return { ok: true as const, client_id };
}

// ─── Save por etapa (rascunho) ───

/**
 * Persiste o estado atual do wizard. Cria o cliente se não existir
 * (somente quando dados básicos estão preenchidos). Sincroniza items
 * via replace completo.
 */
export async function saveOnboardingDraft(args: {
  client_id: string | null;
  step: number;
  payload: OnboardingPayload;
}): Promise<{ ok: true; client_id: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const userId = await getUserId();
  const { client_id: existingId, step, payload } = args;

  if (!payload.nome_completo.trim() || !payload.data_nascimento) {
    return { ok: false, error: 'Preencha nome e data de nascimento primeiro' };
  }

  let client_id = existingId;

  if (!client_id) {
    const { data, error } = await supabase
      .from('clients')
      .insert({
        consultant_id: userId,
        nome_completo: payload.nome_completo.trim(),
        data_nascimento: payload.data_nascimento,
        expectativa_vida_anos: payload.expectativa_vida_anos,
        idade_aposentadoria: payload.idade_aposentadoria,
        idade_reducao_trabalho: payload.idade_reducao_trabalho,
        perfil_carteira: payload.perfil_carteira,
        custom_retorno_aa:
          payload.perfil_carteira === 'custom' ? payload.custom_retorno_aa : null,
        custom_volatilidade_aa:
          payload.perfil_carteira === 'custom' ? payload.custom_volatilidade_aa : null,
        pais_residencia: 'BR',
        onboarding_step: step,
      })
      .select('id')
      .single();
    if (error || !data) {
      console.error('[saveOnboardingDraft] insert client', error);
      return { ok: false, error: error?.message ?? 'falha ao criar' };
    }
    client_id = data.id;

    await supabase.from('assumptions').insert({ consultant_id: userId, client_id });
    await supabase.from('scenarios').insert([
      { client_id, nome: 'Base', tipo: 'base', is_default: true },
      { client_id, nome: 'Otimista', tipo: 'otimista', is_default: false },
      { client_id, nome: 'Pessimista', tipo: 'pessimista', is_default: false },
    ]);
  } else {
    const { error } = await supabase
      .from('clients')
      .update({
        nome_completo: payload.nome_completo.trim(),
        data_nascimento: payload.data_nascimento,
        expectativa_vida_anos: payload.expectativa_vida_anos,
        idade_aposentadoria: payload.idade_aposentadoria,
        idade_reducao_trabalho: payload.idade_reducao_trabalho,
        perfil_carteira: payload.perfil_carteira,
        custom_retorno_aa:
          payload.perfil_carteira === 'custom' ? payload.custom_retorno_aa : null,
        custom_volatilidade_aa:
          payload.perfil_carteira === 'custom' ? payload.custom_volatilidade_aa : null,
        onboarding_step: step,
      })
      .eq('id', client_id);
    if (error) {
      console.error('[saveOnboardingDraft] update client', error);
      return { ok: false, error: error.message };
    }
  }

  if (!client_id) {
    return { ok: false, error: 'erro inesperado: client_id null' };
  }

  await syncItems(client_id, payload, true);

  revalidatePath('/clients');
  return { ok: true, client_id };
}

/**
 * Carrega cliente em rascunho e devolve estado pronto pra hidratar o Wizard.
 */
export async function loadOnboardingDraft(client_id: string): Promise<
  | { ok: true; step: number; payload: OnboardingPayload }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const [{ data: c }, { data: assets }, { data: expenses }, { data: events }, { data: liabilities }] =
    await Promise.all([
      supabase.from('clients').select('*').eq('id', client_id).maybeSingle(),
      supabase.from('assets').select('*').eq('client_id', client_id).is('deleted_at', null),
      supabase.from('expenses').select('*').eq('client_id', client_id).is('deleted_at', null),
      supabase.from('events').select('*').eq('client_id', client_id).is('deleted_at', null),
      supabase.from('liabilities').select('*').eq('client_id', client_id).is('deleted_at', null),
    ]);

  if (!c) return { ok: false, error: 'cliente não encontrado' };

  const payload: OnboardingPayload = {
    nome_completo: c.nome_completo ?? '',
    data_nascimento: c.data_nascimento ?? '',
    expectativa_vida_anos: c.expectativa_vida_anos ?? 90,
    idade_aposentadoria: c.idade_aposentadoria ?? null,
    idade_reducao_trabalho: c.idade_reducao_trabalho ?? null,
    perfil_carteira: c.perfil_carteira ?? 'moderado',
    custom_retorno_aa: c.custom_retorno_aa != null ? Number(c.custom_retorno_aa) : null,
    custom_volatilidade_aa:
      c.custom_volatilidade_aa != null ? Number(c.custom_volatilidade_aa) : null,
    assets: (assets ?? []).map<DraftAsset>((a) => ({
      id: a.id,
      nome: a.nome,
      tipo: a.tipo,
      natureza: a.natureza,
      valor: Number(a.valor),
      idade_inicio: a.idade_inicio,
      idade_fim: a.idade_fim,
      indexado_inflacao: a.indexado_inflacao,
    })),
    expenses: (expenses ?? []).map<DraftExpense>((e) => ({
      id: e.id,
      categoria: e.categoria,
      descricao: e.descricao,
      valor_mensal: Number(e.valor_mensal),
      idade_inicio: e.idade_inicio,
      idade_fim: e.idade_fim,
      essencial: e.essencial,
    })),
    events: (events ?? []).map<DraftEvent>((ev) => ({
      id: ev.id,
      tipo: ev.tipo,
      descricao: ev.descricao,
      valor: Number(ev.valor),
      padrao_recorrencia: ev.padrao_recorrencia,
      idade_inicio: ev.idade_inicio,
      idade_fim: ev.idade_fim ?? null,
      intervalo_anos: ev.intervalo_anos ?? null,
      indexado_inflacao: ev.indexado_inflacao,
    })),
    liabilities: (liabilities ?? []).map<DraftLiability>((l) => ({
      id: l.id,
      nome: l.nome,
      tipo: l.tipo,
      saldo_atual: Number(l.saldo_atual),
      juros_aa: l.juros_aa != null ? Number(l.juros_aa) : null,
      parcela_mensal: Number(l.parcela_mensal),
      idade_inicio: l.idade_inicio,
      idade_fim: l.idade_fim,
    })),
  };

  return { ok: true, step: c.onboarding_step ?? 1, payload };
}

/**
 * Marca o rascunho como completo (onboarding_step = NULL). Garante
 * que o último estado seja salvo antes.
 */
export async function finalizeOnboarding(args: {
  client_id: string;
  payload: OnboardingPayload;
}): Promise<{ ok: true; client_id: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  await getUserId();
  const saveRes = await saveOnboardingDraft({
    client_id: args.client_id,
    step: 6,
    payload: args.payload,
  });
  if (!saveRes.ok) return saveRes;
  const { error } = await supabase
    .from('clients')
    .update({ onboarding_step: null })
    .eq('id', args.client_id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/clients');
  revalidatePath(`/clients/${args.client_id}`);
  return { ok: true, client_id: args.client_id };
}

export async function listDraftClients(): Promise<
  { id: string; nome: string; step: number; updated_at: string }[]
> {
  const supabase = await createClient();
  const userId = await getUserId();
  const { data } = await supabase
    .from('clients')
    .select('id, nome_completo, onboarding_step, updated_at')
    .eq('consultant_id', userId)
    .not('onboarding_step', 'is', null)
    .order('updated_at', { ascending: false });
  return (data ?? []).map((c) => ({
    id: c.id,
    nome: c.nome_completo,
    step: c.onboarding_step,
    updated_at: c.updated_at,
  }));
}

/** Descarta um rascunho (hard delete completo). */
export async function discardDraft(client_id: string): Promise<void> {
  const supabase = await createClient();
  await getUserId();
  await supabase.from('clients').delete().eq('id', client_id).not('onboarding_step', 'is', null);
  revalidatePath('/clients');
}

// ─── Sincroniza items (replace) ───

async function syncItems(client_id: string, payload: OnboardingPayload, hardDelete = false) {
  const supabase = await createClient();
  const del = (table: string) =>
    hardDelete
      ? supabase.from(table).delete().eq('client_id', client_id)
      : supabase
          .from(table)
          .update({ deleted_at: new Date().toISOString() })
          .eq('client_id', client_id)
          .is('deleted_at', null);

  await Promise.all([del('assets'), del('expenses'), del('events'), del('liabilities')]);

  if (payload.assets.length > 0) {
    await supabase.from('assets').insert(
      payload.assets.map((a) => ({
        client_id,
        nome: a.nome,
        tipo: a.tipo,
        natureza: a.natureza,
        valor: a.valor,
        idade_inicio: a.idade_inicio,
        idade_fim: a.idade_fim,
        indexado_inflacao: a.indexado_inflacao,
      })),
    );
  }
  if (payload.expenses.length > 0) {
    await supabase.from('expenses').insert(
      payload.expenses.map((d) => ({
        client_id,
        categoria: d.categoria,
        descricao: d.descricao,
        valor_mensal: d.valor_mensal,
        idade_inicio: d.idade_inicio,
        idade_fim: d.idade_fim,
        indexado_inflacao: true,
        essencial: d.essencial,
      })),
    );
  }
  if (payload.events.length > 0) {
    await supabase.from('events').insert(
      payload.events.map((ev) => ({
        client_id,
        tipo: ev.tipo,
        descricao: ev.descricao,
        valor: ev.valor,
        padrao_recorrencia: ev.padrao_recorrencia,
        idade_inicio: ev.idade_inicio,
        idade_fim: ev.idade_fim,
        intervalo_anos: ev.intervalo_anos,
        indexado_inflacao: ev.indexado_inflacao,
      })),
    );
  }
  if (payload.liabilities.length > 0) {
    await supabase.from('liabilities').insert(
      payload.liabilities.map((l) => ({
        client_id,
        nome: l.nome,
        tipo: l.tipo,
        saldo_atual: l.saldo_atual,
        juros_aa: l.juros_aa,
        parcela_mensal: l.parcela_mensal,
        idade_inicio: l.idade_inicio,
        idade_fim: l.idade_fim,
      })),
    );
  }
}
