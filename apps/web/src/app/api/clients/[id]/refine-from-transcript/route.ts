import { generateObject } from 'ai';
import { getAIModel, isAIConfigured } from '@/lib/ai/provider';
import { refinementSystemPrompt } from '@/lib/ai/refine-prompts';
import { refinementPatchSchema } from '@/lib/ai/refineSchema';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';
export const maxDuration = 60;

interface RequestBody {
  trecho: string;
  instrucao: string;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: client_id } = await params;

  if (!isAIConfigured()) {
    return new Response(
      JSON.stringify({ error: 'IA não configurada (defina OPENAI_API_KEY ou GEMINI_API_KEY)' }),
      { status: 503, headers: { 'content-type': 'application/json' } },
    );
  }

  const body = (await req.json()) as RequestBody;
  if (!body.instrucao?.trim()) {
    return new Response(JSON.stringify({ error: 'Falta a instrução' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Carrega estado atual do cliente como contexto
  const supabase = await createClient();
  const [
    { data: cliente },
    { data: assets },
    { data: expenses },
    { data: events },
    { data: liabilities },
  ] = await Promise.all([
    supabase.from('clients').select('*').eq('id', client_id).maybeSingle(),
    supabase.from('assets').select('*').eq('client_id', client_id).is('deleted_at', null),
    supabase.from('expenses').select('*').eq('client_id', client_id).is('deleted_at', null),
    supabase.from('events').select('*').eq('client_id', client_id).is('deleted_at', null),
    supabase.from('liabilities').select('*').eq('client_id', client_id).is('deleted_at', null),
  ]);

  if (!cliente) {
    return new Response(JSON.stringify({ error: 'Cliente não encontrado' }), { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stateSummary = formatStateAsContext({ cliente, assets, expenses, events, liabilities } as any);

  const trechoBlock = body.trecho?.trim()
    ? `TRECHO SELECIONADO DA TRANSCRIÇÃO:\n"${body.trecho.trim()}"\n\n`
    : '';

  try {
    const result = await generateObject({
      model: getAIModel(),
      schema: refinementPatchSchema,
      system: refinementSystemPrompt,
      prompt: `${trechoBlock}INSTRUÇÃO DO CONSULTOR:\n${body.instrucao.trim()}\n\nESTADO ATUAL DO CLIENTE:\n${stateSummary}\n\nGere o patch.`,
    });
    return new Response(JSON.stringify(result.object), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    console.error('[refine-from-transcript] failed', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'erro desconhecido' }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatStateAsContext(s: any): string {
  const lines: string[] = [];
  lines.push(`Cliente: ${s.cliente.nome_completo} (${s.cliente.expectativa_vida_anos} anos de horizonte, aposentadoria ${s.cliente.idade_aposentadoria ?? '?'})`);

  if (s.assets?.length) {
    lines.push(`\nAtivos & receitas (${s.assets.length}):`);
    for (const a of s.assets) {
      lines.push(`  - "${a.nome}" · ${a.tipo}/${a.natureza} · R$ ${Number(a.valor).toLocaleString('pt-BR')} · ${a.idade_inicio}-${a.idade_fim}${a.crescimento_real_aa ? ` · +${(Number(a.crescimento_real_aa) * 100).toFixed(1)}% a.a.` : ''}`);
    }
  }
  if (s.expenses?.length) {
    lines.push(`\nDespesas (${s.expenses.length}):`);
    for (const e of s.expenses) {
      lines.push(`  - "${e.descricao}" · ${e.categoria} · R$ ${Number(e.valor_mensal).toLocaleString('pt-BR')}/mês · ${e.idade_inicio}-${e.idade_fim}${e.essencial ? ' · essencial' : ''}`);
    }
  }
  if (s.events?.length) {
    lines.push(`\nEventos (${s.events.length}):`);
    for (const ev of s.events) {
      const rec =
        ev.padrao_recorrencia === 'unico'
          ? `aos ${ev.idade_inicio}`
          : ev.padrao_recorrencia === 'recorrente_anual'
            ? `todo ano ${ev.idade_inicio}-${ev.idade_fim ?? '?'}`
            : `a cada ${ev.intervalo_anos} anos ${ev.idade_inicio}-${ev.idade_fim ?? '?'}`;
      lines.push(`  - "${ev.descricao}" · ${ev.tipo} · ${Number(ev.valor) >= 0 ? '+' : ''}R$ ${Number(ev.valor).toLocaleString('pt-BR')} · ${rec}`);
    }
  }
  if (s.liabilities?.length) {
    lines.push(`\nPassivos (${s.liabilities.length}):`);
    for (const l of s.liabilities) {
      lines.push(`  - "${l.nome}" · ${l.tipo} · saldo R$ ${Number(l.saldo_atual).toLocaleString('pt-BR')} · parcela R$ ${Number(l.parcela_mensal).toLocaleString('pt-BR')}/mês`);
    }
  }
  return lines.join('\n');
}
