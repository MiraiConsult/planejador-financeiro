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
  valor: number; // com sinal
  padrao_recorrencia: 'unico' | 'recorrente_anual' | 'recorrente_espacado';
  idade_inicio: number;
  idade_fim: number | null;
  intervalo_anos: number | null;
  indexado_inflacao: boolean;
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
}
