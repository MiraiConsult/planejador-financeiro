-- ============================================================
-- 0023 — Refactor bank_connections pro formato real do Banco MCP (Pluggy)
--
-- Schema do provedor:
--   connection (item)
--     ├── account 1 (BANK / CHECKING)
--     ├── account 2 (CREDIT / CREDIT_CARD)
--     └── ...
--   transactions são listadas POR account_id
--
-- Antes: bank_connections.external_item_id armazenava (erroneamente) o
-- item_id. Agora: 1 row por ACCOUNT, com item_id como agrupador.
-- ============================================================

-- Drop índice unique antigo (vai ser recriado)
drop index if exists bank_connections_provider_external_item_id_key;
alter table bank_connections drop constraint if exists bank_connections_provider_external_item_id_key;

-- Renomeia: external_item_id → external_account_id
alter table bank_connections rename column external_item_id to external_account_id;

-- Adiciona item_id (connection no provedor) — agrupador visual e pra refresh em massa
alter table bank_connections
  add column if not exists external_item_id text,
  add column if not exists account_subtype text,
  add column if not exists account_number  text,
  add column if not exists account_owner   text,
  add column if not exists currency        text default 'BRL',
  add column if not exists last_balance    numeric(18,2),
  add column if not exists last_balance_at timestamptz;

-- Unique no account_id (1 conta = 1 conexão)
alter table bank_connections
  add constraint bank_connections_provider_external_account_id_key
  unique (provider, external_account_id);

create index if not exists ix_bc_item on bank_connections (external_item_id) where external_item_id is not null;

-- ─── Colunas novas pra transação ──────────────────────────────────────
alter table controle_mensal_lancamentos
  add column if not exists status_transacao    text default 'posted'
                            check (status_transacao in ('pending','posted')),
  add column if not exists categoria_externa_id text,
  add column if not exists merchant            text,
  add column if not exists payment_method      text,
  add column if not exists counterparty        text;

comment on column controle_mensal_lancamentos.status_transacao is
  'POSTED (efetivado) ou PENDING (pré-lançamento, ex: compra de cartão antes da fatura fechar). Pode ser atualizado por sync subsequente.';
comment on column controle_mensal_lancamentos.categoria_externa_id is
  'categoryId do provedor (Pluggy/MCP), estável entre syncs. Permite mapear pra categoria_id local.';
