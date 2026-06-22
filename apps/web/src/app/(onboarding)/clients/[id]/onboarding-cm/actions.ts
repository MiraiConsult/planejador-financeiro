'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { DraftCategoria, DraftLancamentoInicial } from './types';

async function ensureOwner(client_id: string): Promise<{ supabase: Awaited<ReturnType<typeof createClient>>; user_id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Não autenticado' };
  const { data: c } = await supabase
    .from('clients')
    .select('id')
    .eq('id', client_id)
    .maybeSingle();
  if (!c) return { error: 'Cliente não encontrado' };
  return { supabase, user_id: user.id };
}

export async function setStepCM(args: {
  client_id: string;
  step: number;
}): Promise<{ ok: boolean; error?: string }> {
  const guard = await ensureOwner(args.client_id);
  if ('error' in guard) return { ok: false, error: guard.error };
  const { error } = await guard.supabase
    .from('clients')
    .update({ onboarding_step_cm: args.step })
    .eq('id', args.client_id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/clients');
  return { ok: true };
}

export async function salvarCategorias(args: {
  client_id: string;
  categorias: DraftCategoria[];
}): Promise<{ ok: boolean; error?: string; mapaIds?: Record<string, string> }> {
  const guard = await ensureOwner(args.client_id);
  if ('error' in guard) return { ok: false, error: guard.error };
  const supabase = guard.supabase;

  // Substituição completa: deleta as existentes pra evitar duplicação.
  // (Onboarding ainda em andamento — nenhum lançamento foi criado ainda.)
  await supabase
    .from('controle_mensal_categorias')
    .delete()
    .eq('client_id', args.client_id);

  if (args.categorias.length === 0) return { ok: true, mapaIds: {} };

  // Insere raízes primeiro pra resolver parent_id
  const raizes = args.categorias.filter((c) => !c.parentTempId);
  const filhas = args.categorias.filter((c) => c.parentTempId);

  const mapaIds: Record<string, string> = {};

  for (let i = 0; i < raizes.length; i++) {
    const c = raizes[i]!;
    const { data, error } = await supabase
      .from('controle_mensal_categorias')
      .insert({
        client_id: args.client_id,
        nome: c.nome.trim(),
        tipo: c.tipo === 'receita' ? 'receita' : 'despesa',
        cor: c.cor,
        icone: c.icone,
        ordem: i,
        parent_id: null,
      })
      .select('id')
      .single();
    if (error || !data) return { ok: false, error: error?.message ?? 'falha' };
    mapaIds[c.tempId] = data.id;
  }

  for (let i = 0; i < filhas.length; i++) {
    const c = filhas[i]!;
    const parent_id = c.parentTempId ? mapaIds[c.parentTempId] : null;
    const { data, error } = await supabase
      .from('controle_mensal_categorias')
      .insert({
        client_id: args.client_id,
        nome: c.nome.trim(),
        tipo: c.tipo === 'receita' ? 'receita' : 'despesa',
        cor: c.cor,
        icone: c.icone,
        ordem: i,
        parent_id,
      })
      .select('id')
      .single();
    if (error || !data) return { ok: false, error: error?.message ?? 'falha' };
    mapaIds[c.tempId] = data.id;
  }

  return { ok: true, mapaIds };
}

function competenciaFromData(data: string): { mes: string; mes_num: number; ano: number; competencia: number } {
  const d = new Date(data);
  const ano = d.getUTCFullYear();
  const mes_num = d.getUTCMonth() + 1;
  const meses = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
  ];
  return { mes: meses[mes_num - 1]!, mes_num, ano, competencia: ano * 100 + mes_num };
}

function hashLancamento(client_id: string, l: { data: string; descricao: string; valor: number }): string {
  const raw = `${client_id}|${l.data}|${l.descricao.trim().toLowerCase()}|${l.valor.toFixed(2)}`;
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = ((h << 5) - h + raw.charCodeAt(i)) | 0;
  }
  return `cm-onb-${h >>> 0}-${Date.now().toString(36)}`;
}

export async function salvarLancamentosIniciais(args: {
  client_id: string;
  lancamentos: DraftLancamentoInicial[];
  mapaCategoriasIds?: Record<string, string>;
}): Promise<{ ok: boolean; error?: string; inseridos?: number }> {
  const guard = await ensureOwner(args.client_id);
  if ('error' in guard) return { ok: false, error: guard.error };
  if (args.lancamentos.length === 0) return { ok: true, inseridos: 0 };

  const supabase = guard.supabase;

  // Buscar centros do cliente — escolhe o primeiro como default
  const { data: centros } = await supabase
    .from('controle_mensal_centros')
    .select('id, nome')
    .eq('client_id', args.client_id)
    .order('ordem', { ascending: true })
    .limit(1);
  const centroDefault = centros?.[0]?.id ?? null;

  const rows = args.lancamentos
    .filter((l) => l.descricao.trim() && l.valor !== 0)
    .map((l) => {
      const comp = competenciaFromData(l.data);
      const valorSign = l.eh_receita ? Math.abs(l.valor) : -Math.abs(l.valor);
      const categoria_id = l.categoria_tempId
        ? args.mapaCategoriasIds?.[l.categoria_tempId] ?? null
        : null;
      return {
        client_id: args.client_id,
        data: l.data,
        descricao: l.descricao.trim(),
        valor: valorSign,
        categoria: null,
        subcategoria: null,
        categoria_id,
        mes: comp.mes,
        mes_num: comp.mes_num,
        ano: comp.ano,
        competencia: comp.competencia,
        tipo: l.eh_receita ? 'receita' : 'pessoal',
        eh_receita: l.eh_receita,
        centro_id: l.centro_id ?? centroDefault,
        hash: hashLancamento(args.client_id, { data: l.data, descricao: l.descricao, valor: valorSign }),
      };
    });

  if (rows.length === 0) return { ok: true, inseridos: 0 };

  const { error, count } = await supabase
    .from('controle_mensal_lancamentos')
    .insert(rows, { count: 'exact' });
  if (error) return { ok: false, error: error.message };

  return { ok: true, inseridos: count ?? rows.length };
}

