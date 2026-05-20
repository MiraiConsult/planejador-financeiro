-- ============================================================
-- 0007 — Mover helpers RLS para schema 'private'
--
-- Fix do bug 42501 introduzido em 0005: ao revogar EXECUTE de
-- owns_client/owns_simulation, as próprias policies pararam de funcionar
-- (policies executam essas funções como o role 'authenticated').
--
-- Solução: mover para schema 'private' (não exposto pelo PostgREST por default)
-- e dar EXECUTE para authenticated. Fecha o vetor de exposição via /rest/v1/rpc
-- e mantém o funcionamento das policies.
-- ============================================================

create schema if not exists private;

create or replace function private.owns_client(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.clients
    where id = c
      and (consultant_id = auth.uid() or client_user_id = auth.uid())
  )
$$;

create or replace function private.owns_simulation(s uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.simulations sim
    where sim.id = s
      and exists(
        select 1 from public.clients c
        where c.id = sim.client_id
          and (c.consultant_id = auth.uid() or c.client_user_id = auth.uid())
      )
  )
$$;

grant usage on schema private to authenticated, anon;
grant execute on function private.owns_client(uuid)     to authenticated;
grant execute on function private.owns_simulation(uuid) to authenticated;

-- Re-cria policies usando o novo namespace.
do $$
declare t text;
begin
  foreach t in array array['assets','expenses','events','scenarios']
  loop
    execute format('drop policy if exists %I_via_client on %I;', t, t);
    execute format($p$
      create policy %I_via_client on %I
        for all using (private.owns_client(client_id)) with check (private.owns_client(client_id));
    $p$, t, t);
  end loop;
end $$;

drop policy if exists assumptions_consultant on assumptions;
create policy assumptions_consultant on assumptions
  for all
  using (
    consultant_id = auth.uid()
    or (client_id is not null and private.owns_client(client_id))
  )
  with check (
    consultant_id = auth.uid()
    or (client_id is not null and private.owns_client(client_id))
  );

drop policy if exists simulations_via_client on simulations;
create policy simulations_via_client on simulations
  for all using (private.owns_client(client_id)) with check (private.owns_client(client_id));

drop policy if exists sim_rows_via_sim on simulation_rows;
create policy sim_rows_via_sim on simulation_rows
  for all using (private.owns_simulation(simulation_id)) with check (private.owns_simulation(simulation_id));

drop policy if exists sim_summary_via_sim on simulation_summary;
create policy sim_summary_via_sim on simulation_summary
  for all using (private.owns_simulation(simulation_id)) with check (private.owns_simulation(simulation_id));

drop policy if exists sensitivity_via_scenario on sensitivity_cells;
create policy sensitivity_via_scenario on sensitivity_cells
  for all
  using (exists(select 1 from scenarios sc where sc.id = scenario_id and private.owns_client(sc.client_id)))
  with check (exists(select 1 from scenarios sc where sc.id = scenario_id and private.owns_client(sc.client_id)));

drop function if exists public.owns_client(uuid);
drop function if exists public.owns_simulation(uuid);
