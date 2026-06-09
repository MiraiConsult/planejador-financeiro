'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  type Centro, type TipoVisual, getTemplate, TIPO_LEGADO_DEFAULTS,
} from '@/lib/controle-mensal/centros';

export interface CentroResult {
  ok: boolean;
  centro?: Centro;
  erro?: string;
}

interface OkErr { ok: boolean; erro?: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checarPosse(supabase: any, clientId: string): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'Não autenticado.';
  const { data: cli } = await supabase.from('clients').select('id').eq('id', clientId).single();
  if (!cli) return 'Cliente não encontrado ou sem acesso.';
  return null;
}

function revalidar(clientId: string): void {
  revalidatePath(`/clients/${clientId}/controle-mensal`);
  revalidatePath(`/clients/${clientId}/controle-mensal/centros`);
}

/** Lista todos os centros do cliente (ativos e inativos). */
export async function listarCentros(clientId: string): Promise<Centro[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('controle_mensal_centros')
    .select('*')
    .eq('client_id', clientId)
    .order('ordem', { ascending: true });
  return (data ?? []) as Centro[];
}

export interface CentroInput {
  nome: string;
  parent_id: string | null;
  tipo_visual: TipoVisual;
  tem_demonstrativo: boolean;
  cor: string;
  icone: string;
  ordem?: number;
}

export async function criarCentro(clientId: string, dados: CentroInput): Promise<CentroResult> {
  const nome = dados.nome.trim();
  if (!nome) return { ok: false, erro: 'Nome é obrigatório.' };
  const supabase = await createClient();
  const err = await checarPosse(supabase, clientId);
  if (err) return { ok: false, erro: err };

  let ordem = dados.ordem;
  if (ordem == null) {
    // Próxima ordem = max + 1 dentro do mesmo nível (mesmo parent_id)
    const { data: irmaos } = await supabase
      .from('controle_mensal_centros')
      .select('ordem')
      .eq('client_id', clientId)
      .is('parent_id', dados.parent_id ?? null)
      .order('ordem', { ascending: false })
      .limit(1);
    ordem = ((irmaos?.[0]?.ordem as number) ?? -1) + 1;
  }

  const { data, error } = await supabase
    .from('controle_mensal_centros')
    .insert({
      client_id: clientId,
      parent_id: dados.parent_id,
      nome,
      tipo_visual: dados.tipo_visual,
      tem_demonstrativo: dados.tem_demonstrativo,
      cor: dados.cor,
      icone: dados.icone,
      ordem,
    })
    .select('*')
    .single();
  if (error) return { ok: false, erro: error.message };

  revalidar(clientId);
  return { ok: true, centro: data as Centro };
}

export async function atualizarCentro(
  clientId: string,
  centroId: string,
  dados: Partial<CentroInput> & { ativo?: boolean },
): Promise<OkErr> {
  const supabase = await createClient();
  const err = await checarPosse(supabase, clientId);
  if (err) return { ok: false, erro: err };

  const patch: Record<string, unknown> = {};
  for (const k of ['nome', 'parent_id', 'tipo_visual', 'tem_demonstrativo', 'cor', 'icone', 'ordem', 'ativo'] as const) {
    if (dados[k] !== undefined) patch[k] = dados[k];
  }
  if (typeof patch.nome === 'string') {
    patch.nome = (patch.nome as string).trim();
    if (!patch.nome) return { ok: false, erro: 'Nome é obrigatório.' };
  }
  // Não deixa um centro ser filho dele mesmo (defesa simples)
  if (patch.parent_id === centroId) {
    return { ok: false, erro: 'Centro não pode ser pai dele mesmo.' };
  }

  const { error } = await supabase
    .from('controle_mensal_centros')
    .update(patch)
    .eq('id', centroId)
    .eq('client_id', clientId);
  if (error) return { ok: false, erro: error.message };

  revalidar(clientId);
  return { ok: true };
}

/** Exclui um centro. Hard delete se sem lançamentos, senão soft (ativo=false). */
export async function excluirCentro(clientId: string, centroId: string): Promise<OkErr> {
  const supabase = await createClient();
  const err = await checarPosse(supabase, clientId);
  if (err) return { ok: false, erro: err };

  const { count } = await supabase
    .from('controle_mensal_lancamentos')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('centro_id', centroId);

  if ((count ?? 0) > 0) {
    const { error } = await supabase
      .from('controle_mensal_centros')
      .update({ ativo: false })
      .eq('id', centroId)
      .eq('client_id', clientId);
    if (error) return { ok: false, erro: error.message };
  } else {
    const { error } = await supabase
      .from('controle_mensal_centros')
      .delete()
      .eq('id', centroId)
      .eq('client_id', clientId);
    if (error) return { ok: false, erro: error.message };
  }

  revalidar(clientId);
  return { ok: true };
}

