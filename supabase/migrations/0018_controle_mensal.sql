-- ============================================================
-- 0018 — Controle Mensal (lançamentos reais / "realizado") por cliente.
-- Espelha a aba "Lançamentos" do controle financeiro e convive com o
-- plano de longo prazo (tabela expenses).
-- RLS reusa private.owns_client() (helper movido p/ schema private na 0007).
-- Idempotente: pode ser reaplicada sem erro.
-- ============================================================

create table if not exists controle_mensal_lancamentos (
    id            uuid primary key default gen_random_uuid(),
    client_id     uuid not null references clients(id) on delete cascade,
    data          date not null,
    descricao     text not null,
    valor         numeric(18,2) not null,            -- + receita / − gasto
    categoria     text,
    subcategoria  text,
    mes           text not null,                     -- competência (nome do mês)
    mes_num       int,
    ano           int,
    competencia   int,                               -- ano*100 + mes_num (ordenação)
    tipo          text not null check (tipo in ('pessoal','mirai','viagem','receita')),
    origem        text,
    cliente_obs   text,
    viagem        text,                              -- derivado (tipo=viagem)
    sistema       text,                              -- derivado (Mirai SaaS)
    is_nexlex     boolean not null default false,    -- linha de salário líquido Nexlex/Mirai
    hash          text not null,                     -- idempotência da importação
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now(),
    unique (client_id, hash)
);

create index if not exists ix_cml_client on controle_mensal_lancamentos (client_id);
create index if not exists ix_cml_comp   on controle_mensal_lancamentos (client_id, competencia);

alter table controle_mensal_lancamentos enable row level security;

-- Consultor dono OU cliente final vinculado (mesmo helper das demais tabelas filhas).
drop policy if exists cml_via_client on controle_mensal_lancamentos;
create policy cml_via_client on controle_mensal_lancamentos
  for all using (private.owns_client(client_id)) with check (private.owns_client(client_id));

drop trigger if exists trg_cml_updated on controle_mensal_lancamentos;
create trigger trg_cml_updated
  before update on controle_mensal_lancamentos
  for each row execute function public.set_updated_at();
