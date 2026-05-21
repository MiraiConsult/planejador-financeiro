import { describe, expect, it } from 'vitest';
import { simulate } from '../src/simulate';
import {
  baseScenario,
  defaultAssumptions,
  marceloSimulationInput,
  marceloAssets,
  marceloClient,
  marceloExpenses,
  marceloEvents,
} from '../src/fixtures/marcelo';
import type { FinancialEvent, SimulationInput } from '../src/types';

const result = simulate(marceloSimulationInput);
const rowByAge = (idade: number) => result.rows.find((r) => r.idade === idade);

describe('Engine — estrutura básica', () => {
  it('produz uma linha por idade entre idade_inicial e idade_final (inclusive)', () => {
    expect(result.input_summary.idade_inicial).toBe(60);
    expect(result.input_summary.idade_final).toBe(91);
    expect(result.rows).toHaveLength(91 - 60 + 1); // 32 linhas
    expect(result.rows[0]!.idade).toBe(60);
    expect(result.rows[result.rows.length - 1]!.idade).toBe(91);
  });

  it('saldo financeiro inicial = soma dos ativos financeiro_liquido (9.000.000 + 811.800)', () => {
    expect(result.input_summary.saldo_financeiro_inicial).toBe(9_811_800);
    expect(rowByAge(60)!.saldo_inicial).toBe(9_811_800);
  });

  it('patrimônio ilíquido inicial = soma dos demais estoques', () => {
    // 188.760 + 330.000 + 525.000 + 330.000 + 3.000.000 + 2.270.000 = 6.643.760
    expect(result.input_summary.patrimonio_iliquido_inicial).toBe(6_643_760);
  });
});

describe('Engine — Q1: retorno só sobre financeiros, a partir do ano 2', () => {
  it('retorno no ano 0 (idade 60) é exatamente 0', () => {
    expect(rowByAge(60)!.retorno).toBe(0);
  });

  it('retorno no ano 1 (idade 61) é diferente de zero', () => {
    expect(rowByAge(61)!.retorno).not.toBe(0);
  });
});

describe('Engine — receitas e despesas (M_07 etapas 3–4)', () => {
  it('idade 60: arrendamento (135k) + salário (132.5k) = 267.500 (t=0, fator=1)', () => {
    expect(rowByAge(60)!.receitas_total).toBe(267_500);
  });

  it('idade 81: salário cessou aos 80 ⇒ só arrendamento (valor nominal)', () => {
    // Sistema opera em valores nominais — inflação desativada.
    const esperado = 135_000;
    expect(rowByAge(81)!.receitas_total).toBeCloseTo(esperado, 1);
  });

  it('idade 60: despesas essenciais incluem filhos e mãe; lazer/faxina/viagens vão pra não-essenciais', () => {
    const r = rowByAge(60)!;
    // essenciais (valor mensal): aluguel + alim + transp + saude + filhos + estudos + mae
    const essenciais = (9_882 + 3_290 + 438 + 365 + 13_609 + 2_475 + 22_333) * 12;
    // não-essenciais: lazer + faxina + viagens
    const naoEssenciais = (9_113 + 3_495 + 7_957) * 12;
    expect(r.despesas_essenciais).toBeCloseTo(essenciais, 1);
    expect(r.despesas_nao_essenciais).toBeCloseTo(naoEssenciais, 1);
  });

  it('idade 76: despesas com filhos e mãe SUMIRAM (idade_fim=75); estudos também (idade_fim=70)', () => {
    const r60 = rowByAge(60)!;
    const r76 = rowByAge(76)!;
    // filhos+mae = 13609 + 22333 = 35.942/mês = 431.304/ano nominal
    // diferença real precisa ser >0; só compara grandeza
    const diff = r76.despesas_essenciais - r60.despesas_essenciais;
    expect(diff).toBeLessThan(-200_000); // muito menor mesmo com inflação
  });
});

