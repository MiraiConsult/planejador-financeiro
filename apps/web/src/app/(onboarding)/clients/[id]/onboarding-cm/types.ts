export interface DraftCategoria {
  tempId: string;
  nome: string;
  tipo: 'receita' | 'gasto' | 'ambos';
  cor: string;
  icone: string;
  parentTempId?: string | null;
}

export interface DraftLancamentoInicial {
  tempId: string;
  data: string;
  descricao: string;
  valor: number;
  eh_receita: boolean;
  categoria_tempId?: string | null;
  centro_id?: string | null;
}

export interface WizardCMState {
  centros_aplicados: boolean;
  categorias: DraftCategoria[];
  lancamentos: DraftLancamentoInicial[];
}

export const emptyCMState: WizardCMState = {
  centros_aplicados: false,
  categorias: [],
  lancamentos: [],
};

// Defaults brasileiros pra acelerar o setup do cliente.
export const CATEGORIAS_DEFAULT: Omit<DraftCategoria, 'tempId'>[] = [
  { nome: 'Moradia', tipo: 'gasto', cor: '#0ea5e9', icone: 'Home' },
  { nome: 'Alimentação', tipo: 'gasto', cor: '#10b981', icone: 'Utensils' },
  { nome: 'Transporte', tipo: 'gasto', cor: '#f59e0b', icone: 'Car' },
  { nome: 'Saúde', tipo: 'gasto', cor: '#ef4444', icone: 'Heart' },
  { nome: 'Educação', tipo: 'gasto', cor: '#8b5cf6', icone: 'GraduationCap' },
  { nome: 'Lazer', tipo: 'gasto', cor: '#ec4899', icone: 'Smile' },
  { nome: 'Salário', tipo: 'receita', cor: '#22c55e', icone: 'Wallet' },
  { nome: 'Outras Receitas', tipo: 'receita', cor: '#06b6d4', icone: 'TrendingUp' },
];