export async function reordenarCentros(clientId: string, ids: string[]): Promise<OkErr> {
  const supabase = await createClient();
  const err = await checarPosse(supabase, clientId);
  if (err) return { ok: false, erro: err };

  // Aplica ordens em sequência. Não usa upsert pra não tocar em outros campos.
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (!id) continue;
    await supabase
      .from('controle_mensal_centros')
      .update({ ordem: i })
      .eq('id', id)
      .eq('client_id', clientId);
  }

  revalidar(clientId);
  return { ok: true };
}

/** Aplica um template pré-pronto. Cria centros novos sem mexer nos existentes. */
export async function aplicarTemplate(clientId: string, templateId: string): Promise<OkErr> {
  const tpl = getTemplate(templateId);
  if (!tpl) return { ok: false, erro: 'Template não encontrado.' };
  const supabase = await createClient();
  const err = await checarPosse(supabase, clientId);
  if (err) return { ok: false, erro: err };

  // Calcula ordem inicial = max+1 entre os centros existentes (raiz)
  const { data: raizesExistentes } = await supabase
    .from('controle_mensal_centros')
    .select('ordem')
    .eq('client_id', clientId)
    .is('parent_id', null);
  let proxOrdem = ((raizesExistentes ?? [])
    .map((r) => (r.ordem as number) ?? 0)
    .reduce((max, v) => Math.max(max, v), -1)) + 1;

  // Insere em DFS, propagando o parent_id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function inserir(node: any, parentId: string | null, ordem: number): Promise<string | null> {
    const { data } = await supabase
      .from('controle_mensal_centros')
      .insert({
        client_id: clientId,
        parent_id: parentId,
        nome: node.nome,
        tipo_visual: node.tipo_visual,
        tem_demonstrativo: node.tem_demonstrativo ?? false,
        cor: node.cor,
        icone: node.icone,
        ordem,
      })
      .select('id')
      .single();
    const id = (data?.id as string | undefined) ?? null;
    if (id && Array.isArray(node.filhos)) {
      for (let i = 0; i < node.filhos.length; i++) {
        await inserir(node.filhos[i], id, i);
      }
    }
    return id;
  }

  for (const raiz of tpl.centros) {
    await inserir(raiz, null, proxOrdem++);
  }

  revalidar(clientId);
  return { ok: true };
}

/**
 * Auto-backfill: se o cliente ainda não tem centros configurados,
 * cria um pra cada `tipo` distinto encontrado nos lançamentos e
 * preenche `centro_id` + `eh_receita` em todos os lançamentos.
 *
 * Idempotente: roda apenas quando não há centros, ou quando há
 * lançamentos com centro_id nulo (preenche os que faltam).
 */
