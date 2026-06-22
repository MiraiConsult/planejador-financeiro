// Taxonomia enxuta de categorias do Controle Financeiro, mapeada a partir da
// taxonomia do Banco MCP / Pluggy (130 categorias) pelos 2 primeiros dígitos
// do categoryId. Cada macro-categoria agrupa as subcategorias do provedor.
//
// Usada em 2 lugares:
// - Seed das categorias num cliente (semearCategoriasPadrao)
// - Mapeamento categoryId → categoria local no sync (Edge Function tem uma
//   cópia deste mapa por prefixo; aqui é a fonte canônica pro app)

export interface CategoriaMacro {
  /** Prefixo de 2 dígitos do categoryId do provedor (chave de match). */
  prefix: string;
  nome: string;
  tipo: 'receita' | 'gasto' | 'ambos';
  cor: string;
  icone: string;
}

// Ordem importa: define a ordem de exibição.
export const TAXONOMIA_MACRO: CategoriaMacro[] = [
  { prefix: '01', nome: 'Receitas', tipo: 'receita', cor: '#22c55e', icone: 'TrendingUp' },
  { prefix: '03', nome: 'Investimentos', tipo: 'ambos', cor: '#0ea5e9', icone: 'LineChart' },
  { prefix: '10', nome: 'Mercado', tipo: 'gasto', cor: '#16a34a', icone: 'ShoppingCart' },
  { prefix: '11', nome: 'Alimentação', tipo: 'gasto', cor: '#f97316', icone: 'Utensils' },
  { prefix: '17', nome: 'Moradia', tipo: 'gasto', cor: '#0284c7', icone: 'Home' },
  { prefix: '19', nome: 'Transporte', tipo: 'gasto', cor: '#f59e0b', icone: 'Car' },
  { prefix: '18', nome: 'Saúde', tipo: 'gasto', cor: '#ef4444', icone: 'Heart' },
  { prefix: '07', nome: 'Serviços', tipo: 'gasto', cor: '#8b5cf6', icone: 'Wrench' },
  { prefix: '09', nome: 'Serviços Digitais', tipo: 'gasto', cor: '#6366f1', icone: 'Monitor' },
  { prefix: '08', nome: 'Compras', tipo: 'gasto', cor: '#ec4899', icone: 'ShoppingBag' },
  { prefix: '21', nome: 'Lazer', tipo: 'gasto', cor: '#d946ef', icone: 'Smile' },
  { prefix: '12', nome: 'Viagens', tipo: 'gasto', cor: '#14b8a6', icone: 'Plane' },
  { prefix: '20', nome: 'Seguros', tipo: 'gasto', cor: '#64748b', icone: 'Shield' },
  { prefix: '15', nome: 'Impostos', tipo: 'gasto', cor: '#475569', icone: 'Landmark' },
  { prefix: '16', nome: 'Taxas Bancárias', tipo: 'gasto', cor: '#94a3b8', icone: 'Banknote' },
  { prefix: '02', nome: 'Empréstimos e Financiamentos', tipo: 'gasto', cor: '#b91c1c', icone: 'CreditCard' },
  { prefix: '06', nome: 'Obrigações Legais', tipo: 'gasto', cor: '#78716c', icone: 'Scale' },
  { prefix: '13', nome: 'Doações', tipo: 'gasto', cor: '#06b6d4', icone: 'HandHeart' },
  { prefix: '14', nome: 'Apostas', tipo: 'gasto', cor: '#a16207', icone: 'Dices' },
  { prefix: '05', nome: 'Transferências', tipo: 'ambos', cor: '#6b7280', icone: 'ArrowLeftRight' },
  { prefix: '04', nome: 'Transferências (mesma titularidade)', tipo: 'ambos', cor: '#9ca3af', icone: 'Repeat' },
  { prefix: '99', nome: 'Outros', tipo: 'ambos', cor: '#a8a29e', icone: 'Tag' },
];

/** Resolve o prefixo macro a partir de um categoryId do provedor. */
export function prefixDoCategoryId(categoryId: string | null | undefined): string {
  if (!categoryId) return '99';
  const p = categoryId.slice(0, 2);
  return TAXONOMIA_MACRO.some((c) => c.prefix === p) ? p : '99';
}
