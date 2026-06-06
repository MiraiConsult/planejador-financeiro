import { z } from 'zod';

/**
 * Schema do PATCH que a IA retorna ao refinar um cliente baseado em
 * trecho selecionado da transcrição + instrução do consultor.
 *
 * Cada operação descreve UMA mudança: alterar campos do cliente,
 * adicionar/atualizar/remover item de uma lista (assets, expenses,
 * events, liabilities). Tudo opcional.
 */

const idMatcher = z.object({
  /** Critério de identificação do item a alterar/remover.
   *  Use o nome/descrição completo conforme aparece no contexto. */
  match_descricao: z.string().describe('Nome/descrição EXATA do item conforme está no estado atual'),
});

// ─── Cliente ───
const clienteUpdates = z.object({
  nome_completo: z.string().nullable().optional(),
  data_nascimento: z.string().nullable().optional(),
  expectativa_vida_anos: z.number().int().nullable().optional(),
  idade_aposentadoria: z.number().int().nullable().optional(),
  perfil_carteira: z.enum(['conservador', 'moderado', 'arrojado']).nullable().optional(),
});

// ─── Perfil subjetivo ───
const perfilUpdates = z.object({
  visao_30_anos: z.string().nullable().optional(),
  medo_principal: z.string().nullable().optional(),
  significado_dinheiro: z.string().nullable().optional(),
  referencia_dinheiro: z.string().nullable().optional(),
  legado: z.string().nullable().optional(),
});

// ─── Assets ───
const assetAdd = z.object({
  tipo: z.enum(['financeiro_liquido', 'imovel', 'terreno', 'carro', 'heranca_recebida', 'salario', 'aluguel', 'outro']),
  natureza: z.enum(['estoque', 'fluxo']),
  nome: z.string(),
  valor: z.number(),
  idade_inicio: z.number().int(),
  idade_fim: z.number().int(),
  crescimento_real_aa_pct: z.number().nullable().optional(),
});
const assetUpdate = idMatcher.extend({
  novo_nome: z.string().nullable().optional(),
  novo_valor: z.number().nullable().optional(),
  nova_idade_inicio: z.number().int().nullable().optional(),
  nova_idade_fim: z.number().int().nullable().optional(),
  novo_crescimento_real_aa_pct: z.number().nullable().optional(),
});

// ─── Expenses ───
const expenseAdd = z.object({
  categoria: z.enum([
    'moradia', 'alimentacao', 'transporte', 'saude', 'lazer',
    'servicos_dom', 'filhos', 'estudos', 'viagens', 'cuidado_familia', 'outro',
  ]),
  descricao: z.string(),
  valor_mensal: z.number(),
  idade_inicio: z.number().int(),
  idade_fim: z.number().int(),
  essencial: z.boolean(),
});
const expenseUpdate = idMatcher.extend({
  nova_descricao: z.string().nullable().optional(),
  novo_valor_mensal: z.number().nullable().optional(),
  nova_idade_inicio: z.number().int().nullable().optional(),
  nova_idade_fim: z.number().int().nullable().optional(),
  novo_essencial: z.boolean().nullable().optional(),
});

// ─── Events ───
const eventAdd = z.object({
  tipo: z.enum(['sonho', 'compra', 'heranca', 'viagem_pontual', 'imprevisto']),
  descricao: z.string(),
  valor: z.number().describe('COM SINAL. Negativo pra gasto, positivo pra entrada'),
  idade_inicio: z.number().int(),
  idade_fim: z.number().int().nullable().optional(),
  padrao_recorrencia: z.enum(['unico', 'recorrente_anual', 'recorrente_espacado']),
  intervalo_anos: z.number().int().nullable().optional(),
});
const eventUpdate = idMatcher.extend({
  nova_descricao: z.string().nullable().optional(),
  novo_valor: z.number().nullable().optional(),
  nova_idade_inicio: z.number().int().nullable().optional(),
  nova_idade_fim: z.number().int().nullable().optional(),
  nova_recorrencia: z.enum(['unico', 'recorrente_anual', 'recorrente_espacado']).nullable().optional(),
  novo_intervalo_anos: z.number().int().nullable().optional(),
});

// ─── Liabilities ───
const liabilityAdd = z.object({
  tipo: z.string(),
  nome: z.string(),
  saldo_atual: z.number(),
  juros_aa_pct: z.number().nullable().optional(),
  parcela_mensal: z.number(),
  idade_inicio: z.number().int(),
  idade_fim: z.number().int(),
});
const liabilityUpdate = idMatcher.extend({
  novo_nome: z.string().nullable().optional(),
  novo_saldo_atual: z.number().nullable().optional(),
  novo_juros_aa_pct: z.number().nullable().optional(),
  nova_parcela_mensal: z.number().nullable().optional(),
  nova_idade_inicio: z.number().int().nullable().optional(),
  nova_idade_fim: z.number().int().nullable().optional(),
});

export const refinementPatchSchema = z.object({
  resumo_da_acao: z
    .string()
    .describe('Frase curta explicando o que será mudado (mostrada pro consultor)'),

  cliente_updates: clienteUpdates.nullable().optional(),
  perfil_updates: perfilUpdates.nullable().optional(),

  assets_add: z.array(assetAdd).nullable().optional(),
  assets_update: z.array(assetUpdate).nullable().optional(),
  assets_remove: z.array(idMatcher).nullable().optional(),

  expenses_add: z.array(expenseAdd).nullable().optional(),
  expenses_update: z.array(expenseUpdate).nullable().optional(),
  expenses_remove: z.array(idMatcher).nullable().optional(),

  events_add: z.array(eventAdd).nullable().optional(),
  events_update: z.array(eventUpdate).nullable().optional(),
  events_remove: z.array(idMatcher).nullable().optional(),

  liabilities_add: z.array(liabilityAdd).nullable().optional(),
  liabilities_update: z.array(liabilityUpdate).nullable().optional(),
  liabilities_remove: z.array(idMatcher).nullable().optional(),
});

export type RefinementPatch = z.infer<typeof refinementPatchSchema>;
