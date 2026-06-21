import type Anthropic from '@anthropic-ai/sdk';

// Tools que o consultor pode usar.
//
// Convenção:
// - "listar_*" são READ-ONLY: executam sem confirmação do usuário.
// - O resto são gravações: SEMPRE pedem confirmação na UI antes de executar.

export const READ_ONLY_TOOLS: Set<string> = new Set([
  'listar_perfil',
  'listar_ativos',
  'listar_despesas',
  'listar_eventos',
  'listar_passivos',
  'listar_acoes_excedente',
  'listar_cenarios',
]);

export const CONSULTOR_TOOLS: Anthropic.Tool[] = [
  // ─── Perfil (leitura + 4 escritas) ────────────────────────────
  {
    name: 'listar_perfil',
    description: 'Lê o perfil atual do cliente (nome, idade, perfil de carteira, idades de aposentadoria e redução, expectativa de vida, faixas de alocação do excedente). Use ANTES de propor mudanças no perfil.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'atualizar_idade_aposentadoria',
    description: 'Altera a idade de aposentadoria do cliente (45 a 90).',
    input_schema: {
      type: 'object',
      properties: { idade: { type: 'number' } },
      required: ['idade'],
    },
  },
  {
    name: 'atualizar_idade_reducao_trabalho',
    description: 'Altera a idade em que o cliente reduz a carga de trabalho (35 a 90).',
    input_schema: {
      type: 'object',
      properties: { idade: { type: 'number' } },
      required: ['idade'],
    },
  },
  {
    name: 'atualizar_expectativa_vida',
    description: 'Altera a expectativa de vida do cliente (em anos, 50 a 120).',
    input_schema: {
      type: 'object',
      properties: { anos: { type: 'number' } },
      required: ['anos'],
    },
  },
  {
    name: 'atualizar_perfil_carteira',
    description: 'Altera o perfil de risco da carteira do cliente.',
    input_schema: {
      type: 'object',
      properties: {
        perfil: { type: 'string', enum: ['conservador', 'moderado', 'arrojado'] },
      },
      required: ['perfil'],
    },
  },
  {
    name: 'atualizar_idade_inicio_simulacao',
    description: 'Força a idade em que a simulação começa, sobrepondo a idade real derivada de data_nascimento. Útil quando o cliente quer ver o plano a partir de uma idade específica que não é a atual. Passe null para limpar o override e voltar a usar a idade real.',
    input_schema: {
      type: 'object',
      properties: {
        idade: {
          type: ['number', 'null'],
          description: 'Idade que vira "hoje" na simulação (1 a 120), ou null para remover o override.',
        },
      },
      required: ['idade'],
    },
  },

  // ─── Ativos (3) ───────────────────────────────────────────────
  {
    name: 'listar_ativos',
    description: 'Lista todos os ativos do cliente (imóveis, financeiros, salário, aluguéis, herança, etc).',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'criar_ativo',
    description: 'Cria um novo ativo. Use natureza "estoque" para patrimônio (imóvel, financeiro, carro) e "fluxo" para receitas recorrentes anuais (salário, aluguel, aposentadoria).',
    input_schema: {
      type: 'object',
      properties: {
        nome: { type: 'string' },
        tipo: {
          type: 'string',
          enum: ['imovel', 'financeiro_liquido', 'salario', 'aluguel', 'heranca_recebida', 'carro', 'terreno', 'outro'],
        },
        natureza: { type: 'string', enum: ['estoque', 'fluxo'] },
        valor: { type: 'number', description: 'Valor em reais (anual se fluxo, valor de mercado se estoque).' },
        idade_inicio: { type: 'number' },
        idade_fim: { type: 'number' },
        indexado_inflacao: { type: 'boolean' },
      },
      required: ['nome', 'tipo', 'natureza', 'valor', 'idade_inicio', 'idade_fim'],
    },
  },
  {
    name: 'remover_ativo',
    description: 'Remove (soft-delete) um ativo do cliente pelo ID. Use listar_ativos antes para descobrir o ID.',
    input_schema: {
      type: 'object',
      properties: { asset_id: { type: 'string' } },
      required: ['asset_id'],
    },
  },

  // ─── Despesas (3) ─────────────────────────────────────────────
  {
    name: 'listar_despesas',
    description: 'Lista todas as despesas cadastradas do cliente.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'criar_despesa',
    description: 'Cria uma despesa recorrente mensal.',
    input_schema: {
      type: 'object',
      properties: {
        categoria: {
          type: 'string',
          enum: ['moradia', 'alimentacao', 'transporte', 'saude', 'lazer', 'servicos_dom', 'filhos', 'estudos', 'viagens', 'cuidado_familia', 'outro'],
        },
        descricao: { type: 'string' },
        valor_mensal: { type: 'number' },
        idade_inicio: { type: 'number' },
        idade_fim: { type: 'number' },
        essencial: { type: 'boolean' },
        indexado_inflacao: { type: 'boolean' },
      },
      required: ['categoria', 'descricao', 'valor_mensal', 'idade_inicio', 'idade_fim', 'essencial'],
    },
  },
  {
    name: 'remover_despesa',
    description: 'Remove uma despesa pelo ID.',
    input_schema: {
      type: 'object',
      properties: { expense_id: { type: 'string' } },
      required: ['expense_id'],
    },
  },

  // ─── Eventos (3) ──────────────────────────────────────────────
  {
    name: 'listar_eventos',
    description: 'Lista todos os eventos financeiros pontuais do cliente (sonhos, compras, viagens, imprevistos, heranças).',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'criar_evento',
    description: 'Cria um evento financeiro pontual (sonho, compra, viagem, imprevisto, herança). Valor com sinal: + para entrada, - para saída. Para metas de compra, use sempre saída.',
    input_schema: {
      type: 'object',
      properties: {
        tipo: { type: 'string', enum: ['sonho', 'compra', 'viagem_pontual', 'imprevisto', 'heranca'] },
        descricao: { type: 'string' },
        valor: { type: 'number', description: 'Use NEGATIVO para saídas (compras, sonhos, viagens), POSITIVO para entradas (herança).' },
        idade_inicio: { type: 'number' },
        idade_fim: { type: 'number', description: 'Opcional. Use para eventos que duram mais de um ano.' },
        padrao_recorrencia: { type: 'string', enum: ['unico', 'recorrente_anual', 'recorrente_espacado'] },
        intervalo_anos: { type: 'number', description: 'Só para recorrente_espacado.' },
        indexado_inflacao: { type: 'boolean' },
      },
      required: ['tipo', 'descricao', 'valor', 'idade_inicio', 'padrao_recorrencia'],
    },
  },
  {
    name: 'remover_evento',
    description: 'Remove um evento pelo ID.',
    input_schema: {
      type: 'object',
      properties: { event_id: { type: 'string' } },
      required: ['event_id'],
    },
  },

  // ─── Passivos (3) ─────────────────────────────────────────────
  {
    name: 'listar_passivos',
    description: 'Lista todos os passivos (financiamentos, empréstimos) do cliente.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'criar_passivo',
    description: 'Cria um passivo (financiamento, empréstimo, cartão).',
    input_schema: {
      type: 'object',
      properties: {
        nome: { type: 'string' },
        tipo: { type: 'string', description: 'Ex.: financiamento_imovel, emprestimo, cartao, outro.' },
        saldo_atual: { type: 'number' },
        juros_aa: { type: 'number', description: 'Taxa anual em fração (0.12 = 12% a.a).' },
        parcela_mensal: { type: 'number' },
        idade_inicio: { type: 'number' },
        idade_fim: { type: 'number' },
      },
      required: ['nome', 'tipo', 'saldo_atual', 'parcela_mensal', 'idade_inicio', 'idade_fim'],
    },
  },
  {
    name: 'remover_passivo',
    description: 'Remove um passivo pelo ID.',
    input_schema: {
      type: 'object',
      properties: { liability_id: { type: 'string' } },
      required: ['liability_id'],
    },
  },

  // ─── Ações de excedente (3) ───────────────────────────────────
  {
    name: 'listar_acoes_excedente',
    description: 'Lista as ações registradas para anos com excedente positivo na simulação.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'registrar_acao_excedente',
    description: 'Registra ação para anos com sobra de dinheiro (ex.: aportar em renda fixa, antecipar quitação).',
    input_schema: {
      type: 'object',
      properties: {
        acao: { type: 'string' },
        idade: { type: 'number', description: 'Opcional. Se omitido, vale como ação padrão para todos os anos.' },
      },
      required: ['acao'],
    },
  },
  {
    name: 'remover_acao_excedente',
    description: 'Remove uma ação de excedente pelo ID.',
    input_schema: {
      type: 'object',
      properties: { acao_id: { type: 'string' } },
      required: ['acao_id'],
    },
  },

  // ─── Cenários (2) ─────────────────────────────────────────────
  {
    name: 'listar_cenarios',
    description: 'Lista todos os cenários do cliente (base, otimista, pessimista, personalizados).',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'remover_cenario_personalizado',
    description: 'Remove um cenário personalizado pelo ID. Não funciona para base/otimista/pessimista.',
    input_schema: {
      type: 'object',
      properties: { scenario_id: { type: 'string' } },
      required: ['scenario_id'],
    },
  },
];
