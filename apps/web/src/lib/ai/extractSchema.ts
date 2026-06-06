import { z } from 'zod';

/**
 * Schema completo pra extração de transcrição de reunião de planejamento
 * financeiro. Cobre TUDO que o WizardState precisa.
 *
 * Tudo opcional/com defaults — a IA preenche o que conseguir extrair
 * da transcrição. O resto fica pra o consultor ajustar manualmente.
 */

export const transcriptExtractionSchema = z.object({
  cliente: z.object({
    nome_completo: z.string().nullable().describe('Nome completo do cliente, se mencionado'),
    idade_atual: z.number().int().min(0).max(120).nullable().describe('Idade ATUAL do cliente em anos'),
    expectativa_vida_anos: z.number().int().min(18).max(120).nullable().describe('Até que idade o cliente quer planejar (expectativa de vida). Se ele disse "vou viver até X", use X'),
    idade_aposentadoria: z.number().int().min(18).max(120).nullable().describe('Idade que o cliente pretende parar de trabalhar formalmente. Se ele disse "quero ficar em conselhos até 85", a aposentadoria é 85'),
    perfil_carteira: z.enum(['conservador', 'moderado', 'arrojado']).nullable().describe('Perfil de carteira: conservador=8%, moderado=10%, arrojado=13% ao ano. Default moderado se não souber'),
  }),

  perfil_subjetivo: z.object({
    visao_30_anos: z.string().nullable().describe('Como o cliente imagina sua vida em 30 anos (sensações, lugares, lifestyle)'),
    medo_principal: z.string().nullable().describe('Maior medo do cliente em relação a dinheiro'),
    significado_dinheiro: z.string().nullable().describe('O que dinheiro significa pra ele (segurança/liberdade/legado/etc)'),
    referencia_dinheiro: z.string().nullable().describe('Alguma referência (pai, mentor) que marcou em relação a dinheiro'),
    legado: z.string().nullable().describe('O que ele quer realizar/deixar antes de morrer'),
  }),

  receitas: z.array(
    z.object({
      nome: z.string().describe('Nome curto (ex: "Salário Diego", "Salário esposa", "Aluguel")'),
      tipo: z.enum(['salario', 'aluguel', 'outro']).describe('Tipo da receita'),
      valor_anual: z.number().describe('Valor ANUAL em R$ (multiplique mensal × 12)'),
      idade_inicio: z.number().int().describe('A partir de que idade essa receita existe'),
      idade_fim: z.number().int().describe('Até que idade essa receita existe (aposentadoria pra salário)'),
      crescimento_real_aa_pct: z.number().nullable().describe('Crescimento real anual em %, se mencionado (ex: 10 = 10% a.a.)'),
    }),
  ).describe('Lista de receitas recorrentes. Se o cliente descreveu progressões (ex: "salário sobe 10% a.a. até os 50, depois 15%"), gere MÚLTIPLAS entradas com idade_inicio/fim e crescimento corretos'),

  despesas: z.array(
    z.object({
      categoria: z.enum([
        'moradia', 'alimentacao', 'transporte', 'saude', 'lazer',
        'servicos_dom', 'filhos', 'estudos', 'viagens', 'cuidado_familia', 'outro',
      ]).describe('Categoria do gasto'),
      descricao: z.string().describe('Descrição curta'),
      valor_mensal: z.number().describe('Valor MENSAL em R$'),
      idade_inicio: z.number().int(),
      idade_fim: z.number().int(),
      essencial: z.boolean().describe('Se é despesa essencial (não pode cortar)'),
      crescimento_real_aa_pct: z.number().nullable().describe('Crescimento real anual em %'),
    }),
  ).describe('Despesas mensais recorrentes. Inclua "Gasto geral família" se mencionado. Se cliente disse "gasto vai ser sempre X% da renda", calcule baseado na renda inicial'),

  ativos: z.array(
    z.object({
      tipo: z.enum([
        'financeiro_liquido', 'imovel', 'terreno', 'carro', 'heranca_recebida', 'outro',
      ]).describe('Tipo do ativo'),
      nome: z.string(),
      valor: z.number().describe('Valor de mercado em R$'),
      idade_inicio: z.number().int().describe('A partir de que idade o cliente tem esse ativo'),
      idade_fim: z.number().int().describe('Até que idade considerar esse ativo (geralmente expectativa_vida)'),
      valorizacao_aa_pct: z.number().nullable().describe('Valorização real anual em % (imóvel ~4, carro ~-10)'),
    }),
  ).describe('Patrimônio do cliente HOJE ou que ele planeja ter. Use valores realistas pra imóveis e veículos'),

  passivos: z.array(
    z.object({
      tipo: z.string().describe('Tipo: financiamento_imovel, financiamento_veiculo, emprestimo_pessoal, consignado, cartao_credito, outro'),
      nome: z.string(),
      saldo_atual: z.number(),
      juros_aa_pct: z.number().nullable(),
      parcela_mensal: z.number(),
      idade_inicio: z.number().int(),
      idade_fim: z.number().int(),
    }),
  ).describe('Dívidas e financiamentos. Se o cliente não mencionou nenhum, retorne lista vazia'),

  eventos: z.array(
    z.object({
      tipo: z.enum(['sonho', 'compra', 'heranca', 'viagem_pontual', 'imprevisto']).describe('Tipo do evento'),
      descricao: z.string().describe('Descrição curta (ex: "Casa de praia", "Trocar de carro", "Faculdade Filho 1")'),
      valor: z.number().describe('Valor em R$ COM SINAL. Negativo = saída/gasto (casa, casamento, viagem). Positivo = entrada (herança)'),
      idade_inicio: z.number().int().describe('Idade do evento ou do início da recorrência'),
      idade_fim: z.number().int().nullable().describe('Idade fim pra eventos recorrentes'),
      recorrencia: z.enum(['unico', 'recorrente_anual', 'recorrente_espacado']),
      intervalo_anos: z.number().int().nullable().describe('Intervalo em anos pra recorrente_espacado (ex: trocar de carro a cada 3 anos)'),
    }),
  ).describe('Sonhos, compras grandes, eventos pontuais. Cada filho mencionado vira UM evento (faculdade aos X anos). Cada imóvel mencionado vira UM evento (compra de imóvel aos X anos)'),

  resumo: z
    .string()
    .describe('1-2 frases resumindo o perfil do cliente e o que ele parece valorizar no fundo'),

  observacoes: z
    .array(z.string())
    .nullable()
    .describe('Anotações úteis pro consultor revisar (ex: "Cliente mencionou herança mas valor não está claro", "Doações de 2% após os 60 anos foram excluídas a pedido do cliente")'),
});

export type TranscriptExtraction = z.infer<typeof transcriptExtractionSchema>;
