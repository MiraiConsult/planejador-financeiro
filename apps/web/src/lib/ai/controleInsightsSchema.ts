import { z } from 'zod';

/**
 * Insights estruturados que a IA devolve ao analisar o Controle Mensal.
 * Strict-mode OpenAI: tudo required; campos não-aplicáveis = null.
 */
export const controleInsightsSchema = z.object({
  resumo: z.string().describe('1–2 frases com a leitura geral das finanças do período'),
  insights: z
    .array(
      z.object({
        titulo: z.string().describe('Título curto e direto'),
        severidade: z.enum(['positivo', 'info', 'atencao', 'alerta']),
        descricao: z.string().describe('Explicação específica, citando números e rubricas'),
        rubrica: z.string().nullable().describe('Centro/rubrica relacionada, se houver'),
        recomendacao: z.string().nullable().describe('Ação sugerida, se aplicável'),
      }),
    )
    .describe('5 a 8 insights específicos e acionáveis'),
});

export type ControleInsights = z.infer<typeof controleInsightsSchema>;
