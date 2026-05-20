import { createClient } from '@/lib/supabase/server';
import { simulate } from '@planejador/engine';
import type { SimulationResult, Scenario } from '@planejador/engine';
import { loadSimulationInput } from './loadSimulation';

export interface ScenarioRun {
  scenario: Scenario;
  result: SimulationResult;
}

/**
 * Carrega todos os cenários do cliente e roda o engine para cada um.
 * Reaproveita o input do cliente (assets, expenses, events, assumptions)
 * variando apenas o `scenario` passado ao engine.
 */
export async function loadAllScenarios(client_id: string): Promise<ScenarioRun[] | null> {
  const base = await loadSimulationInput(client_id);
  if (!base) return null;

  const supabase = await createClient();
  const { data: scenarios } = await supabase
    .from('scenarios')
    .select('*')
    .eq('client_id', client_id)
    .order('tipo', { ascending: true });

  if (!scenarios || scenarios.length === 0) {
    // fallback: roda só com o cenário default do input
    return [{ scenario: base.input.scenario, result: simulate(base.input) }];
  }

  return scenarios.map((sc) => {
    const scenario: Scenario = {
      id: sc.id,
      nome: sc.nome,
      tipo: sc.tipo,
      horizonte_idade_final: sc.horizonte_idade_final ?? undefined,
    };
    const result = simulate({ ...base.input, scenario });
    return { scenario, result };
  });
}
