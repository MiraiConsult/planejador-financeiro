-- ============================================================
-- 0020 — Produtos por cliente: separação Balanço Patrimonial vs Controle Mensal
--
-- Cada cliente pode ter um ou os dois produtos contratados.
-- Cada produto tem seu próprio fluxo de onboarding e seu próprio
-- "step" de progresso (NULL = finalizado, 1..N = em rascunho).
--
-- Backfill: todos os clientes existentes ficam com balanço marcado
-- (preserva comportamento atual).
-- ============================================================

alter table clients
  add column if not exists tem_balanco_patrimonial boolean not null default false,
  add column if not exists tem_controle_mensal     boolean not null default false,
  add column if not exists onboarding_step_cm      int check (onboarding_step_cm between 1 and 4);

-- Backfill: clientes existentes preservam o comportamento atual
update clients set tem_balanco_patrimonial = true where tem_balanco_patrimonial = false;

-- Pelo menos um produto contratado (sentinela contra cliente "fantasma")
alter table clients
  drop constraint if exists clients_tem_pelo_menos_um_produto;
alter table clients
  add constraint clients_tem_pelo_menos_um_produto
  check (tem_balanco_patrimonial or tem_controle_mensal);

comment on column clients.onboarding_step is 'Step do onboarding do balanço patrimonial. NULL = finalizado.';
comment on column clients.onboarding_step_cm is 'Step do onboarding do controle mensal. NULL = finalizado.';
comment on column clients.tem_balanco_patrimonial is 'Cliente contratou o produto Balanço Patrimonial (planejamento de longo prazo).';
comment on column clients.tem_controle_mensal is 'Cliente contratou o produto Controle Mensal (gestão do realizado mês a mês).';

create index if not exists ix_clients_drafts_cm
  on clients (consultant_id) where onboarding_step_cm is not null;
