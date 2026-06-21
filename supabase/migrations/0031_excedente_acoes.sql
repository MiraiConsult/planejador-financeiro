-- Ações que o cliente quer fazer com excedentes detectados na
-- simulação (popup "Teve excedente. O que você quer fazer?" no balanço).
-- Pode ser global (idade = null) ou específica de um ano.
create table excedente_acoes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  idade int,                                -- null = ação padrão para todos os anos
  acao text not null check (length(acao) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ix_excedente_acoes_client on excedente_acoes (client_id);

alter table excedente_acoes enable row level security;
create policy excedente_acoes_via_client on excedente_acoes
  for all using (private.owns_client(client_id)) with check (private.owns_client(client_id));

create trigger trg_excedente_acoes_updated
  before update on excedente_acoes
  for each row execute function set_updated_at();
