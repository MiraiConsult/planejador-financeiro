-- ============================================================
-- 0008 — Mover handle_new_user para schema 'private'
-- Tira o trigger handler do schema público para zerar o advisor
-- "anon can execute SECURITY DEFINER function".
-- ============================================================

create or replace function private.handle_new_user()
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
  for each row execute function private.handle_new_user();

drop function if exists public.handle_new_user();
