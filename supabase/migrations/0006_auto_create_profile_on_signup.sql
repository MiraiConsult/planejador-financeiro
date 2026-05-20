-- ============================================================
-- 0006 — Trigger automático que cria profile no signup
-- Fix do bug 23503 (FK violation no clients.consultant_id ↦ profiles.id).
-- ============================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    'consultant',
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Reparar usuários já existentes que não têm profile
insert into public.profiles (id, role, full_name)
select u.id, 'consultant', coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- Policy de INSERT em profiles (defesa em profundidade)
create policy profiles_self_insert on profiles
  for insert with check (id = auth.uid());
