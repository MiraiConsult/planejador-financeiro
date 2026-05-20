-- ============================================================
-- 0002 — Outputs do engine de simulação
-- Q11: sem cache; cada run cria nova linha.
-- ============================================================

create table simulations (
    id              uuid primary key default gen_random_uuid(),
    client_id       uuid not null references clients(id)   on delete cascade,
    scenario_id     uuid not null references scenarios(id) on delete cascade,
    inputs_snapshot jsonb not null,
    executed_at     timestamptz not null default now(),
    engine_version  text not null
);
create index ix_simulations_scenario on simulations (scenario_id, executed_at desc);

-- linha por idade
create table simulation_rows (
    simulation_id              uuid not null references simulations(id) on delete cascade,
    idade                      int  not null,
    ano_calendario             int  not null,
    saldo_inicial              numeric(20,2) not null,
    receitas_total             numeric(20,2) not null,
    despesas_essenciais        numeric(20,2) not null,
    despesas_nao_essenciais    numeric(20,2) not null,
    eventos_positivos          numeric(20,2) not null,
    eventos_negativos          numeric(20,2) not null,
    fluxo_liquido              numeric(20,2) not null,
    juros_divida               numeric(20,2) not null default 0,
    retorno                    numeric(20,2) not null,
    saldo_final                numeric(20,2) not null,
    vendas_forcadas_total      numeric(20,2) not null default 0,
    saldo_divida               numeric(20,2) not null default 0,
    ativos_estoque_atualizados numeric(20,2) not null,
    patrimonio_total           numeric(20,2) not null,
    detalhes                   jsonb not null,
    primary key (simulation_id, idade)
);

-- agregados por simulação
create table simulation_summary (
    simulation_id           uuid primary key references simulations(id) on delete cascade,
    npv_fluxo_liquido       numeric(20,2) not null,
    patrimonio_final        numeric(20,2) not null,
    patrimonio_pico         numeric(20,2) not null,
    patrimonio_pico_idade   int           not null,
    idade_break_even        int,
    drawdown_maximo         numeric(8,4)  not null,
    indice_preservacao      numeric(8,4)  not null
);

-- células do heatmap de sensibilidade (v2)
create table sensitivity_cells (
    id              uuid primary key default gen_random_uuid(),
    scenario_id     uuid not null references scenarios(id) on delete cascade,
    run_id          uuid not null,
    param_x_nome    text not null,
    param_x_valor   numeric(12,6) not null,
    param_y_nome    text not null,
    param_y_valor   numeric(12,6) not null,
    patrimonio_final numeric(20,2) not null,
    idade_break_even int
);
create index ix_sensitivity_run on sensitivity_cells (scenario_id, run_id);

-- view de comparação (sempre lê a simulação mais recente por cenário)
create or replace view v_scenario_comparison as
select
    s.client_id,
    s.id              as scenario_id,
    s.nome            as scenario_nome,
    ss.npv_fluxo_liquido,
    ss.patrimonio_final,
    ss.idade_break_even,
    rank() over (partition by s.client_id order by ss.npv_fluxo_liquido desc) as ranking_npv
from scenarios s
join lateral (
    select sim.id from simulations sim
    where sim.scenario_id = s.id
    order by sim.executed_at desc limit 1
) latest on true
join simulation_summary ss on ss.simulation_id = latest.id;