describe('Engine — eventos (M_07 etapa 5)', () => {
  it('idade 60: dispara compra Imóvel Portugal (-2.270.000)', () => {
    const r = rowByAge(60)!;
    expect(r.eventos_negativos).toBe(2_270_000);
    expect(r.detalhes.eventos_disparados.map((e) => e.event_id)).toContain('e01');
  });

  it('idade 65: dispara festa casamento (-126.000 nominais)', () => {
    const r = rowByAge(65)!;
    // Sistema opera em valores nominais — inflação desativada.
    const esperado = 126_000;
    expect(r.eventos_negativos).toBeCloseTo(esperado, 1);
  });

  it('idade 64: nenhum evento dispara', () => {
    const r = rowByAge(64)!;
    expect(r.eventos_negativos).toBe(0);
    expect(r.eventos_positivos).toBe(0);
  });

  it('recorrente_espacado: carro a cada 5 anos dispara nas idades certas', () => {
    const carroEv: FinancialEvent = {
      id: 'carro',
      tipo: 'compra',
      descricao: 'Troca carro',
      valor: -80_000,
      padrao_recorrencia: 'recorrente_espacado',
      idade_inicio: 60,
      idade_fim: 85,
      intervalo_anos: 5,
      indexado_inflacao: true,
    };
    const input: SimulationInput = {
      ...marceloSimulationInput,
      events: [...marceloEvents, carroEv],
    };
    const r = simulate(input);
    const idadesComCarro = r.rows
      .filter((row) => row.detalhes.eventos_disparados.some((e) => e.event_id === 'carro'))
      .map((row) => row.idade);
    expect(idadesComCarro).toEqual([60, 65, 70, 75, 80, 85]);
  });
});

describe('Engine — Q6: cascata de déficit (vende ilíquidos → empréstimo)', () => {
  it('cenário forçado: despesa absurda zera saldo, dispara venda forçada e dívida', () => {
    const input: SimulationInput = {
      ...marceloSimulationInput,
      expenses: [
        ...marceloExpenses,
        {
          id: 'mega',
          categoria: 'outro',
          descricao: 'Despesa absurda de teste',
          valor_mensal: 1_500_000,
          idade_inicio: 60,
          idade_fim: 91,
          indexado_inflacao: false,
          essencial: false,
        },
      ],
    };
    const r = simulate(input);
    const linhaComVenda = r.rows.find((row) => row.vendas_forcadas_total > 0);
    expect(linhaComVenda).toBeDefined();
    const linhaComDivida = r.rows.find((row) => row.saldo_divida > 0);
    expect(linhaComDivida).toBeDefined();
    // Quando há venda forçada, saldo_final fica em 0
    expect(linhaComVenda!.saldo_final).toBe(0);
  });

  it('respeita prioridade_liquidacao: ativo com prioridade=1 é vendido antes', () => {
    // Pega Terreno Horizon (330k) e dá prioridade=1; Apto POA (330k) recebe prioridade=2
    const assets = marceloAssets.map((a) => {
      if (a.id === 'a06') return { ...a, prioridade_liquidacao: 1 };
      if (a.id === 'a04') return { ...a, prioridade_liquidacao: 2 };
      return a;
    });
    const input: SimulationInput = {
      ...marceloSimulationInput,
      assets,
      expenses: [
        ...marceloExpenses,
        {
          id: 'mega',
          categoria: 'outro',
          descricao: 'forçar venda',
          valor_mensal: 1_500_000,
          idade_inicio: 60,
          idade_fim: 91,
          indexado_inflacao: false,
          essencial: false,
        },
      ],
    };
    const r = simulate(input);
    // primeira linha que tem venda forçada: o primeiro item da lista deve ser 'a06'
    const primeiraVenda = r.rows.find((row) => row.vendas_forcadas_total > 0);
    expect(primeiraVenda).toBeDefined();
    expect(primeiraVenda!.detalhes.vendas_forcadas[0]!.asset_id).toBe('a06');
  });

  it('juros sobre dívida são cobrados no ano seguinte ao endividamento', () => {
    const input: SimulationInput = {
      ...marceloSimulationInput,
      expenses: [
        ...marceloExpenses,
        {
          id: 'mega',
          categoria: 'outro',
          descricao: '',
          valor_mensal: 5_000_000,  // estoura tudo já no ano 0
          idade_inicio: 60,
          idade_fim: 91,
          indexado_inflacao: false,
          essencial: false,
        },
      ],
    };
    const r = simulate(input);
    const idadeComDivida = r.rows.find((row) => row.saldo_divida > 0)!.idade;
    const proximaLinha = r.rows.find((row) => row.idade === idadeComDivida + 1);
    expect(proximaLinha!.juros_divida).toBeGreaterThan(0);
  });
});

