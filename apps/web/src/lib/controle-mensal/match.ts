// Normalização de descrição/merchant pra gerar a chave de aprendizado.
//
// match_key:
//   - 'm:<merchant_lower>' quando há merchant (mais estável)
//   - 'd:<descricao_normalizada>' caso contrário
//
// Descrição normalizada remove prefixos comuns (DL *, PPRO *, PAY *…),
// IDs alfanuméricos no fim e duplica espaços. Sobra o "miolo" da
// transação que tende a ser estável entre cobranças do mesmo merchant.

const PREFIXOS = /^(DL|PPRO|PAY|TBI|EBANX|PG\*|PAYU|SP\*|STR\*|PADDLE|REC\*|2C\*)\s*\*?\s*/i;
const SUFIXO_ID = /\s+[a-z0-9]{4,}$/i;
const SUFIXO_PARCELA = /\s+\d{1,2}\/\d{1,2}$/;

export function normalizarDescricao(desc: string): string {
  if (!desc) return '';
  return desc
    .toUpperCase()
    .replace(PREFIXOS, '')
    .replace(SUFIXO_ID, '')
    .replace(SUFIXO_PARCELA, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function makeMatchKey(merchant: string | null | undefined, descricao: string | null | undefined): string {
  const m = (merchant ?? '').trim().toLowerCase();
  if (m) return `m:${m}`;
  return `d:${normalizarDescricao(descricao ?? '')}`;
}
