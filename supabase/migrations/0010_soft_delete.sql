-- Soft delete em assets / expenses / events: o delete vira um
-- update de deleted_at, dando suporte a "Desfazer" sem perder dados.
--
-- Queries existentes da app passam a filtrar deleted_at is null
-- (mudança no código TS, não no schema).

alter table assets   add column deleted_at timestamptz;
alter table expenses add column deleted_at timestamptz;
alter table events   add column deleted_at timestamptz;

-- Index parcial: rows ativas (deleted_at null) é o caso 99%; barata.
create index ix_assets_active   on assets   (client_id) where deleted_at is null;
create index ix_expenses_active on expenses (client_id) where deleted_at is null;
create index ix_events_active   on events   (client_id) where deleted_at is null;
