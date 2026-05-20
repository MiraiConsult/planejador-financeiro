-- ============================================================
-- 0003 — Row Level Security
-- Q12/Q13: tenant = consultor; cliente final pode entrar e ver/editar SEU client.
-- Engine roda com service_role (bypass RLS).
-- ============================================================

alter table profiles            enable row level security;
alter table clients             enable row level security;
alter table assets              enable row level security;
alter table expenses            enable row level security;
alter table events              enable row level security;
alter table assumptions         enable row level security;
alter table scenarios           enable row level security;
alter table simulations         enable row level security;
alter table simulation_rows     enable row level security;
alter table simulation_summary  enable row level security;
alter table sensitivity_cells   enable row level security;

-- ─── profiles: usuário lê seu próprio profile ───
create policy profiles_self_select on profiles
  for select using (id = auth.uid());

create policy profiles_self_update on profiles
  for update using (id = auth.uid());

-- ─── clients: consultor dono OU cliente final vinculado ───
create policy clients_consultant_all on clients
  for all
  using (consultant_id = auth.uid())
  with check (consultant_id = auth.uid());

create policy clients_self_select on clients
  for select using (client_user_id = auth.uid());

create policy clients_self_update on clients
  for update using (client_user_id = auth.uid())
  with check (client_user_id = auth.uid());

-- ─── helper: este client é meu (como consultor OU como o próprio cliente)? ───
create or replace function owns_client(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from clients
    where id = c
      and (consultant_id = auth.uid() or client_user_id = auth.uid())
  )
$$;

-- ─── policies em massa para tabelas filhas de clients ───
do $$
declare t text;
begin
  foreach t in array array['assets','expenses','events','scenarios']
  loop
    execute format($p$
      create policy %I_via_client on %I
        for all using (owns_client(client_id)) with check (owns_client(client_id));
    $p$, t, t);
  end loop;
end $$;

-- ─── assumptions: por consultor OU por client_id que ele possua ───
create policy assumptions_consultant on assumptions
  for all
  using (
    consultant_id = auth.uid()
    or (client_id is not null and owns_client(client_id))
  )
  with check (
    consultant_id = auth.uid()
    or (client_id is not null and owns_client(client_id))
  );

-- ─── outputs: via simulação → cliente ───
create or replace function owns_simulation(s uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from simulations sim where sim.id = s and owns_client(sim.client_id)
  )
$$;

create policy simulations_via_client on simulations
  for all using (owns_client(client_id)) with check (owns_client(client_id));

create policy sim_rows_via_sim on simulation_rows
  for all using (owns_simulation(simulation_id)) with check (owns_simulation(simulation_id));

create policy sim_summary_via_sim on simulation_summary
  for all using (owns_simulation(simulation_id)) with check (owns_simulation(simulation_id));

create policy sensitivity_via_scenario on sensitivity_cells
  for all
  using (exists(select 1 from scenarios sc where sc.id = scenario_id and owns_client(sc.client_id)))
  with check (exists(select 1 from scenarios sc where sc.id = scenario_id and owns_client(sc.client_id)));

-- ─── trigger: ao criar profile, default role = 'consultant' ───
-- (criação dos profiles é feita pela app via SDK; não precisa de trigger no auth.users)
