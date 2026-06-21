-- ============================================================
-- 0027 — Regras de categorização aprendidas (memória do sistema)
--
-- Cada vez que o consultor aprova um lançamento categorizado vindo do
-- banco, o sistema guarda uma regra: padrão de match (merchant ou
-- descrição normalizada) → categoria + rubrica. Próximos syncs aplicam
-- a regra antes do fallback pra "Outros".
-- ============================================================

create table if not exists controle_mensal_regras_categorizacao (
    id            uuid primary key default gen_random_uuid(),
    client_id     uuid not null references clients(id) on delete cascade,
    match_key     text not null,
    categoria_id  uuid references controle_mensal_categorias(id) on delete cascade,
    rubrica_id    uuid references controle_mensal_categorias(id) on delete cascade,
    centro_id     uuid references controle_mensal_centros(id) on delete set null,
    origem        text not null default 'aprendido'
                    check (origem in ('aprendido', 'manual')),
    hits          int not null default 0,
    ultima_aplicacao timestamptz,
    ativo         boolean not null default true,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now(),
    unique (client_id, match_key)
);

create index if not exists ix_regra_client on controle_mensal_regras_categorizacao (client_id);
create index if not exists ix_regra_ativa on controle_mensal_regras_categorizacao (client_id, ativo) where ativo = true;

alter table controle_mensal_regras_categorizacao enable row level security;

drop policy if exists regra_via_client on controle_mensal_regras_categorizacao;
create policy regra_via_client on controle_mensal_regras_categorizacao
  for all using (private.owns_client(client_id)) with check (private.owns_client(client_id));

drop trigger if exists trg_regra_updated on controle_mensal_regras_categorizacao;
create trigger trg_regra_updated
  before update on controle_mensal_regras_categorizacao
  for each row execute function public.set_updated_at();

-- RPC pro Edge Function incrementar hits/ultima_aplicacao
create or replace function increment_regra_hit(regra_id uuid)
returns void language sql security definer set search_path = public as $$
  update controle_mensal_regras_categorizacao
  set hits = hits + 1, ultima_aplicacao = now()
  where id = regra_id;
$$;
grant execute on function increment_regra_hit(uuid) to service_role;
