// Leitura/validação/normalização de um CSV de lançamentos (porte de backend/importer.py).
// Roda server-side (Server Action) — usa node:crypto para o hash de idempotência.
import { createHash } from 'node:crypto';
import * as rules from './rules';
import { parseValor, parseData } from './valores';

// Reexporta as funções puras pra manter a API antiga (importadores existentes).
export { parseValor, parseData };

export interface LancamentoInput {
  data: string;
  descricao: string;
  valor: number;
  categoria: string;
  subcategoria: string;
  mes: string;
  mes_num: number;
  ano: number | null;
  competencia: number;
  tipo: string;
  centro_id?: string | null;
  eh_receita?: boolean;
  origem: string;
  cliente_obs: string;
  viagem: string | null;
  sistema: string | null;
  is_nexlex: boolean;
  hash: string;
}

const COLUNAS = [
  'Data', 'Descrição', 'Valor', 'Categoria', 'Subcategoria',
  'Mês', 'Tipo', 'Origem', 'Cliente/Obs',
] as const;

const CANON: Record<string, string> = {
  'data': 'Data',
  'descricao': 'Descrição', 'historico': 'Descrição',
  'valor': 'Valor', 'valor (r$)': 'Valor',
  'categoria': 'Categoria', 'subcategoria': 'Subcategoria',
  'mes': 'Mês', 'competencia': 'Mês',
  'tipo': 'Tipo',
  'origem': 'Origem', 'forma de pagamento': 'Origem',
  'cliente/obs': 'Cliente/Obs', 'cliente': 'Cliente/Obs', 'obs': 'Cliente/Obs',
  'cliente_obs': 'Cliente/Obs', 'observacao': 'Cliente/Obs',
};

function normCol(c: string): string {
  return rules.stripAccents(String(c)).trim().toLowerCase();
}

function detectDelim(headerLine: string): string {
  return headerLine.includes(';') ? ';' : ',';
}

/** Parser CSV simples com suporte a aspas duplas e separador ; ou , . */
function parseCsv(text: string): string[][] {
  const clean = text.replace(new RegExp('^\\uFEFF'), '');
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? '';
  const delim = detectDelim(firstLine);
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      row.push(field); field = '';
    } else if (ch === '\n') {
      row.push(field); rows.push(row); row = []; field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/** Campos brutos de um lançamento (vindos do CSV ou do form manual). */
export interface RawLancamento {
  data: string;
  descricao: string;
  valor: number;
  categoria: string;
  subcategoria: string;
  mes: string;
  tipo: string;
  origem: string;
  cliente_obs: string;
  centro_id?: string | null;
  eh_receita?: boolean;
}

/**
 * Normaliza um lançamento bruto e deriva os campos calculados
 * (competência, viagem, sistema, is_nexlex). Compartilhado entre o
 * importador de CSV e o lançamento manual — fonte única da derivação.
 * NÃO calcula o hash (estratégia difere: CSV = conteúdo; manual = uuid).
 */
export function derivarCampos(raw: RawLancamento): Omit<LancamentoInput, 'hash'> {
  const data = parseData(raw.data);
  const mes = raw.mes;
  const mNum = rules.mesNum(mes);
  const ano = rules.competenciaAno(data, mNum);
  const tipo = String(raw.tipo).toLowerCase();
  const categoria = raw.categoria;
  const subcat = raw.subcategoria;
  const desc = raw.descricao;

  const viagem = tipo === 'viagem' ? rules.derivarViagem(subcat, desc) : null;
  const sistema =
    tipo === 'mirai' && categoria.toLowerCase().includes('saas')
      ? rules.normalizarSistema(desc)
      : null;
  const is_nexlex = tipo === 'receita' && rules.ehNexlex(desc);

  return {
    data,
    descricao: desc,
    valor: raw.valor,
    categoria,
    subcategoria: subcat,
    mes,
    mes_num: mNum,
    ano,
    competencia: rules.competenciaOrd(ano, mNum),
    tipo,
    centro_id: raw.centro_id ?? null,
    eh_receita: raw.eh_receita ?? (raw.valor > 0 && tipo === 'receita'),
    origem: raw.origem,
    cliente_obs: raw.cliente_obs,
    viagem,
    sistema,
    is_nexlex,
  };
}

/** Hash de conteúdo (idempotência do CSV). `occ` separa linhas idênticas no mesmo arquivo. */
function hashConteudo(rec: Omit<LancamentoInput, 'hash'>, occ: number): string {
  const base = [
    rec.data, rec.descricao, String(rec.valor), rec.categoria, rec.subcategoria,
    rec.mes, rec.tipo, rec.origem, rec.cliente_obs,
  ].join('|');
  return createHash('sha1').update(`${base}|#${occ}`).digest('hex');
}

/** Lê o CSV inteiro, valida colunas e devolve os registros normalizados e prontos pra inserir. */
export function parseLancamentos(text: string): LancamentoInput[] {
  const grid = parseCsv(text);
  if (grid.length < 2) throw new Error('Arquivo vazio ou sem linhas de dados.');
  const header = grid[0] ?? [];
  const idx: Record<string, number> = {};
  header.forEach((h, i) => {
    const canon = CANON[normCol(h)];
    if (canon) idx[canon] = i;
  });
  const faltando = COLUNAS.filter((c) => !(c in idx));
  if (faltando.length) {
    throw new Error(
      `Colunas obrigatórias ausentes: ${faltando.join(', ')}. Encontradas: ${header.join(', ')}`,
    );
  }
  const get = (rowArr: string[], col: string): string => (rowArr[idx[col] ?? -1] ?? '').trim();

  const seen = new Map<string, number>();
  const registros: LancamentoInput[] = [];
  for (let r = 1; r < grid.length; r++) {
    const row = grid[r] ?? [];
    const rec = derivarCampos({
      data: get(row, 'Data'),
      valor: parseValor(get(row, 'Valor')),
      mes: get(row, 'Mês'),
      tipo: get(row, 'Tipo'),
      categoria: get(row, 'Categoria'),
      subcategoria: get(row, 'Subcategoria'),
      descricao: get(row, 'Descrição'),
      origem: get(row, 'Origem'),
      cliente_obs: get(row, 'Cliente/Obs'),
    });
    const baseKey = [
      rec.data, rec.descricao, String(rec.valor), rec.categoria, rec.subcategoria,
      rec.mes, rec.tipo, rec.origem, rec.cliente_obs,
    ].join('|');
    const occ = seen.get(baseKey) ?? 0;
    seen.set(baseKey, occ + 1);
    registros.push({ ...rec, hash: hashConteudo(rec, occ) });
  }
  return registros;
}
