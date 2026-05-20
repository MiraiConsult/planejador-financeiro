// Dump da simulação do Marcelo para CSV — facilita conferência manual contra a planilha.
// Saída: packages/engine/marcelo.csv

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'vitest';
import { simulate } from '../src/simulate';
import { marceloSimulationInput } from '../src/fixtures/marcelo';

test('dump Marcelo CSV (artefato pra conferência)', () => {
  const r = simulate(marceloSimulationInput);

  const cols = [
    'idade',
    'ano_calendario',
    'saldo_inicial',
    'receitas_total',
    'despesas_essenciais',
    'despesas_nao_essenciais',
    'eventos_positivos',
    'eventos_negativos',
    'fluxo_liquido',
    'juros_divida',
    'retorno',
    'saldo_final',
    'vendas_forcadas_total',
    'saldo_divida',
    'ativos_estoque_atualizados',
    'patrimonio_total',
  ] as const;

  const lines = [cols.join(';')];
  for (const row of r.rows) {
    lines.push(cols.map((c) => row[c]).join(';'));
  }

  writeFileSync(resolve(__dirname, '../marcelo.csv'), lines.join('\n'), 'utf-8');

  // Loga sumário no stdout do test
  console.log('INPUT:', JSON.stringify(r.input_summary, null, 2));
  console.log('SUMMARY:', JSON.stringify(r.summary, null, 2));
});