export async function finalizarOnboardingCM(client_id: string): Promise<{ ok: boolean; error?: string }> {
  const guard = await ensureOwner(client_id);
  if ('error' in guard) return { ok: false, error: guard.error };
  const { error } = await guard.supabase
    .from('clients')
    .update({ onboarding_step_cm: null })
    .eq('id', client_id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/clients');
  revalidatePath(`/clients/${client_id}/controle-mensal`);
  return { ok: true };
}

export async function redirectAfterFinish(client_id: string): Promise<never> {
  redirect(`/clients/${client_id}/controle-mensal`);
}

// ─── Cruzamento BP → CM: sugere categorias derivadas das despesas do plano ──

const HINT_PALETA: Array<{ termos: string[]; cor: string; icone: string }> = [
  { termos: ['aliment', 'mercad', 'feira', 'restaurant', 'comida'], cor: '#10b981', icone: 'Utensils' },
  { termos: ['morad', 'aluguel', 'condom', 'casa', 'iptu'], cor: '#0ea5e9', icone: 'Home' },
  { termos: ['saúd', 'saude', 'plano', 'médic', 'medic', 'farmac'], cor: '#ef4444', icone: 'Heart' },
  { termos: ['transp', 'combust', 'uber', 'taxi', 'gasolina', 'estacion'], cor: '#f59e0b', icone: 'Car' },
  { termos: ['educ', 'escola', 'cursos', 'faculd', 'mensalid'], cor: '#8b5cf6', icone: 'GraduationCap' },
  { termos: ['lazer', 'viagem', 'cinema', 'streaming', 'netflix'], cor: '#ec4899', icone: 'Smile' },
  { termos: ['vest', 'roupa', 'beleza', 'estética'], cor: '#d946ef', icone: 'Shirt' },
  { termos: ['filho', 'crianç', 'criança', 'depend'], cor: '#fb7185', icone: 'Baby' },
  { termos: ['imposto', 'tribut', 'taxa', 'tarifa'], cor: '#475569', icone: 'Landmark' },
];

function paletaPara(nome: string): { cor: string; icone: string } {
  const n = nome.toLowerCase();
  for (const hint of HINT_PALETA) {
    if (hint.termos.some((t) => n.includes(t))) return { cor: hint.cor, icone: hint.icone };
  }
  return { cor: '#64748b', icone: 'Tag' };
}

export async function sugerirCategoriasDoBP(client_id: string): Promise<{
  ok: boolean;
  error?: string;
  categorias?: { nome: string; tipo: 'gasto'; cor: string; icone: string }[];
}> {
  const guard = await ensureOwner(client_id);
  if ('error' in guard) return { ok: false, error: guard.error };
  const { data } = await guard.supabase
    .from('expenses')
    .select('categoria')
    .eq('client_id', client_id)
    .is('deleted_at', null);

  const nomes = new Set<string>();
  for (const r of data ?? []) {
    const cat = (r.categoria as string | null)?.trim();
    if (cat) nomes.add(cat);
  }

  const categorias = [...nomes]
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
    .map((nome) => ({ nome, tipo: 'gasto' as const, ...paletaPara(nome) }));

  return { ok: true, categorias };
}

// ─── Importação CSV ───────────────────────────────────────────────────

interface ParsedRow {
  data: string;
  descricao: string;
  valor: number;
  categoria?: string;
}

export async function importarCsvOnboarding(args: {
  client_id: string;
  rows: ParsedRow[];
}): Promise<{ ok: boolean; error?: string; inseridos?: number }> {
  const guard = await ensureOwner(args.client_id);
  if ('error' in guard) return { ok: false, error: guard.error };
  if (args.rows.length === 0) return { ok: true, inseridos: 0 };

  const supabase = guard.supabase;

  const { data: centros } = await supabase
    .from('controle_mensal_centros')
    .select('id')
    .eq('client_id', args.client_id)
    .order('ordem', { ascending: true })
    .limit(1);
  const centroDefault = centros?.[0]?.id ?? null;

  const rows = args.rows
    .filter((r) => r.descricao.trim() && !Number.isNaN(r.valor) && r.valor !== 0)
    .map((r) => {
      const comp = competenciaFromData(r.data);
      const eh_receita = r.valor > 0;
      return {
        client_id: args.client_id,
        data: r.data,
        descricao: r.descricao.trim(),
        valor: r.valor,
        categoria: r.categoria?.trim() || null,
        subcategoria: null,
        mes: comp.mes,
        mes_num: comp.mes_num,
        ano: comp.ano,
        competencia: comp.competencia,
        tipo: eh_receita ? 'receita' : 'pessoal',
        eh_receita,
        centro_id: centroDefault,
        hash: hashLancamento(args.client_id, { data: r.data, descricao: r.descricao, valor: r.valor }),
      };
    });

  if (rows.length === 0) return { ok: true, inseridos: 0 };

  // Insere ignorando duplicatas (unique constraint em client_id+hash)
  const { error, count } = await supabase
    .from('controle_mensal_lancamentos')
    .upsert(rows, { onConflict: 'client_id,hash', ignoreDuplicates: true, count: 'exact' });
  if (error) return { ok: false, error: error.message };

  return { ok: true, inseridos: count ?? rows.length };
}
