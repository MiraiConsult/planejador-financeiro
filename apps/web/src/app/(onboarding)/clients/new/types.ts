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
  /** Crescimento real anual em FRAÇÃO (0.10 = 10% a.a.). Só faz sentido pra fluxos. */
  crescimento_real_aa?: number | null;
}

/**
 * Categorias padrão (literais conhecidos). Aceitamos string livre para o
 * consultor cadastrar "centros" próprios (ex.: "Carro novo", "Casa de praia").
 * O Supabase já armazena como text livre desde a migration 0012.
 */
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
  | 'outro'
  | (string & {});

export interface DraftExpense {
  id: string;
  categoria: ExpenseCategoria;
  descricao: string;
  valor_mensal: number;
  idade_inicio: number;
  idade_fim: number;
  essencial: boolean;
  /** Crescimento real anual em FRAÇÃO (0.10 = 10% a.a.). */
  crescimento_real_aa?: number | null;
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

export interface PerfilSubjetivo {
  visao_30_anos?: string;
  medo_principal?: string;
  significado_dinheiro?: string;
  referencia_dinheiro?: string;
  legado?: string;
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
  perfil_subjetivo: PerfilSubjetivo;
  transcricao?: string;
  assets: DraftAsset[];
  expenses: DraftExpense[];
  events: DraftEvent[];
  liabilities: DraftLiability[];
}
