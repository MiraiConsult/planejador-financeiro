// Fixture: Marcelo Castro (extraído de M_08_Exemplo_Marcelo da planilha-fonte).
// Tudo em BRL conforme decisão Q4: cliente cadastra valores já convertidos.

import type {
  Asset,
  Assumptions,
  Client,
  Expense,
  FinancialEvent,
  Scenario,
  SimulationInput,
} from '../types';

export const marceloClient: Client = {
  id: 'marcelo-001',
  nome_completo: 'Marcelo Castro',
  data_nascimento: '1965-01-01',
  expectativa_vida_anos: 91,
  idade_aposentadoria: 65,
  idade_reducao_trabalho: 60,
  perfil_carteira: 'moderado',
};

export const marceloAssets: Asset[] = [
  // Estoques financeiros — formam o saldo inicial
  { id: 'a01', nome: 'Ativos Financeiros Líq Brasil',   tipo: 'financeiro_liquido', natureza: 'estoque', valor: 9_000_000, idade_inicio: 60, idade_fim: 91, indexado_inflacao: true },
  { id: 'a02', nome: 'Ativos Financeiros Líq Exterior', tipo: 'financeiro_liquido', natureza: 'estoque', valor:   811_800, idade_inicio: 60, idade_fim: 91, indexado_inflacao: true },

  // Estoques NÃO-financeiros — patrimônio ilíquido (rendimento só por valorização)
  { id: 'a03', nome: 'Herança',          tipo: 'heranca_recebida', natureza: 'estoque', valor:   188_760, idade_inicio: 60, idade_fim: 91, indexado_inflacao: true },
  { id: 'a04', nome: 'Apto POA',         tipo: 'imovel', natureza: 'estoque', valor:   330_000, idade_inicio: 60, idade_fim: 91, indexado_inflacao: true },
  { id: 'a05', nome: 'Casa Xangri-lá',   tipo: 'imovel', natureza: 'estoque', valor:   525_000, idade_inicio: 60, idade_fim: 91, indexado_inflacao: true },
  { id: 'a06', nome: 'Terreno Horizon',  tipo: 'terreno', natureza: 'estoque', valor:  330_000, idade_inicio: 60, idade_fim: 91, indexado_inflacao: true },
  { id: 'a07', nome: 'Fazenda',          tipo: 'imovel', natureza: 'estoque', valor: 3_000_000, idade_inicio: 60, idade_fim: 91, indexado_inflacao: true },
  { id: 'a09', nome: 'Imóvel Portugal',  tipo: 'imovel', natureza: 'estoque', valor: 2_270_000, idade_inicio: 60, idade_fim: 91, indexado_inflacao: true },

  // Fluxos
  { id: 'a08', nome: 'Arrendamento Fazenda', tipo: 'aluguel', natureza: 'fluxo', valor: 135_000, idade_inicio: 60, idade_fim: 91, indexado_inflacao: true },
  { id: 'a10', nome: 'Salário MKT França',   tipo: 'salario', natureza: 'fluxo', valor: 132_500, idade_inicio: 60, idade_fim: 80, indexado_inflacao: true },
];

export const marceloExpenses: Expense[] = [
  { id: 'd01', categoria: 'moradia',         descricao: 'Aluguel',        valor_mensal:  9_882, idade_inicio: 60, idade_fim: 91, indexado_inflacao: true, essencial: true },
  { id: 'd02', categoria: 'alimentacao',     descricao: 'Alimentação',    valor_mensal:  3_290, idade_inicio: 60, idade_fim: 91, indexado_inflacao: true, essencial: true },
  { id: 'd03', categoria: 'transporte',      descricao: 'Transporte',     valor_mensal:    438, idade_inicio: 60, idade_fim: 91, indexado_inflacao: true, essencial: true },
  { id: 'd04', categoria: 'saude',           descricao: 'Saúde',          valor_mensal:    365, idade_inicio: 60, idade_fim: 91, indexado_inflacao: true, essencial: true },
  { id: 'd05', categoria: 'lazer',           descricao: 'Lazer',          valor_mensal:  9_113, idade_inicio: 60, idade_fim: 91, indexado_inflacao: true, essencial: false },
  { id: 'd06', categoria: 'servicos_dom',    descricao: 'Faxina',         valor_mensal:  3_495, idade_inicio: 60, idade_fim: 91, indexado_inflacao: true, essencial: false },
  { id: 'd07', categoria: 'filhos',          descricao: 'Filhos',         valor_mensal: 13_609, idade_inicio: 60, idade_fim: 75, indexado_inflacao: true, essencial: true },
  { id: 'd08', categoria: 'estudos',         descricao: 'Estudos',        valor_mensal:  2_475, idade_inicio: 60, idade_fim: 70, indexado_inflacao: true, essencial: true },
  { id: 'd09', categoria: 'viagens',         descricao: 'Viagens',        valor_mensal:  7_957, idade_inicio: 60, idade_fim: 91, indexado_inflacao: true, essencial: false },
  { id: 'd10', categoria: 'cuidado_familia', descricao: 'Mãe (cuidado)',  valor_mensal: 22_333, idade_inicio: 60, idade_fim: 75, indexado_inflacao: true, essencial: true },
];

export const marceloEvents: FinancialEvent[] = [
  {
    id: 'e01',
    tipo: 'compra',
    descricao: 'Compra imóvel Portugal',
    valor: -2_270_000,
    padrao_recorrencia: 'unico',
    idade_inicio: 60,
    indexado_inflacao: false,
    prioridade: 'desejavel',
  },
  {
    id: 'e02',
    tipo: 'viagem_pontual',
    descricao: 'Festa Casamento (filho)',
    valor: -126_000,
    padrao_recorrencia: 'unico',
    idade_inicio: 65,
    indexado_inflacao: true,
    prioridade: 'essencial',
  },
];

export const defaultAssumptions: Assumptions = {
  inflacao_anual_br: 0.04,
  retorno_conservador: 0.08,
  volatilidade_conservador: 0.04,
  retorno_moderado: 0.10,
  volatilidade_moderado: 0.08,
  retorno_arrojado: 0.13,
  volatilidade_arrojado: 0.15,
  valorizacao_imovel_uso: 0,
  taxa_desconto_npv: 0.06,
  imposto_renda_efetivo: 0.15,
  custo_credito_aa: 0.15,
};

export const baseScenario: Scenario = {
  id: 'sc-base',
  nome: 'Base',
  tipo: 'base',
};

/** Input pronto pra `simulate()`. Reference_date fixa em 2025-01-15 ⇒ idade = 60. */
export const marceloSimulationInput: SimulationInput = {
  client: marceloClient,
  assets: marceloAssets,
  expenses: marceloExpenses,
  events: marceloEvents,
  assumptions: defaultAssumptions,
  scenario: baseScenario,
  reference_date: '2025-01-15',
};
