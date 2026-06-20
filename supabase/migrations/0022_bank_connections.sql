-- ============================================================
-- 0022 — Integração com agregador bancário (Banco MCP / Pluggy)
--
-- Permite que o sistema sincronize automaticamente as transações dos
-- bancos do cliente (Open Finance), preenchendo controle_mensal_lancamentos.
--
-- Modelo:
-- - bank_connections: 1 linha por banco/cartão conectado de um cliente.
--   Guarda o item_id externo (identificador da conexão no provedor).
-- - bank_sync_log: histórico de syncs (auditoria + debugging).
-- - controle_mensal_lancamentos ganha colunas pra rastrear origem
--   (eh_pagamento_fatura, origem_externa, bank_connection_id).
--
-- Sync via Edge Function `sync-bank-transactions`, agendada por pg_cron
-- diariamente. A chave de API fica em env var da Edge Function (não no DB).
-- ============================================================

create extension if not exists pg_net with schema extensions;
-- pg_cron precisa ficar no schema 'cron' do Postgres
create extension if not exists pg_cron;

-- ─── Conexões bancárias por cliente ───────────────────────────────────
create table if not exists bank_connections (
    id                  uuid primary key default gen_random_uuid(),
    client_id           uuid not null references clients(id) on delete cascade,
    provider            text not null default 'banco_mcp'
                          check (provider in ('banco_mcp','pluggy','contaazul','manual')),
    external_item_id    text not null,
    institution_name    text,
    account_type        text check (account_type in ('checking','savings','credit_card','investment','loan','other')),
    status              text not null default 'active'
                          check (status in ('active','paused','error','revoked')),
    last_sync_at        timestamptz,
    last_sync_error     text,
    -- Quanto pra trás buscar no primeiro sync (em dias). Depois usa last_sync_at.
    initial_lookback_days int not null default 90,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),
    unique (provider, external_item_id)
);

create index if not exists ix_bc_client on bank_connections (client_id);
create index if not exists ix_bc_active on bank_connections (status) where status = 'active';

alter table bank_connections enable row level security;

drop policy if exists bc_via_client on bank_connections;
create policy bc_via_client on bank_connections
  for all using (private.owns_client(client_id)) with check (private.owns_client(client_id));

drop trigger if exists trg_bc_updated on bank_connections;
create trigger trg_bc_updated
  before update on bank_connections
  for each row execute function public.set_updated_at();

-- ─── Histórico de sincronizações ──────────────────────────────────────
create table if not exists bank_sync_log (
    id                  uuid primary key default gen_random_uuid(),
    bank_connection_id  uuid references bank_connections(id) on delete cascade,
    client_id           uuid not null references clients(id) on delete cascade,
    started_at          timestamptz not null default now(),
    finished_at         timestamptz,
    status              text not null default 'running'
                          check (status in ('running','success','partial','error')),
    transactions_fetched int not null default 0,
    transactions_inserted int not null default 0,
    transactions_skipped int not null default 0,
    error_message       text,
    triggered_by        text not null default 'cron'
                          check (triggered_by in ('cron','manual','webhook'))
);

create index if not exists ix_bsl_client on bank_sync_log (client_id, started_at desc);
create index if not exists ix_bsl_connection on bank_sync_log (bank_connection_id, started_at desc);

alter table bank_sync_log enable row level security;

drop policy if exists bsl_via_client on bank_sync_log;
create policy bsl_via_client on bank_sync_log
  for select using (private.owns_client(client_id));
-- writes só via service_role (Edge Function); RLS bloqueia consultor.

-- ─── Colunas novas no lancamento pra rastrear origem ──────────────────
alter table controle_mensal_lancamentos
  add column if not exists bank_connection_id uuid references bank_connections(id) on delete set null,
  add column if not exists origem_externa     text,
  add column if not exists eh_pagamento_fatura boolean not null default false,
  add column if not exists external_id        text;

create index if not exists ix_cml_bank_conn on controle_mensal_lancamentos (bank_connection_id);
-- Dedup por id externo do provedor (mais robusto que hash pra mesma transação que vem várias vezes)
create unique index if not exists ux_cml_external
  on controle_mensal_lancamentos (bank_connection_id, external_id)
  where external_id is not null;

comment on column controle_mensal_lancamentos.eh_pagamento_fatura is
  'Marca pagamento de fatura de cartão como debito de conta. Gráficos de gasto por categoria filtram (true = excluído) pra não duplicar com as compras individuais.';
comment on column controle_mensal_lancamentos.external_id is
  'ID original da transação no provedor (pra dedup robusto entre syncs).';
comment on column controle_mensal_lancamentos.origem_externa is
  'Texto livre identificando a conta/cartão de origem (ex: "Nubank Crédito final 1234").';
