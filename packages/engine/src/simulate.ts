import type {
  AlocacaoExcedenteFaixa,
  Asset,
  Assumptions,
  EventoDisparado,
  RowDetalhes,
  SimulationInput,
  SimulationResult,
  SimulationRow,
  SimulationSummary,
  VendaForcada,
} from './types';
import {
  eventoDisparaNoAno,
  idadeNoReferencial,
  ordenaParaLiquidacao,
  resolveAssumptions,
  retornoEfetivoDoCenario,
  valorAnualSerie,
  valorAtualEstoque,
  valorEventoNoAno,
} from './helpers';

export function simulate(input: SimulationInput): SimulationResult {
  const { client, scenario } = input;
  const premissas = resolveAssumptions(input.assumptions, scenario);

  const refDate = input.reference_date ? new Date(input.reference_date) : new Date();
  const idadeInicial = idadeNoReferencial(client, input.reference_date);
  const idadeFinal = scenario.horizonte_idade_final ?? client.expectativa_vida_anos;
  const numAnos = idadeFinal - idadeInicial;
  const anoInicial = refDate.getUTCFullYear();

  // saldo financeiro inicial = soma de assets tipo='financeiro_liquido'
  const financeirosLiquidos = input.assets.filter((a) => a.tipo === 'financeiro_liquido');
  let saldoFinanceiro = financeirosLiquidos.reduce((acc, a) => acc + a.valor, 0);

  // Ilíquidos = tudo que é estoque mas NÃO é financeiro_liquido (imóveis, terrenos, carros, herança como estoque).
  // Trabalhamos numa cópia mutável para marcar liquidações forçadas.
  type AtivoIliquido = Asset & { liquidado_em_idade?: number };
  const iliquidos: AtivoIliquido[] = input.assets
    .filter((a) => a.natureza === 'estoque' && a.tipo !== 'financeiro_liquido')
    .map((a) => ({ ...a }));

  const ativosFluxo = input.assets.filter((a) => a.natureza === 'fluxo');

  // Snapshot do patrimônio ilíquido ANTES do loop (loop pode mutar via vendas forçadas).
  const patrimonioIliquidoInicial = iliquidos.reduce(
    (acc, a) => acc + valorAtualEstoque(a, 0, premissas),
    0,
  );

  // ─── Passivos (dívidas declaradas pelo cliente) ───
  // Trabalhamos numa cópia mutável de cada passivo + seu saldo devedor
  // corrente, recalculado a cada ano com saldo*(1+juros) - parcelaAnual.
  type PassivoRT = { ref: import('./types').Liability; saldo: number };
  const passivos: PassivoRT[] = (input.liabilities ?? []).map((l) => ({
    ref: l,
    saldo: l.saldo_atual,
  }));

  const retornoEfetivo = retornoEfetivoDoCenario(
    client.perfil_carteira,
    client,
    premissas,
    scenario.tipo,
  );

  const rows: SimulationRow[] = [];
  let saldoDivida = 0;

  for (let t = 0; t <= numAnos; t++) {
    const idade = idadeInicial + t;
    const ano = anoInicial + t;
    // Sistema operando em VALORES NOMINAIS — inflação desativada.
    // Mantemos o fator multiplicativo na assinatura de valorAnualSerie,
    // mas sempre passamos 1 (sem reajuste por inflação).
    const fator = 1;

    const saldoInicial = saldoFinanceiro;

    // ─── Receitas (ativos de fluxo no intervalo de idade) ───
    let receitas = 0;
    const receitasPorAtivo: RowDetalhes['receitas_por_ativo'] = [];
    for (const ativo of ativosFluxo) {
      const valor = valorAnualSerie({
        valorBase: ativo.valor,
        idade,
        idadeInicio: ativo.idade_inicio,
        idadeFim: ativo.idade_fim,
        padrao: ativo.padrao_recorrencia,
        intervaloAnos: ativo.intervalo_anos,
        crescimentoRealAa: ativo.crescimento_real_aa,
        indexadoInflacao: ativo.indexado_inflacao,
        inflacaoFator: fator,
        overrides: ativo.overrides,
      });
      if (valor === 0) continue;
      receitas += valor;
      receitasPorAtivo.push({ asset_id: ativo.id, nome: ativo.nome, valor });
    }

    // ─── Despesas ───
    let despesasEssenciais = 0;
    let despesasNaoEssenciais = 0;
    const despesasPorCategoria: Record<string, number> = {};
    for (const desp of input.expenses) {
      const anual = valorAnualSerie({
        valorBase: desp.valor_mensal * 12,
        idade,
        idadeInicio: desp.idade_inicio,
        idadeFim: desp.idade_fim,
        padrao: desp.padrao_recorrencia,
        intervaloAnos: desp.intervalo_anos,
        crescimentoRealAa: desp.crescimento_real_aa,
        indexadoInflacao: desp.indexado_inflacao,
        inflacaoFator: fator,
        overrides: desp.overrides,
      });
      if (anual === 0) continue;
      if (desp.essencial) despesasEssenciais += anual;
      else despesasNaoEssenciais += anual;
      despesasPorCategoria[desp.categoria] =
        (despesasPorCategoria[desp.categoria] ?? 0) + anual;
    }

    // ─── Eventos ───
    let eventosPositivos = 0;
    let eventosNegativos = 0;
    const eventosDisparados: EventoDisparado[] = [];
    for (const ev of input.events) {
      if (!eventoDisparaNoAno(ev, idade, idadeFinal)) continue;
      const v = valorEventoNoAno(ev, idade, fator);
      if (v >= 0) eventosPositivos += v;
      else eventosNegativos += -v; // armazenamos como valor positivo
      eventosDisparados.push({
        event_id: ev.id,
        descricao: ev.descricao,
        valor_nominal_corrigido: v,
      });

      // venda_ativo: força idade_fim do ativo referenciado
      if (ev.tipo === 'venda_ativo' && ev.ativo_referenciado) {
        const alvo = iliquidos.find((x) => x.id === ev.ativo_referenciado);
        if (alvo) alvo.liquidado_em_idade = idade;
      }
    }

    // ─── Passivos: parcelas pagas no ano (despesa essencial) ───
    let parcelasPassivos = 0;
    for (const p of passivos) {
      if (idade < p.ref.idade_inicio || idade > p.ref.idade_fim) continue;
      const parcelaAnual = p.ref.parcela_mensal * 12;
      parcelasPassivos += parcelaAnual;
      // Atualiza saldo devedor: saldo*(1+juros) - parcela paga; floor 0.
      const juros = p.ref.juros_aa ?? 0;
      p.saldo = Math.max(0, p.saldo * (1 + juros) - parcelaAnual);
    }
    despesasEssenciais += parcelasPassivos;

    const fluxoLiquido =
      receitas + eventosPositivos - despesasEssenciais - despesasNaoEssenciais - eventosNegativos;

    // ─── Alocação do excedente ─────────────────────────────────────────
    // Quando o fluxo do ano é positivo, só uma % vai pro saldo investido
    // (definida por faixa etária). O resto vira "consumo extra" — não
    // acumula nem rende. Fluxo negativo é integralmente sacado do saldo.
    const pctInvestir = pctInvestirNaIdade(idade, client.alocacao_excedente);
    const consumoExcedente =
      fluxoLiquido > 0 ? fluxoLiquido * (1 - pctInvestir) : 0;
    const fluxoLiquidoCaixa = fluxoLiquido - consumoExcedente;

    // ─── Juros sobre dívida (cobrados ANTES do retorno) ───
    const jurosDivida = saldoDivida * premissas.custo_credito_aa;
    let saldoPreRetorno = saldoInicial + fluxoLiquidoCaixa - jurosDivida;

    // ─── Retorno: só a partir do ano 2 (t >= 1) e só sobre saldo positivo ───
    // Regra do meio: as entradas/saídas do ano acontecem em média na metade
    // do período, então rendem só metade do ano. Calcular sobre o saldo
    // FINAL superestima retorno em ~5pp ao ano de fluxo. Convenção financeira
    // correta (Excel: TIR/FV padrão).
    // IMPORTANTE: o sistema opera em VALORES REAIS (moeda de hoje, sem
    // inflação) — `retornoEfetivo` precisa ser REAL pra ser consistente.
    const saldoMedio = Math.max(0, saldoInicial + (fluxoLiquidoCaixa - jurosDivida) / 2);
    const retorno =
      t === 0
        ? 0
        : saldoMedio * retornoEfetivo * (1 - premissas.imposto_renda_efetivo);

    let saldoPosRetorno = saldoPreRetorno + retorno;

    // ─── Cascata de déficit: vende ilíquidos vivos → empréstimo ───
    let vendasForcadasTotal = 0;
    const vendasForcadas: VendaForcada[] = [];
    if (saldoPosRetorno < 0) {
      let deficit = -saldoPosRetorno;
      const vivos = iliquidos.filter(
        (a) =>
          a.liquidado_em_idade === undefined &&
          idade >= a.idade_inicio &&
          idade <= a.idade_fim,
      );
      const ordem = ordenaParaLiquidacao(vivos, t, premissas);
      for (const ativo of ordem) {
        if (deficit <= 0.005) break;
        const vm = valorAtualEstoque(ativo, t, premissas);
        const venda = Math.min(vm, deficit);
        deficit -= venda;
        vendasForcadasTotal += venda;
        vendasForcadas.push({ asset_id: ativo.id, nome: ativo.nome, valor_venda: venda });
        if (venda >= vm - 0.005) {
          // vendeu integralmente: marca liquidado
          ativo.liquidado_em_idade = idade;
        } else {
          // venda parcial: ajusta valor remanescente como se o ativo "encolhesse"
          ativo.valor = (vm - venda) / Math.pow(1 + (ativo.valorizacao_aa ?? ativo.taxa_retorno_aa ?? (ativo.tipo === 'imovel' ? premissas.valorizacao_imovel_uso : 0)), t);
        }
      }
      if (deficit > 0.005) {
        saldoDivida += deficit;
      }
      saldoPosRetorno = 0;
    }

    const saldoFinal = saldoPosRetorno;
    saldoFinanceiro = saldoFinal;

    // ─── Ativos de estoque restantes (vivos) ao final do ano ───
    const ativosEstoqueAtualizados = iliquidos
      .filter(
        (a) =>
          a.liquidado_em_idade === undefined &&
          idade >= a.idade_inicio &&
          idade <= a.idade_fim,
      )
      .reduce((acc, a) => acc + valorAtualEstoque(a, t, premissas), 0);

    // Saldo devedor remanescente dos passivos do cliente naquele ano
    const saldoPassivos = passivos.reduce((acc, p) => acc + p.saldo, 0);

    const patrimonioTotal =
      saldoFinal + ativosEstoqueAtualizados - saldoDivida - saldoPassivos;

    const detalhes: RowDetalhes = {
      receitas_por_ativo: receitasPorAtivo,
      despesas_por_categoria: despesasPorCategoria,
      eventos_disparados: eventosDisparados,
      vendas_forcadas: vendasForcadas,
    };

    rows.push({
      idade,
      ano_calendario: ano,
      saldo_inicial: round2(saldoInicial),
      receitas_total: round2(receitas),
      despesas_essenciais: round2(despesasEssenciais),
      despesas_nao_essenciais: round2(despesasNaoEssenciais),
      eventos_positivos: round2(eventosPositivos),
      eventos_negativos: round2(eventosNegativos),
      fluxo_liquido: round2(fluxoLiquido),
      consumo_excedente: round2(consumoExcedente),
      juros_divida: round2(jurosDivida),
      retorno: round2(retorno),
      saldo_final: round2(saldoFinal),
      vendas_forcadas_total: round2(vendasForcadasTotal),
      saldo_divida: round2(saldoDivida),
      ativos_estoque_atualizados: round2(ativosEstoqueAtualizados),
      patrimonio_total: round2(patrimonioTotal),
      detalhes,
    });
  }

  const summary = computeSummary(rows, premissas);

  return {
    input_summary: {
      cliente: client.nome_completo,
      cenario: scenario.nome,
      idade_inicial: idadeInicial,
      idade_final: idadeFinal,
      saldo_financeiro_inicial: round2(financeirosLiquidos.reduce((s, a) => s + a.valor, 0)),
      patrimonio_iliquido_inicial: round2(patrimonioIliquidoInicial),
    },
    rows,
    summary,
  };
}