export async function garantirCentros(clientId: string): Promise<OkErr> {
  const supabase = await createClient();
  const err = await checarPosse(supabase, clientId);
  if (err) return { ok: false, erro: err };

  const { data: existentes } = await supabase
    .from('controle_mensal_centros')
    .select('id, nome')
    .eq('client_id', clientId);

  // Lança rows pra ver quais tipos distintos existem
  const { data: rows } = await supabase
    .from('controle_mensal_lancamentos')
    .select('id, tipo, centro_id, valor, eh_receita')
    .eq('client_id', clientId);
  const lancamentos = (rows ?? []) as Array<{
    id: string; tipo: string; centro_id: string | null; valor: number; eh_receita: boolean | null;
  }>;

  // 1. Criar centros que ainda não existem.
  // Estratégia: pra cada tipo distinto, garante um centro (usa
  // TIPO_LEGADO_DEFAULTS se conhecido; senão cria genérico capitalizando o nome).
  const nomesExistentes = new Set((existentes ?? []).map((c) => (c.nome as string).toLowerCase()));
  const tiposNovos: Array<{ tipo: string; nome: string; def: { nome: string; tipo_visual: 'pessoa'|'empresa'|'projeto'|'grupo'|'outro'; cor: string; icone: string; tem_demonstrativo?: boolean } }> = [];
  const tiposVistos = new Set<string>();
  for (const l of lancamentos) {
    const t = (l.tipo ?? '').toLowerCase();
    if (t === 'receita' || !t || tiposVistos.has(t)) continue;
    tiposVistos.add(t);
    const def = TIPO_LEGADO_DEFAULTS[t]
      ?? { nome: capitalize(t), tipo_visual: 'outro' as const, cor: '#475569', icone: 'Tag' };
    if (!nomesExistentes.has(def.nome.toLowerCase())) {
      tiposNovos.push({ tipo: t, nome: def.nome, def });
    }
  }

  const tipoParaCentroId = new Map<string, string>();
  for (const c of existentes ?? []) {
    // Bate por nome com os defaults conhecidos
    const tipoConhecido = Object.entries(TIPO_LEGADO_DEFAULTS).find(
      ([, def]) => def.nome.toLowerCase() === (c.nome as string).toLowerCase(),
    )?.[0];
    if (tipoConhecido) tipoParaCentroId.set(tipoConhecido, c.id as string);
    // Também mapeia pelo nome do centro normalizado (cobre tipos custom)
    tipoParaCentroId.set((c.nome as string).toLowerCase(), c.id as string);
  }

  let ordemInicial = (existentes ?? []).length;
  for (const novo of tiposNovos) {
    const { data } = await supabase
      .from('controle_mensal_centros')
      .insert({
        client_id: clientId,
        parent_id: null,
        nome: novo.def.nome,
        tipo_visual: novo.def.tipo_visual,
        tem_demonstrativo: novo.def.tem_demonstrativo ?? false,
        cor: novo.def.cor,
        icone: novo.def.icone,
        ordem: ordemInicial++,
      })
      .select('id')
      .single();
    if (data?.id) tipoParaCentroId.set(novo.tipo, data.id as string);
  }

  // 2. Atualizar centro_id + eh_receita nos lançamentos que ainda não têm
  // Receita: vai pro centro do tipo se houver vínculo natural; senão fica
  // no centro do tipo "principal" (pessoal). Eh_receita = true.
  // Pra receita Nexlex (is_nexlex=true), tenta colocar no centro "Mirai".
  const { data: rowsCompleto } = await supabase
    .from('controle_mensal_lancamentos')
    .select('id, tipo, centro_id, valor, eh_receita, is_nexlex')
    .eq('client_id', clientId);
  const completos = (rowsCompleto ?? []) as Array<{
    id: string; tipo: string; centro_id: string | null; valor: number;
    eh_receita: boolean | null; is_nexlex: boolean;
  }>;

  const pessoalId = tipoParaCentroId.get('pessoal') ?? null;
  const miraiId   = tipoParaCentroId.get('mirai')   ?? pessoalId;

  const pendentes = completos.filter((l) => l.centro_id == null || l.eh_receita == null);
  if (pendentes.length > 0) {
    // Agrupa lançamentos por (centro_id, eh_receita) destino e faz 1 UPDATE
    // por grupo com WHERE id IN (...) — evita 340 round-trips sequenciais.
    const grupos = new Map<string, { centroId: string | null; ehReceita: boolean; ids: string[] }>();
    for (const l of pendentes) {
      const tipo = (l.tipo ?? '').toLowerCase();
      let centroId: string | null = l.centro_id;
      let ehReceita: boolean = l.eh_receita ?? false;
      if (tipo === 'receita') {
        ehReceita = true;
        centroId = centroId ?? (l.is_nexlex ? miraiId : pessoalId);
      } else {
        ehReceita = false;
        centroId = centroId ?? (tipoParaCentroId.get(tipo) ?? null);
      }
      const k = `${centroId ?? 'null'}|${ehReceita ? 1 : 0}`;
      if (!grupos.has(k)) grupos.set(k, { centroId, ehReceita, ids: [] });
      grupos.get(k)!.ids.push(l.id);
    }
    for (const g of grupos.values()) {
      await supabase
        .from('controle_mensal_lancamentos')
        .update({ centro_id: g.centroId, eh_receita: g.ehReceita })
        .in('id', g.ids)
        .eq('client_id', clientId);
    }
  }

  // NÃO chama revalidar() aqui: garantirCentros é chamada de dentro do
  // page.tsx (durante render). revalidatePath na mesma rota durante render
  // dispara loop de execução. Quem chama faz re-query manual depois.
  return { ok: true };
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
