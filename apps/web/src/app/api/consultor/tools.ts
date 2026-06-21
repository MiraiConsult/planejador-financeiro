import type Anthropic from '@anthropic-ai/sdk';

// Tools que o consultor financeiro pode pedir para executar.
// Cada tool é executada no servidor após confirmação explícita do
// usuário pela UI (a UI não roda nenhuma tool sem o clique "Sim").
export const CONSULTOR_TOOLS: Anthropic.Tool[] = [
  {
    name: 'atualizar_idade_aposentadoria',
    description:
      'Altera a idade de aposentadoria do cliente. Refaz a simulação automaticamente. ' +
      'Use quando o cliente quiser antecipar ou postergar a aposentadoria.',
    input_schema: {
      type: 'object',
      properties: {
        idade: { type: 'number', description: 'Nova idade de aposentadoria (45 a 90).' },
      },
      required: ['idade'],
    },
  },
  {
    name: 'criar_meta_de_compra',
    description:
      'Cria um evento financeiro de compra única no plano do cliente (ex.: comprar casa, ' +
      'comprar carro). É uma saída de caixa em um único ano.',
    input_schema: {
      type: 'object',
      properties: {
        descricao: { type: 'string', description: 'Descrição curta da meta (ex.: "Comprar casa em Floripa").' },
        idade: { type: 'number', description: 'Idade em que a compra ocorre.' },
        valor: { type: 'number', description: 'Valor positivo em reais.' },
      },
      required: ['descricao', 'idade', 'valor'],
    },
  },
  {
    name: 'registrar_acao_excedente',
    description:
      'Registra uma ação padrão para anos em que sobra dinheiro na simulação (excedente). ' +
      'Ex.: "aportar em renda fixa", "antecipar quitação da dívida".',
    input_schema: {
      type: 'object',
      properties: {
        acao: { type: 'string', description: 'Texto livre da ação preferida.' },
      },
      required: ['acao'],
    },
  },
];

export type ToolName =
  | 'atualizar_idade_aposentadoria'
  | 'criar_meta_de_compra'
  | 'registrar_acao_excedente';