function computeSummary(rows: SimulationRow[], premissas: Assumptions): SimulationSummary {
  const npv = rows.reduce(
    (acc, r, t) => acc + r.fluxo_liquido / Math.pow(1 + premissas.taxa_desconto_npv, t),
    0,
  );

  const last = rows[rows.length - 1];
  const patrimonioFinal = last?.patrimonio_total ?? 0;

  let pico = -Infinity;
  let picoIdade = rows[0]?.idade ?? 0;
  for (const r of rows) {
    if (r.patrimonio_total > pico) {
      pico = r.patrimonio_total;
      picoIdade = r.idade;
    }
  }

  // drawdown máximo no PATRIMÔNIO TOTAL = (pico - vale pós-pico) / pico
  let valePosPico = pico;
  for (const r of rows) {
    if (r.idade < picoIdade) continue;
    if (r.patrimonio_total < valePosPico) valePosPico = r.patrimonio_total;
  }
  const drawdownMax = pico > 0 ? (pico - valePosPico) / pico : 0;

  // primeira idade em que saldo financeiro líquido vira negativo (ou onde dívida nasce)
  const breakEven =
    rows.find((r) => r.saldo_final < 0 || r.saldo_divida > 0)?.idade ?? null;

  const indicePreservacao = pico > 0 ? patrimonioFinal / pico : 0;

  return {
    npv_fluxo_liquido: round2(npv),
    patrimonio_final: round2(patrimonioFinal),
    patrimonio_pico: round2(pico),
    patrimonio_pico_idade: picoIdade,
    idade_break_even: breakEven,
    drawdown_maximo: round4(drawdownMax),
    indice_preservacao: round4(indicePreservacao),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * Retorna a fração (0..1) do fluxo líquido positivo que deve ser investida
 * naquela idade. Última faixa (ate_idade=null) cobre o resto da vida.
 * Sem faixas configuradas → 100% investido (comportamento legado).
 */
function pctInvestirNaIdade(
  idade: number,
  faixas?: AlocacaoExcedenteFaixa[],
): number {
  if (!faixas || faixas.length === 0) return 1;
  for (const f of faixas) {
    if (f.ate_idade == null || idade <= f.ate_idade) {
      const pct = Math.min(100, Math.max(0, f.pct_investido));
      return pct / 100;
    }
  }
  return 1;
}
