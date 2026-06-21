-- ============================================================
-- 0028 — Papel de administrador + base do portal do cliente
-- ============================================================

create table if not exists admin_users (
    user_id    uuid primary key references auth.users(id) on delete cascade,
    nota       text,
    created_at timestamptz not null default now()
);
alter table admin_users enable row level security;
-- Sem policy de leitura pública: só funções SECURITY DEFINER e service_role.

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.admin_users where user_id = auth.uid())
$$;

-- owns_client passa a contemplar admin (cobre todas as tabelas filhas)
create or replace function private.owns_client(c uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.clients
    where id = c and (consultant_id = auth.uid() or client_user_id = auth.uid())
  ) or private.is_admin()
$$;

drop policy if exists clients_admin_all on clients;
create policy clients_admin_all on clients
  for all using (private.is_admin()) with check (private.is_admin());

-- Wrapper público pro app checar admin
create or replace function public.current_user_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.admin_users where user_id = auth.uid())
$$;
grant execute on function public.current_user_is_admin() to authenticated;
