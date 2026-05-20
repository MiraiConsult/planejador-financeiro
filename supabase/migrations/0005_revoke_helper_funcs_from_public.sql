-- ============================================================
-- 0005 — Revogar EXECUTE das funções helper de PUBLIC
-- (Postgres concede EXECUTE para PUBLIC por padrão; precisamos fechar
--  porque essas funções são internas às policies RLS, não para chamada via PostgREST/rpc.)
-- ============================================================

revoke execute on function public.owns_client(uuid)     from public;
revoke execute on function public.owns_simulation(uuid) from public;
revoke execute on function public.owns_client(uuid)     from anon, authenticated;
revoke execute on function public.owns_simulation(uuid) from anon, authenticated;
