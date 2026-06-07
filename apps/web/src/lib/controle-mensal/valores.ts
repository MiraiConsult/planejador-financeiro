// Funções puras de parsing — sem deps de Node, seguras pra usar no client.
// `parse.ts` (server-only, usa node:crypto pra hash) reexporta daqui.

export function parseValor(v: string): number {
  let s = String(v ?? '').trim();
  if (s === '' || s.toLowerCase() === 'nan') return 0;
  const neg = s.startsWith('(') && s.endsWith(')');
  s = s.replace(/[()]/g, '').replace(/r\$/gi, '').replace(/\s/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const val = Number(s);
  if (Number.isNaN(val)) return 0;
  return neg ? -val : val;
}

export function parseData(v: string): string {
  const s = String(v ?? '').trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/.exec(s);
  if (br && br[1] && br[2] && br[3]) {
    const d = br[1].padStart(2, '0');
    const mo = br[2].padStart(2, '0');
    const y = br[3].length === 2 ? `20${br[3]}` : br[3];
    return `${y}-${mo}-${d}`;
  }
  return s.slice(0, 10);
}
