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

export const fmtData = (s: string): string => {
  const p = String(s ?? '').slice(0, 10).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : String(s ?? '');
};