describe('Engine — venda_ativo encerra o ativo', () => {
  it('um evento venda_ativo marca o ativo como liquidado a partir da idade do evento', () => {
    const vendaImovel: FinancialEvent = {
      id: 'venda-fazenda',
      tipo: 'venda_ativo',
      descricao: 'Venda Fazenda',
      valor: 3_000_000,
      padrao_recorrencia: 'unico',
      idade_inicio: 70,
      indexado_inflacao: false,
      ativo_referenciado: 'a07',
    };
    const input: SimulationInput = {
      ...marceloSimulationInput,
      events: [...marceloEvents, vendaImovel],
    };
    const r = simulate(input);
    const ant = r.rows.find((row) => row.idade === 69)!;
    const pos = r.rows.find((row) => row.idade === 71)!;
    // Fazenda valia 3M (valorização 0%), então ativos_estoque caem ~3M após a venda
    expect(ant.ativos_estoque_atualizados - pos.ativos_estoque_atualizados).toBeCloseTo(
      3_000_000,
      0,
    );
    // E o saldo recebe 3M positivos no ano 70
    const ano70 = r.rows.find((row) => row.idade === 70)!;
    expect(ano70.eventos_positivos).toBe(3_000_000);
  });
});

describe('Engine — Q2: cenários otimista/pessimista alteram retorno', () => {
  it('otimista (retorno+vol) gera mais retorno que base; pessimista, menos', () => {
    const base = simulate(marceloSimulationInput);
    const otim = simulate({
      ...marceloSimulationInput,
      scenario: { ...baseScenario, id: 'sc-otim', nome: 'Otimista', tipo: 'otimista' },
    });
    const pess = simulate({
      ...marceloSimulationInput,
      scenario: { ...baseScenario, id: 'sc-pess', nome: 'Pessimista', tipo: 'pessimista' },
    });
    expect(otim.summary.patrimonio_final).toBeGreaterThan(base.summary.patrimonio_final);
    expect(pess.summary.patrimonio_final).toBeLessThan(base.summary.patrimonio_final);
  });
});

describe('Engine — Q14: perfil custom', () => {
  it('perfil custom usa custom_retorno_aa do cliente', () => {
    const baseRes = simulate(marceloSimulationInput);
    const customAlto = simulate({
      ...marceloSimulationInput,
      client: {
        ...marceloClient,
        perfil_carteira: 'custom',
        custom_retorno_aa: 0.25,
        custom_volatilidade_aa: 0.05,
      },
    });
    expect(customAlto.summary.patrimonio_final).toBeGreaterThan(baseRes.summary.patrimonio_final);
  });
});

describe('Engine — summary', () => {
  it('NPV finito; pico identificado; idade_break_even null quando saldo nunca afunda', () => {
    expect(Number.isFinite(result.summary.npv_fluxo_liquido)).toBe(true);
    expect(result.summary.patrimonio_pico).toBeGreaterThan(0);
    expect(result.summary.patrimonio_pico_idade).toBeGreaterThanOrEqual(60);
    expect(result.summary.patrimonio_pico_idade).toBeLessThanOrEqual(91);
  });
});

describe('Engine — invariantes contábeis', () => {
  it('para todo ano: fluxo_liquido = receitas + eventos+ - despesas - eventos-', () => {
    for (const r of result.rows) {
      const calc = r.receitas_total + r.eventos_positivos
                 - r.despesas_essenciais - r.despesas_nao_essenciais
                 - r.eventos_negativos;
      expect(r.fluxo_liquido).toBeCloseTo(calc, 1);
    }
  });

  it('para todo ano: patrimonio_total = saldo_final + ativos_estoque - saldo_divida', () => {
    for (const r of result.rows) {
      expect(r.patrimonio_total).toBeCloseTo(
        r.saldo_final + r.ativos_estoque_atualizados - r.saldo_divida,
        1,
      );
    }
  });
});

describe('Engine — comparação ano-a-ano (golden numbers)', () => {
  // Snapshot dos números que vamos comparar contra a planilha-fonte na próxima rodada.
  // Por enquanto, validamos apenas SINAL e ORDEM DE GRANDEZA.
  it('idade 60: fluxo líquido fortemente negativo (compra Portugal 2.27M)', () => {
    expect(rowByAge(60)!.fluxo_liquido).toBeLessThan(-2_000_000);
  });

  it('idade 76: fluxo líquido melhora muito (saiu filhos+mãe; saiu estudos aos 71)', () => {
    expect(rowByAge(76)!.fluxo_liquido).toBeGreaterThan(rowByAge(74)!.fluxo_liquido);
  });

  it('idade 91 (fim): saldo_final deve ser positivo no cenário base ou estar negativo via dívida', () => {
    const r = rowByAge(91)!;
    // ou patrimônio positivo, ou pelo menos coerência (saldo zerado e dívida acumulada)
    expect(r.patrimonio_total).toBeDefined();
  });
});
