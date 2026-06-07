-- Histórico de mensagens do chat de refinamento por cliente. Cada
-- mensagem do assistant pode trazer um patch (RefinementPatch JSON)
-- que o consultor aplica ou ignora.

create table refinement_messages (
    id              uuid primary key default gen_random_uuid(),
    client_id       uuid not null references clients(id) on delete cascade,
    role            text not null check (role in ('user', 'assistant')),
    content         text not null,
    patch           jsonb,
    patch_applied   boolean not null default false,
    created_at      timestamptz not null default now()
);

create index ix_refinement_messages_client_time
  on refinement_messages (client_id, created_at);

alter table refinement_messages enable row level security;

create policy refinement_messages_via_client on refinement_messages
  for all
  using  (private.owns_client(client_id))
  with check (private.owns_client(client_id));
