// Formatação pt-BR compartilhada pelo módulo Controle Financeiro.

export const brl = (n: number): string =>
  (Math.round(Number(n) || 0)).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

export const brlShort = (n: number): string => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(0)}k`;
  return String(Math.round(n));
};

/**
 * Formata qualquer data de lançamento para dd/mm/aaaa, tolerante a:
 * - ISO "2026-01-05" ou timestamp "2026-01-05T00:00:00Z"
 * - já em "05/01/2026" (retorna como está)
 * - sem zero-pad "2026-1-5"
 * - Date real
 */
export const fmtData = (s: unknown): string => {
  if (s == null) return '';
  if (s instanceof Date) {
    if (isNaN(s.getTime())) return '';
    return `${String(s.getUTCDate()).padStart(2, '0')}/${String(s.getUTCMonth() + 1).padStart(2, '0')}/${s.getUTCFullYear()}`;
  }
  const str = String(s).trim();
  // Já em dd/mm/aaaa (ou d/m/aaaa)
  const br = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) return `${br[1]!.padStart(2, '0')}/${br[2]!.padStart(2, '0')}/${br[3]}`;
  // ISO yyyy-mm-dd (com ou sem parte de hora)
  const iso = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[3]!.padStart(2, '0')}/${iso[2]!.padStart(2, '0')}/${iso[1]}`;
  // Fallback: tenta Date
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
  }
  return str;
};
