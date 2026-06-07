import { generateObject, generateText } from 'ai';
import { getAIModel, isAIConfigured } from '@/lib/ai/provider';
import { controleInsightsSchema } from '@/lib/ai/controleInsightsSchema';
import { resumoParaIA } from '@/lib/controle-mensal/analises';
import type { Lancamento } from '@/lib/controle-mensal/analytics';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';
export const maxDuration = 60;

const COLS =
  'id,data,descricao,valor,categoria,subcategoria,mes,mes_num,ano,competencia,tipo,origem,cliente_obs,viagem,sistema,is_nexlex';

const SYSTEM = `Você é um analista financeiro pessoal sênior. Recebe um RESUMO AGREGADO das finanças mensais de uma pessoa (receitas, despesas por centro de custo e rubrica, evolução mês a mês, taxa de poupança, custo fixo×variável, concentração de gastos).

Sua tarefa: gerar análises ÚTEIS, ESPECÍFICAS e ACIONÁVEIS em português do Brasil.
- Cite números e nomes de rubricas do resumo (não invente nada além do que está lá).
- Aponte anomalias, tendências, concentração de gastos (Pareto), e onde dá pra economizar.
- "Mirai" é a empresa (PJ) da pessoa — trate à parte dos gastos pessoais; não some no resultado de vida.
- Seja direto e concreto. Evite generalidades vazias.`;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isAIConfigured()) {
    return new Response(
      JSON.stringify({ error: 'IA não configurada (defina OPENAI_API_KEY ou GEMINI_API_KEY).' }),
      { status: 503, headers: { 'content-type': 'application/json' } },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { pergunta?: string };

  const supabase = await createClient();
  const { data: rowsRaw } = await supabase
    .from('controle_mensal_lancamentos')
    .select(COLS)
    .eq('client_id', id);
  const rows = (rowsRaw ?? []) as unknown as Lancamento[];
  if (!rows.length) {
    return new Response(JSON.stringify({ error: 'Sem lançamentos pra analisar.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const contexto = resumoParaIA(rows);

  try {
    if (body.pergunta?.trim()) {
      const { text } = await generateText({
        model: getAIModel(),
        system: SYSTEM,
        prompt: `RESUMO DAS FINANÇAS:\n${contexto}\n\nPERGUNTA DO CONSULTOR:\n${body.pergunta.trim()}\n\nResponda em PT-BR, citando números do resumo. Se a resposta não estiver no resumo, diga que não há dado suficiente.`,
      });
      return new Response(JSON.stringify({ resposta: text }), {
        headers: { 'content-type': 'application/json' },
      });
    }

    const { object } = await generateObject({
      model: getAIModel(),
      schema: controleInsightsSchema,
      system: SYSTEM,
      prompt: `RESUMO DAS FINANÇAS:\n${contexto}\n\nGere os insights.`,
    });
    return new Response(JSON.stringify({ insights: object }), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    console.error('[controle-mensal/analise] failed', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'erro desconhecido' }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    );
  }
}
