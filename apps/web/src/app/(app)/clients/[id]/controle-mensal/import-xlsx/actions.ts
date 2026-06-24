'use server';

import { revalidatePath } from 'next/cache';
import { createHash } from 'node:crypto';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/server';

type LancRow = {
  data: string;             // ISO yyyy-mm-dd
  valor: number;
  descricao: string;
  rub_cod: number | null;   // código numérico da rubrica (col Rubr)
  rub_nome: string | null;  // nome da rubrica do XLSX (col Descrição Rúbrica)
  bco: number | string | null;
  mes_num: number;
  ano: number;
};

// Padrão de hash IGUAL ao update SQL feito no banco:
// sha256(data|valor|descricao|rubrica_id_ou_vazio)
function lancHash(args: { data: string; valor: number; descricao: string; rubrica_id: string | null }): string {
  const valorStr = args.valor.toFixed(2); // 1234.50
  const payload = `${args.data}|${valorStr}|${args.descricao}|${args.rubrica_id ?? ''}`;
  return createHash('sha256').update(payload).digest('hex');
}

const BANCO_MAP: Record<number, string> = {
  1: 'Banco do Brasil',
  6: 'Itaú',
  29: 'C6',
  104: 'Itaú MO',
  5: 'Prática',
  50: 'Prática',
};

const MESES_PT = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

interface ImportResult {
  ok: boolean;
  error?: string;
  inseridos?: number;
  duplicados?: number;
  ignorados?: number;
  total_lidos?: number;
}

