// Regras de negócio do Controle Financeiro (porte de backend/rules.py).
// Fonte de verdade: a planilha de Lançamentos. Mês = competência (não a data).

export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const;

const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');
export function stripAccents(s: string): string {
  return String(s ?? '').normalize('NFD').replace(COMBINING_MARKS, '');
}

const MES_NUM: Record<string, number> = {};
MESES.forEach((m, i) => {
  MES_NUM[m.toLowerCase()] = i + 1;
  MES_NUM[stripAccents(m).toLowerCase()] = i + 1;
});

export function mesNum(mes: string | null | undefined): number {
  if (mes == null) return 0;
  return MES_NUM[stripAccents(String(mes).trim()).toLowerCase()] ?? 0;
}

export function mesNome(num: number): string {
  return MESES[num - 1] ?? String(num);
}

/** Ano da competência, derivado da data, com guarda para virada de ano. */
export function competenciaAno(dataIso: string, mNum: number): number | null {
  const m = /(\d{4})-(\d{2})-(\d{2})/.exec(String(dataIso));
  if (!m) {
    const y = /(\d{4})/.exec(String(dataIso));
    return y && y[1] ? Number(y[1]) : null;
  }
  let ano = Number(m[1]);
  const mesData = Number(m[2]);
  if (mNum === 12 && mesData === 1) ano -= 1;
  else if (mNum === 1 && mesData === 12) ano += 1;
  return ano;
}

export function competenciaOrd(ano: number | null, mNum: number): number {
  return (ano ?? 0) * 100 + (mNum ?? 0);
}

// ── Viagens: não há coluna; deriva do texto "Subcategoria Descrição".
// Regras ORDENADAS (a primeira que casar vence). Texto já sem acento/minúsculo.
const VIAGEM_REGRAS: Array<[RegExp, string]> = [
  [/clube latam|milhas|pontos/, 'Milhas/Pontos (recorrente)'],
  [
    /\bny\b|nova york|new york|\bdc\b|washington|latam passagem|placemaker|amtrak|njtransit|moma|sephora|lululemon|north face|polo factory|marshalls|best buy|ulta|target|cvs|trader joe|viagogo|dynamic|new yorker|bkg hotel/,
    'NY/DC',
  ],
  [/capao|balneario|viagem sc|\bsc\b/, 'Capão da Canoa (SC)'],
  [/canela|gramado|tri hotel/, 'Canela (RS)'],
];

export function derivarViagem(subcategoria: string, descricao: string): string {
  const txt = stripAccents(`${subcategoria ?? ''} ${descricao ?? ''}`).toLowerCase();
  for (const [re, nome] of VIAGEM_REGRAS) if (re.test(txt)) return nome;
  return 'Outros';
}

// ── SaaS Mirai: normaliza "Manus.AI (3 cobranças)" -> "Manus.AI".
const SAAS_ALIASES: Array<[RegExp, string]> = [
  [/manus/, 'Manus.AI'], [/claude/, 'Claude.AI'], [/supabase/, 'Supabase'],
  [/gamma/, 'Gamma'], [/figma/, 'Figma'], [/n8n|paddle/, 'N8N'],
  [/google cloud|\bgcp\b/, 'Google Cloud'], [/vercel/, 'Vercel'],
  [/hostinger/, 'Hostinger'], [/heygen/, 'HeyGen'], [/squarespace/, 'Squarespace'], [/zoop/, 'Zoop'],
];

export function normalizarSistema(descricao: string): string {
  const txt = stripAccents(String(descricao ?? '')).toLowerCase();
  for (const [re, nome] of SAAS_ALIASES) if (re.test(txt)) return nome;
  const base = String(descricao ?? '').replace(/\s*\(.*$/, '').trim();
  return base || 'Outro';
}

export function ehNexlex(descricao: string): boolean {
  return stripAccents(String(descricao ?? '')).toLowerCase().includes('nexlex');
}
