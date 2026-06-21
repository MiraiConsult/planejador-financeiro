-- Wrapper pra forçar email_verified=true no identity (corrige bug
-- em que GoTrue rejeita login mesmo com email_confirmed_at setado).
create or replace function public.set_identity_email_verified(uid uuid)
returns void
language sql security definer set search_path = public
as $$
  update auth.identities
  set identity_data = identity_data || '{"email_verified": true}'::jsonb,
      updated_at = now()
  where user_id = uid and provider = 'email';
$$;
grant execute on function public.set_identity_email_verified(uuid) to service_role;