export async function importarLancamentosXLSX(formData: FormData): Promise<ImportResult> {
  const file = formData.get('file') as File | null;
  const client_id = formData.get('client_id') as string | null;
  if (!file || !client_id) return { ok: false, error: 'Arquivo e cliente obrigatórios' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Não autenticado' };

  // Lê o arquivo
  const buf = Buffer.from(await file.arrayBuffer());
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
  } catch (e) {
    return { ok: false, error: `Falha ao abrir XLSX: ${e instanceof Error ? e.message : String(e)}` };
  }

  // Coleta linhas de TODAS as abas que tenham as colunas esperadas
  const rows: LancRow[] = [];
  let ignorados = 0;
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      raw: true,
      defval: null,
    });
    for (const r of json) {
      // Aceita os 2 layouts: com coluna "Mês" (Pasta1) ou sem (planilhas Jan-Dez)
      const dataRaw = r['Data'] ?? r['data'];
      const valor = r['Valor'] ?? r['valor'];
      if (dataRaw == null || valor == null || typeof valor !== 'number' || valor === 0) {
        ignorados++;
        continue;
      }
      let data: Date | null = null;
      if (dataRaw instanceof Date) data = dataRaw;
      else if (typeof dataRaw === 'number') {
        // Excel serial date
        data = XLSX.SSF.parse_date_code(dataRaw) as unknown as Date | null;
      }
      if (!(data instanceof Date) || isNaN(data.getTime())) {
        ignorados++;
        continue;
      }
      const hist = (r['Histórico'] ?? r['historico'] ?? '') as string | null;
      const rubDesc = (r['Descrição Rúbrica'] ?? r['descricao_rubrica'] ?? '') as string | null;
      const rubCod = r['Rubr'] ?? r['rubr'] ?? r['rubrica'];
      const bco = r['Bco'] ?? r['bco'];
      const ds: string[] = [];
      if (hist && String(hist).trim()) ds.push(String(hist).trim());
      if (rubDesc && String(rubDesc).trim() && String(rubDesc).trim() !== 'CADASTRAR RÚBRICA') {
        ds.push(String(rubDesc).trim());
      }
      const descricao = ds.join(' · ') || 'Sem descrição';
      rows.push({
        data: data.toISOString().slice(0, 10),
        valor: Number(valor),
        descricao: descricao.slice(0, 500),
        rub_cod: typeof rubCod === 'number' ? rubCod : null,
        rub_nome: rubDesc && rubDesc !== 'CADASTRAR RÚBRICA' ? String(rubDesc).trim() : null,
        bco: (typeof bco === 'number' || typeof bco === 'string') ? bco : null,
        mes_num: data.getUTCMonth() + 1,
        ano: data.getUTCFullYear(),
      });
    }
  }

  if (rows.length === 0) {
    return { ok: true, total_lidos: 0, inseridos: 0, duplicados: 0, ignorados };
  }

  // Carrega categorias/rubricas existentes pra resolver mapping
  const { data: cats } = await supabase
    .from('controle_mensal_categorias')
    .select('id, nome, parent_id, tipo')
    .eq('client_id', client_id)
    .eq('ativo', true);
  const catList = cats ?? [];
  // Mapa: nome (case-insensitive, trim) → categoria
  const byNome = new Map<string, { id: string; parent_id: string | null; tipo: string }>();
  for (const c of catList) {
    byNome.set(String(c.nome).trim().toUpperCase(), {
      id: c.id as string,
      parent_id: (c.parent_id as string | null) ?? null,
      tipo: c.tipo as string,
    });
  }
  // Pega centro default (primeiro) — XLSX é "Pessoal" por convenção
  const { data: centros } = await supabase
    .from('controle_mensal_centros')
    .select('id, nome, ordem')
    .eq('client_id', client_id)
    .eq('ativo', true)
    .order('ordem')
    .limit(1);
  const centroId = centros?.[0]?.id as string | undefined;
  if (!centroId) return { ok: false, error: 'Crie pelo menos 1 centro antes de importar.' };

  // Resolve rubrica + categoria de cada linha (sem criar categorias novas — só usa as existentes
  // por nome). Se a rubrica do XLSX não existe, fica sem categoria/rubrica (texto livre).
  type ResolvedRow = LancRow & { rubrica_id: string | null; categoria_id: string | null; categoria_nome: string | null; subcategoria_nome: string | null };
  const resolved: ResolvedRow[] = rows.map((r) => {
    let rubrica_id: string | null = null;
    let categoria_id: string | null = null;
    let categoria_nome: string | null = null;
    let subcategoria_nome: string | null = null;
    if (r.rub_nome) {
      const rub = byNome.get(r.rub_nome.toUpperCase());
      if (rub && rub.parent_id) {
        rubrica_id = rub.id;
        categoria_id = rub.parent_id;
        subcategoria_nome = r.rub_nome;
        const parent = catList.find((c) => c.id === rub.parent_id);
        if (parent) categoria_nome = String(parent.nome);
      } else if (rub) {
        // Match com macro (sem parent) — vira só categoria
        categoria_id = rub.id;
        categoria_nome = r.rub_nome;
      }
    }
    return { ...r, rubrica_id, categoria_id, categoria_nome, subcategoria_nome };
  });

  // Monta payload pra bulk insert com ON CONFLICT DO NOTHING (via INSERT ... ON CONFLICT)
  // Como o supabase-js não tem ON CONFLICT IGNORE direto pra unique custom, uso upsert
  // com onConflict='client_id,hash' e ignoreDuplicates=true.
  const payload = resolved.map((r) => ({
    client_id,
    data: r.data,
    descricao: r.descricao,
    valor: r.valor,
    categoria: r.categoria_nome,
    subcategoria: r.subcategoria_nome,
    mes: MESES_PT[r.mes_num],
    mes_num: r.mes_num,
    ano: r.ano,
    competencia: r.ano * 100 + r.mes_num,
    tipo: 'pessoal',
    origem: typeof r.bco === 'number' ? (BANCO_MAP[r.bco] ?? null) : (r.bco != null ? String(r.bco) : null),
    eh_receita: r.valor > 0,
    centro_id: centroId,
    categoria_id: r.categoria_id,
    rubrica_id: r.rubrica_id,
    revisado: true,
    is_nexlex: false,
    eh_pagamento_fatura: false,
    hash: lancHash({ data: r.data, valor: r.valor, descricao: r.descricao, rubrica_id: r.rubrica_id }),
  }));

  // Insere em batches de 500 com upsert ignoreDuplicates
  let inseridos = 0;
  const CHUNK = 500;
  for (let i = 0; i < payload.length; i += CHUNK) {
    const slice = payload.slice(i, i + CHUNK);
    const { data: ret, error } = await supabase
      .from('controle_mensal_lancamentos')
      .upsert(slice, { onConflict: 'client_id,hash', ignoreDuplicates: true })
      .select('id');
    if (error) return { ok: false, error: error.message, total_lidos: rows.length, inseridos };
    inseridos += ret?.length ?? 0;
  }
  const duplicados = payload.length - inseridos;

  revalidatePath(`/clients/${client_id}/controle-mensal`);
  revalidatePath(`/clients/${client_id}/controle-mensal/lancamentos`);
  return { ok: true, total_lidos: rows.length, inseridos, duplicados, ignorados };
}
