// Modelo + templates dos centros do Controle Financeiro.
// Centro = divisão configurável pelo consultor pra organizar lançamentos
// (pode ser pessoa, empresa, projeto…). Hierarquia opcional pai/filho.

export type TipoVisual = 'pessoa' | 'empresa' | 'projeto' | 'grupo' | 'outro';

export interface Centro {
  id: string;
  client_id: string;
  parent_id: string | null;
  nome: string;
  tipo_visual: TipoVisual;
  tem_demonstrativo: boolean;
  cor: string;
  icone: string;
  ordem: number;
  ativo: boolean;
}

export interface CentroNode extends Centro {
  filhos: CentroNode[];
  /** Profundidade na árvore (0 = raiz). */
  depth: number;
}

/** Monta a árvore (raízes ordenadas por `ordem`, filhos idem, recursivo). */
export function buildTree(centros: Centro[]): CentroNode[] {
  const byId = new Map<string, CentroNode>();
  centros.forEach((c) => byId.set(c.id, { ...c, filhos: [], depth: 0 }));
  const raizes: CentroNode[] = [];
  for (const node of byId.values()) {
    if (node.parent_id && byId.has(node.parent_id)) {
      const pai = byId.get(node.parent_id)!;
      node.depth = pai.depth + 1;
      pai.filhos.push(node);
    } else {
      raizes.push(node);
    }
  }
  const sortRec = (arr: CentroNode[]): void => {
    arr.sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-BR'));
    arr.forEach((n) => sortRec(n.filhos));
  };
  sortRec(raizes);
  // Após sort, recalcula depth (caso a hierarquia tenha mudado)
  const setDepth = (n: CentroNode, d: number): void => {
    n.depth = d;
    n.filhos.forEach((f) => setDepth(f, d + 1));
  };
  raizes.forEach((r) => setDepth(r, 0));
  return raizes;
}

/** Lista achatada na ordem visual (DFS). Útil pra dropdowns indentados. */
export function flatten(tree: CentroNode[]): CentroNode[] {
  const out: CentroNode[] = [];
  const walk = (n: CentroNode): void => { out.push(n); n.filhos.forEach(walk); };
  tree.forEach(walk);
  return out;
}

/** Coleta o id do nó + todos os descendentes (pra agregação). */
export function descendentes(node: CentroNode): string[] {
  const out = [node.id];
  node.filhos.forEach((f) => out.push(...descendentes(f)));
  return out;
}

/** Encontra um nó na árvore por id. */
export function encontrarNode(tree: CentroNode[], id: string): CentroNode | null {
  for (const n of tree) {
    if (n.id === id) return n;
    const f = encontrarNode(n.filhos, id);
    if (f) return f;
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────
// Templates pré-prontos
// ────────────────────────────────────────────────────────────────────

export interface TemplateCentro {
  nome: string;
  tipo_visual: TipoVisual;
  tem_demonstrativo?: boolean;
  cor: string;
  icone: string;
  filhos?: TemplateCentro[];
}

export interface Template {
  id: string;
  nome: string;
  descricao: string;
  centros: TemplateCentro[];
}

export const TEMPLATES: Template[] = [
  {
    id: 'solo',
    nome: 'Pessoa solo',
    descricao: 'Um centro pessoal + viagens. Bom pra quem mora sozinho ou só quer rastrear gastos próprios.',
    centros: [
      { nome: 'Pessoal', tipo_visual: 'pessoa', cor: '#2563eb', icone: 'User' },
      { nome: 'Viagens', tipo_visual: 'projeto', cor: '#9333ea', icone: 'Plane' },
    ],
  },
  {
    id: 'casal',
    nome: 'Casal',
    descricao: 'Família agrupando duas pessoas + gastos compartilhados + viagens à parte.',
    centros: [
      {
        nome: 'Família', tipo_visual: 'grupo', cor: '#0891b2', icone: 'Users',
        filhos: [
          { nome: 'Pessoa 1', tipo_visual: 'pessoa', cor: '#2563eb', icone: 'User' },
          { nome: 'Pessoa 2', tipo_visual: 'pessoa', cor: '#db2777', icone: 'User' },
          { nome: 'Compartilhado', tipo_visual: 'outro', cor: '#059669', icone: 'Home' },
        ],
      },
      { nome: 'Viagens', tipo_visual: 'projeto', cor: '#ea580c', icone: 'Plane' },
    ],
  },
  {
    id: 'empresa-pessoal',
    nome: 'Empresa + pessoal',
    descricao: 'Caso do empreendedor: empresa com demonstrativo (rec − despesas = líquido) + gastos pessoais + viagens.',
    centros: [
      { nome: 'Pessoal', tipo_visual: 'pessoa', cor: '#2563eb', icone: 'User' },
      { nome: 'Empresa', tipo_visual: 'empresa', tem_demonstrativo: true, cor: '#dc2626', icone: 'Building2' },
      { nome: 'Viagens', tipo_visual: 'projeto', cor: '#9333ea', icone: 'Plane' },
    ],
  },
  {
    id: 'multi-empresas',
    nome: 'Múltiplas empresas',
    descricao: 'Quem toca mais de um negócio: cada empresa com seu próprio demonstrativo.',
    centros: [
      { nome: 'Pessoal', tipo_visual: 'pessoa', cor: '#2563eb', icone: 'User' },
      { nome: 'Empresa 1', tipo_visual: 'empresa', tem_demonstrativo: true, cor: '#dc2626', icone: 'Building2' },
      { nome: 'Empresa 2', tipo_visual: 'empresa', tem_demonstrativo: true, cor: '#f59e0b', icone: 'Building2' },
      { nome: 'Viagens', tipo_visual: 'projeto', cor: '#9333ea', icone: 'Plane' },
    ],
  },
];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

// ────────────────────────────────────────────────────────────────────
// Mapeamento legado: tipo (text) → defaults pra criação de centro
// ────────────────────────────────────────────────────────────────────

export const TIPO_LEGADO_DEFAULTS: Record<string, Omit<TemplateCentro, 'filhos'>> = {
  pessoal: { nome: 'Pessoal', tipo_visual: 'pessoa', cor: '#2563eb', icone: 'User' },
  viagem:  { nome: 'Viagens', tipo_visual: 'projeto', cor: '#9333ea', icone: 'Plane' },
  mirai:   { nome: 'Mirai',   tipo_visual: 'empresa', cor: '#dc2626', icone: 'Building2', tem_demonstrativo: true },
};

// ────────────────────────────────────────────────────────────────────
// Catálogo de ícones disponíveis pro picker
// ────────────────────────────────────────────────────────────────────

export const ICONES_DISPONIVEIS = [
  'Receipt', 'User', 'Users', 'Home', 'Building2', 'Briefcase', 'Plane',
  'Car', 'UtensilsCrossed', 'ShoppingCart', 'Heart', 'GraduationCap',
  'Baby', 'PawPrint', 'Music', 'Gamepad2', 'Sparkles', 'TrendingUp',
  'Wallet', 'CreditCard', 'PiggyBank', 'Landmark', 'Coins', 'Trees',
] as const;

export const CORES_DISPONIVEIS = [
  '#2563eb', '#dc2626', '#059669', '#9333ea', '#f59e0b', '#0891b2',
  '#ea580c', '#db2777', '#16a34a', '#7c3aed', '#0d9488', '#475569',
] as const;
