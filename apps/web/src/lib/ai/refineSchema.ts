import { z } from 'zod';

/**
 * Schema do PATCH que a IA retorna ao refinar um cliente.
 *
 * NOTA: OpenAI strict mode exige que TODOS os campos sejam declarados
 * (required) — campos não-aplicáveis viram null em vez de undefined.
 * Por isso usamos .nullable() em vez de .optional().
 */

const idMatcher = z.object({
  match_descricao: z.string().describe('Nome/descrição EXATA do item conforme está no estado atual'),
});

const clienteUpdates = z.object({
  nome_completo: z.string().nullable(),
  data_nascimento: z.string().nullable(),
  expectativa_vida_anos: z.number().int().nullable(),
  idade_aposentadoria: z.number().int().nullable(),
  perfil_carteira: z.enum(['conservador', 'moderado', 'arrojado']).nullable(),
});

const perfilUpdates = z.object({
  visao_30_anos: z.string().nullable(),
  medo_principal: z.string().nullable(),
  significado_dinheiro: z.string().nullable(),
  referencia_dinheiro: z.string().nullable(),
  legado: z.string().nullable(),
});

const assetAdd = z.object({
  tipo: z.enum(['financeiro_liquido', 'imovel', 'terreno', 'carro', 'heranca_recebida', 'salario', 'aluguel', 'outro']),
  natureza: z.enum(['estoque', 'fluxo']),
  nome: z.string(),
  valor: z.number(),
  idade_inicio: z.number().int(),
  idade_fim: z.number().int(),
  crescimento_real_aa_pct: z.number().nullable(),
});
const assetUpdate = z.object({
  match_descricao: z.string(),
  novo_nome: z.string().nullable(),
  novo_valor: z.number().nullable(),
  nova_idade_inicio: z.number().int().nullable(),
  nova_idade_fim: z.number().int().nullable(),
  novo_crescimento_real_aa_pct: z.number().nullable(),
});

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
const expenseUpdate = z.object({
  match_descricao: z.string(),
  nova_descricao: z.string().nullable(),
  novo_valor_mensal: z.number().nullable(),
  nova_idade_inicio: z.number().int().nullable(),
  nova_idade_fim: z.number().int().nullable(),
  novo_essencial: z.boolean().nullable(),
});

const eventAdd = z.object({
  tipo: z.enum(['sonho', 'compra', 'heranca', 'viagem_pontual', 'imprevisto']),
  descricao: z.string(),
  valor: z.number().describe('COM SINAL. Negativo pra gasto, positivo pra entrada'),
  idade_inicio: z.number().int(),
  idade_fim: z.number().int().nullable(),
  padrao_recorrencia: z.enum(['unico', 'recorrente_anual', 'recorrente_espacado']),
  intervalo_anos: z.number().int().nullable(),
});
const eventUpdate = z.object({
  match_descricao: z.string(),
  nova_descricao: z.string().nullable(),
  novo_valor: z.number().nullable(),
  nova_idade_inicio: z.number().int().nullable(),
  nova_idade_fim: z.number().int().nullable(),
  nova_recorrencia: z.enum(['unico', 'recorrente_anual', 'recorrente_espacado']).nullable(),
  novo_intervalo_anos: z.number().int().nullable(),
});

const liabilityAdd = z.object({
  tipo: z.string(),
  nome: z.string(),
  saldo_atual: z.number(),
  juros_aa_pct: z.number().nullable(),
  parcela_mensal: z.number(),
  idade_inicio: z.number().int(),
  idade_fim: z.number().int(),
});
const liabilityUpdate = z.object({
  match_descricao: z.string(),
  novo_nome: z.string().nullable(),
  novo_saldo_atual: z.number().nullable(),
  novo_juros_aa_pct: z.number().nullable(),
  nova_parcela_mensal: z.number().nullable(),
  nova_idade_inicio: z.number().int().nullable(),
  nova_idade_fim: z.number().int().nullable(),
});

export const refinementPatchSchema = z.object({
  resumo_da_acao: z
    .string()
    .describe('Frase curta explicando o que será mudado (mostrada pro consultor)'),

  cliente_updates: clienteUpdates.nullable(),
  perfil_updates: perfilUpdates.nullable(),

  assets_add: z.array(assetAdd),
  assets_update: z.array(assetUpdate),
  assets_remove: z.array(idMatcher),

  expenses_add: z.array(expenseAdd),
  expenses_update: z.array(expenseUpdate),
  expenses_remove: z.array(idMatcher),

  events_add: z.array(eventAdd),
  events_update: z.array(eventUpdate),
  events_remove: z.array(idMatcher),

  liabilities_add: z.array(liabilityAdd),
  liabilities_update: z.array(liabilityUpdate),
  liabilities_remove: z.array(idMatcher),
});

export type RefinementPatch = z.infer<typeof refinementPatchSchema>;
