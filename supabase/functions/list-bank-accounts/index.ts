// Edge Function: list-bank-accounts
//
// Lista as contas disponíveis no Banco MCP do tenant. Usada pela UI
// "Adicionar conexão bancária" pra o consultor escolher quais contas
// importar (ex: 1 conexão Itaú vem com corrente + 2 cartões).
//
// POST /api/openfinance/accounts/list  { item?: string }
// Sem `item` lista todas as contas de todas as conexões.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

interface MCPAccount {
  id: string;
  account_id?: string;
  type: 'BANK' | 'CREDIT';
  subtype: string;
  name: string;
  number: string;
  balance: string;
  currencyCode: string;
  owner?: string;
  taxNumber?: string;
  bank?: string;
  connector_id?: string;
  item_id?: string;
  bankData?: Record<string, unknown> | null;
  creditData?: Record<string, unknown> | null;
}

interface MCPAccountsResponse {
  ok?: boolean;
  result?: { total: number; connections: number; results: MCPAccount[] };
  total?: number;
  connections?: number;
  results?: MCPAccount[];
  error?: string;
}

const SUBTYPE_LABEL: Record<string, { label: string; account_type: string }> = {
  CHECKING_ACCOUNT: { label: 'Conta corrente', account_type: 'checking' },
  SAVINGS_ACCOUNT:  { label: 'Poupança',       account_type: 'savings' },
  CREDIT_CARD:      { label: 'Cartão de crédito', account_type: 'credit_card' },
  INVESTMENT:       { label: 'Investimento',   account_type: 'investment' },
  LOAN:             { label: 'Empréstimo',     account_type: 'loan' },
};

Deno.serve(async (req: Request) => {
  const apiKey = Deno.env.get('BANCO_MCP_API_KEY');
  const baseUrl = Deno.env.get('BANCO_MCP_BASE_URL') ?? 'https://api.mcp.ai';

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'BANCO_MCP_API_KEY não configurada' }), {
      status: 500, headers: { 'content-type': 'application/json' },
    });
  }

  let body: { item?: string } = {};
  if (req.body && req.headers.get('content-type')?.includes('json')) {
    try { body = await req.json(); } catch { /* ignore */ }
  }

  const apiRes = await fetch(`${baseUrl}/api/openfinance/accounts/list`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body.item ? { item: body.item } : {}),
  });

  if (!apiRes.ok) {
    const text = await apiRes.text();
    return new Response(JSON.stringify({ error: `MCP API ${apiRes.status}: ${text.slice(0, 300)}` }), {
      status: 502, headers: { 'content-type': 'application/json' },
    });
  }

  const json = (await apiRes.json()) as MCPAccountsResponse;
  if (json.error) {
    return new Response(JSON.stringify({ error: json.error }), {
      status: 502, headers: { 'content-type': 'application/json' },
    });
  }

  const result = json.result ?? json;
  const raws = (result.results ?? []) as MCPAccount[];

  const accounts = raws.map((a) => {
    const meta = SUBTYPE_LABEL[a.subtype] ?? { label: a.subtype, account_type: 'other' };
    return {
      external_account_id: a.account_id ?? a.id,
      external_item_id: a.item_id ?? null,
      bank: a.bank ?? null,
      type_raw: a.type,
      subtype: a.subtype,
      subtype_label: meta.label,
      account_type: meta.account_type,
      account_name: a.name,
      account_number: a.number,
      balance: a.balance,
      currency: a.currencyCode,
      owner: a.owner ?? null,
      // Nome de exibição: "Itaú · Conta corrente · 00016307-2"
      display_name: [a.bank, meta.label, a.number].filter(Boolean).join(' · '),
    };
  });

  return new Response(JSON.stringify({
    ok: true,
    total: result.total ?? accounts.length,
    connections: result.connections ?? 0,
    accounts,
  }), { headers: { 'content-type': 'application/json' } });
});
