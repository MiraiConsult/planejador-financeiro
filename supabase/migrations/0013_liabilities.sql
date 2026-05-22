-- Passivos (dívidas/financiamentos). Mesma estrutura básica de assets/
-- expenses/events: client_id + soft delete + overrides por idade.
--
-- O motor da simulação consome:
--   parcela_mensal × 12  → saída anual (despesa essencial, no intervalo
--                          idade_inicio..idade_fim);
--   saldo_atual + juros  → saldo devedor projetado, descontado do
--                          patrimônio total ano a ano.

create table liabilities (
    id                  uuid primary key default gen_random_uuid(),
    client_id           uuid not null references clients(id) on delete cascade,
    nome                text not null,
    tipo                text not null default 'outro',
    saldo_atual         numeric(18,2) not null check (saldo_atual >= 0),
    juros_aa            numeric(6,4)  check (juros_aa between 0 and 1),
    parcela_mensal      numeric(18,2) not null check (parcela_mensal > 0),
    idade_inicio        int not null check (idade_inicio between 0 and 120),
    idade_fim           int not null check (idade_fim between 0 and 120),
    notas               text,
    overrides           jsonb not null default '{}'::jsonb,
    deleted_at          timestamptz,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),
    constraint liabilities_idade_ordem check (idade_fim >= idade_inicio)
);

create index ix_liabilities_active on liabilities (client_id) where deleted_at is null;

alter table liabilities enable row level security;

create policy liabilities_via_client on liabilities
  for all
  using  (private.owns_client(client_id))
  with check (private.owns_client(client_id));

-- Trigger pra updated_at (reusa fn já criada nas outras tabelas)
create trigger trg_liabilities_updated
  before update on liabilities
  for each row execute function set_updated_at();

-- Suportar 'liability_tipo' como nova categoria customizável
alter table custom_categories
  drop constraint custom_categories_kind_check,
  add constraint custom_categories_kind_check
    check (kind in ('asset_tipo','expense_categoria','event_tipo','liability_tipo'));
