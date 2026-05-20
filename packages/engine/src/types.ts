// Tipos públicos do engine de simulação.
// Espelham (em forma TS) os schemas M_01–M_06 + M_09 da planilha de origem.

export type PerfilCarteira = 'conservador' | 'moderado' | 'arrojado' | 'custom';

export type AssetTipo =
  | 'imovel'
  | 'financeiro_liquido'
  | 'salario'
  | 'aluguel'
  | 'heranca_recebida'
  | 'carro'
  | 'terreno'
  | 'outro';

export type AssetNatureza = 'estoque' | 'fluxo';

export type ExpenseCategoria =
  | 'moradia'
  | 'alimentacao'
  | 'transporte'
  | 'saude'
  | 'lazer'
  | 'servicos_dom'
  | 'filhos'
  | 'estudos'
  | 'viagens'
  | 'cuidado_familia'
  | 'outro';

export type EventTipo =
  | 'sonho'
  | 'compra'
  | 'heranca'
  | 'venda_ativo'
  | 'viagem_pontual'
  | 'imprevisto';

export type Recorrencia = 'unico' | 'recorrente_anual' | 'recorrente_espacado';

export type Prioridade = 'essencial' | 'desejavel' | 'opcional';

export type ScenarioTipo = 'base' | 'otimista' | 'pessimista' | 'personalizado';

export interface Client {
  id: string;
  nome_completo: string;
  data_nascimento: string;          // ISO date (yyyy-mm-dd)
  expectativa_vida_anos: number;
  idade_aposentadoria?: number;
  idade_reducao_trabalho?: number;
  perfil_carteira: PerfilCarteira;
  custom_retorno_aa?: number;       // só quando perfil = 'custom'
  custom_volatilidade_aa?: number;
}

export interface Asset {
  id: string;
  nome: string;
  tipo: AssetTipo;
  natureza: AssetNatureza;
  valor: number;                    // BRL
  idade_inicio: number;
  idade_fim: number;
  indexado_inflacao: boolean;
  taxa_retorno_aa?: number;         // só usado em estoques NÃO-financeiros (valorização)
  valorizacao_aa?: number;          // alias preferencial p/ estoques (carros podem ter negativo)
  prioridade_liquidacao?: number;   // 1 = vende primeiro; null = ordena por menor valor
  // Receitas (natureza=fluxo): crescimento real anual e recorrência
  crescimento_real_aa?: number;     // % a.a. acima da inflação (negativo = redução)
  padrao_recorrencia?: Recorrencia; // só faz sentido em fluxos; default = recorrente_anual
  intervalo_anos?: number;          // obrigatório se padrao=recorrente_espacado
  overrides?: Record<string, number>; // valor anual nominal por idade ({"60":5000})
  notas?: string;
}

export interface Expense {
  id: string;
  categoria: ExpenseCategoria;
  descricao: string;
  valor_mensal: number;             // BRL/mês
  idade_inicio: number;
  idade_fim: number;
  indexado_inflacao: boolean;
  essencial: boolean;
  crescimento_real_aa?: number;     // % a.a. acima da inflação (negativo = redução)
  padrao_recorrencia?: Recorrencia; // default = recorrente_anual
  intervalo_anos?: number;          // obrigatório se padrao=recorrente_espacado
  overrides?: Record<string, number>; // valor anual nominal por idade
  notas?: string;
}

export interface FinancialEvent {
  id: string;
  tipo: EventTipo;
  descricao: string;
  valor: number;                    // BRL, COM SINAL (+ entrada, - saída)
  padrao_recorrencia: Recorrencia;
  idade_inicio: number;
  idade_fim?: number;
  intervalo_anos?: number;          // obrigatório se padrao=recorrente_espacado
  indexado_inflacao: boolean;
  prioridade?: Prioridade;
  ativo_referenciado?: string;      // p/ tipo=venda_ativo
  overrides?: Record<string, number>; // valor nominal por idade (sobrescreve evento naquele ano)
  notas?: string;
}

export interface Assumptions {
  inflacao_anual_br: number;

  retorno_conservador: number;
  volatilidade_conservador: number;
  retorno_moderado: number;
  volatilidade_moderado: number;
  retorno_arrojado: number;
  volatilidade_arrojado: number;

  valorizacao_imovel_uso: number;
  taxa_desconto_npv: number;
  imposto_renda_efetivo: number;
  custo_credito_aa: number;
}

export interface Scenario {
  id: string;
  nome: string;
  tipo: ScenarioTipo;
  overrides_premissas?: Partial<Assumptions>;
  // overrides_ativos / overrides_despesas / eventos_adicionais / eventos_removidos:
  // implementados em fase 2. POC só lê base.
  horizonte_idade_final?: number;
}

export interface SimulationInput {
  client: Client;
  assets: Asset[];
  expenses: Expense[];
  events: FinancialEvent[];
  assumptions: Assumptions;
  scenario: Scenario;
  reference_date?: string;          // ISO; default: hoje. Usado para derivar idade_inicial.
}

export interface VendaForcada {
  asset_id: string;
  nome: string;
  valor_venda: number;
}

export interface EventoDisparado {
  event_id: string;
  descricao: string;
  valor_nominal_corrigido: number;  // com sinal
}

export interface RowDetalhes {
  receitas_por_ativo: Array<{ asset_id: string; nome: string; valor: number }>;
  despesas_por_categoria: Record<string, number>;
  eventos_disparados: EventoDisparado[];
  vendas_forcadas: VendaForcada[];
}

export interface SimulationRow {
  idade: number;
  ano_calendario: number;
  saldo_inicial: number;
  receitas_total: number;
  despesas_essenciais: number;
  despesas_nao_essenciais: number;
  eventos_positivos: number;
  eventos_negativos: number;
  fluxo_liquido: number;
  juros_divida: number;
  retorno: number;
  saldo_final: number;              // saldo financeiro líquido
  vendas_forcadas_total: number;
  saldo_divida: number;
  ativos_estoque_atualizados: number;
  patrimonio_total: number;         // saldo_final + estoques - divida
  detalhes: RowDetalhes;
}

export interface SimulationSummary {
  npv_fluxo_liquido: number;
  patrimonio_final: number;
  patrimonio_pico: number;
  patrimonio_pico_idade: number;
  idade_break_even: number | null;  // primeira idade em que saldo_final < 0
  drawdown_maximo: number;          // (pico - vale pós-pico) / pico, no patrimonio_total
  indice_preservacao: number;       // patrimonio_final / patrimonio_pico
}

export interface SimulationResult {
  input_summary: {
    cliente: string;
    cenario: string;
    idade_inicial: number;
    idade_final: number;
    saldo_financeiro_inicial: number;
    patrimonio_iliquido_inicial: number;
  };
  rows: SimulationRow[];
  summary: SimulationSummary;
}
