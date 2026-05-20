-- ============================================================
-- 0004 — Correções dos security advisors
-- (1) view security_invoker para respeitar RLS de quem consulta
-- (2) search_path fixado em set_updated_at
-- ============================================================

drop view if exists v_scenario_comparison;
create view v_scenario_comparison with (security_invoker = true) as
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

create or replace function set_updated_at() returns trigger
language plpgsql
set search_path = public
as $$ begin new.updated_at = now(); return new; end $$;
