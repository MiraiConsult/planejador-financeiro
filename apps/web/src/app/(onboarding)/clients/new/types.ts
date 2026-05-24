export type PerfilCarteira = 'conservador' | 'moderado' | 'arrojado' | 'custom';

export interface DraftAsset {
  id: string;
  nome: string;
  tipo:
    | 'imovel'
    | 'financeiro_liquido'
    | 'salario'
    | 'aluguel'
    | 'heranca_recebida'
    | 'carro'
    | 'terreno'
    | 'outro';
  natureza: 'estoque' | 'fluxo';
  valor: number;
  idade_inicio: number;
  idade_fim: number;
  indexado_inflacao: boolean;
}

export interface DraftExpense {
  id: string;
  categoria:
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
  descricao: string;
  valor_mensal: number;
  idade_inicio: number;
  idade_fim: number;
  essencial: boolean;
}

export interface DraftEvent {
  id: string;
  tipo:
    | 'sonho'
    | 'compra'
    | 'heranca'
    | 'venda_ativo'
    | 'viagem_pontual'
    | 'imprevisto';
  descricao: string;
  valor: number; // com sinal (padrão pra anos sem override)
  padrao_recorrencia: 'unico' | 'recorrente_anual' | 'recorrente_espacado';
  idade_inicio: number;
  idade_fim: number | null;
  intervalo_anos: number | null;
  indexado_inflacao: boolean;
  /** valor diferente por idade: { "40": -200000, "50": -500000 } */
  overrides?: Record<string, number>;
}

export interface DraftLiability {
  id: string;
  nome: string;
  tipo: string;
  saldo_atual: number;
  juros_aa: number | null;
  parcela_mensal: number;
  idade_inicio: number;
  idade_fim: number;
}

export interface OnboardingPayload {
  nome_completo: string;
  data_nascimento: string; // ISO
  expectativa_vida_anos: number;
  idade_aposentadoria: number | null;
  idade_reducao_trabalho: number | null;
  perfil_carteira: PerfilCarteira;
  custom_retorno_aa: number | null;
  custom_volatilidade_aa: number | null;
  assets: DraftAsset[];
  expenses: DraftExpense[];
  events: DraftEvent[];
  liabilities: DraftLiability[];
}
