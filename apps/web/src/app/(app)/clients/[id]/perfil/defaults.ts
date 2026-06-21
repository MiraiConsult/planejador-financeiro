// Tipos e defaults compartilhados entre page/form/actions do perfil.
// Mantido fora de actions.ts porque 'use server' não permite exports
// que não sejam funções async.

export interface FaixaExcedente {
  ate_idade: number | null; // null = última faixa (até morrer)
  pct_investido: number;    // 0..100
}

export interface PerfilInput {
  nome_completo: string;
  data_nascimento: string; // ISO yyyy-mm-dd
  expectativa_vida_anos: number;
  idade_aposentadoria: number | null;
  idade_reducao_trabalho: number | null;
  perfil_carteira: 'conservador' | 'moderado' | 'arrojado' | 'custom';
  custom_retorno_aa: number | null;
  custom_volatilidade_aa: number | null;
  pais_residencia: string;
  estado_civil: string | null;
  alocacao_excedente: FaixaExcedente[];
}

export const DEFAULT_ALOCACAO_EXCEDENTE: FaixaExcedente[] = [
  { ate_idade: 45, pct_investido: 80 },
  { ate_idade: 60, pct_investido: 60 },
  { ate_idade: null, pct_investido: 40 },
];
