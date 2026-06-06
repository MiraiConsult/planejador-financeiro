/**
 * Converte o resultado da extração de transcrição (estrutura da IA) em
 * um WizardState completo, pronto pra hidratar o wizard.
 */

import type { TranscriptExtraction } from '@/lib/ai/extractSchema';
import type { WizardState } from './Wizard';
import type {
  DraftAsset,
  DraftExpense,
  DraftEvent,
  DraftLiability,
} from './types';

/** Converte data de hoje pra ISO de nascimento dada idade atual. */
function birthdayFromAge(idade: number): string {
  const today = new Date();
  const birthYear = today.getUTCFullYear() - idade;
  return `${birthYear}-01-01`;
}

export function transcriptToWizardState(extr: TranscriptExtraction): WizardState {
  const expectativa = extr.cliente.expectativa_vida_anos ?? 90;
  const aposentadoria = extr.cliente.idade_aposentadoria ?? null;
  const perfil = extr.cliente.perfil_carteira ?? 'moderado';

  // Receitas viram DraftAsset natureza='fluxo'
  const receitasAsAssets: DraftAsset[] = extr.receitas.map((r) => ({
    id: crypto.randomUUID(),
    nome: r.nome,
    tipo: r.tipo === 'aluguel' ? 'aluguel' : r.tipo === 'salario' ? 'salario' : 'outro',
    natureza: 'fluxo' as const,
    valor: r.valor_anual,
    idade_inicio: r.idade_inicio,
    idade_fim: r.idade_fim,
    indexado_inflacao: true,
  }));

  // Ativos
  const ativos: DraftAsset[] = extr.ativos.map((a) => ({
    id: crypto.randomUUID(),
    nome: a.nome,
    tipo: a.tipo,
    natureza: 'estoque' as const,
    valor: a.valor,
    idade_inicio: a.idade_inicio,
    idade_fim: a.idade_fim,
    indexado_inflacao: true,
  }));

  const allAssets = [...receitasAsAssets, ...ativos];

  // Despesas
  const despesas: DraftExpense[] = extr.despesas.map((d) => ({
    id: crypto.randomUUID(),
    categoria: d.categoria,
    descricao: d.descricao,
    valor_mensal: d.valor_mensal,
    idade_inicio: d.idade_inicio,
    idade_fim: d.idade_fim,
    essencial: d.essencial,
  }));

  // Passivos
  const passivos: DraftLiability[] = extr.passivos.map((p) => ({
    id: crypto.randomUUID(),
    nome: p.nome,
    tipo: p.tipo,
    saldo_atual: p.saldo_atual,
    juros_aa: p.juros_aa_pct != null ? p.juros_aa_pct / 100 : null,
    parcela_mensal: p.parcela_mensal,
    idade_inicio: p.idade_inicio,
    idade_fim: p.idade_fim,
  }));

  // Eventos
  const eventos: DraftEvent[] = extr.eventos.map((e) => ({
    id: crypto.randomUUID(),
    tipo: e.tipo,
    descricao: e.descricao,
    valor: e.valor,
    padrao_recorrencia: e.recorrencia,
    idade_inicio: e.idade_inicio,
    idade_fim: e.idade_fim ?? null,
    intervalo_anos: e.intervalo_anos ?? null,
    indexado_inflacao: true,
  }));

  return {
    nome_completo: extr.cliente.nome_completo ?? '',
    data_nascimento: extr.cliente.idade_atual ? birthdayFromAge(extr.cliente.idade_atual) : '',
    expectativa_vida_anos: expectativa,
    idade_aposentadoria: aposentadoria,
    idade_reducao_trabalho: null,
    perfil_carteira: perfil,
    custom_retorno_aa: null,
    custom_volatilidade_aa: null,
    perfil_subjetivo: {
      visao_30_anos: extr.perfil_subjetivo.visao_30_anos ?? undefined,
      medo_principal: extr.perfil_subjetivo.medo_principal ?? undefined,
      significado_dinheiro: extr.perfil_subjetivo.significado_dinheiro ?? undefined,
      referencia_dinheiro: extr.perfil_subjetivo.referencia_dinheiro ?? undefined,
      legado: extr.perfil_subjetivo.legado ?? undefined,
    },
    assets: allAssets,
    expenses: despesas,
    events: eventos,
    liabilities: passivos,
  };
}

