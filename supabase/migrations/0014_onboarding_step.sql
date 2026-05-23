-- Permite retomar onboarding inacabado.
--
-- onboarding_step:
--   null  → onboarding finalizado (estado normal)
--   1..6  → cliente em rascunho, parou no step N
--
-- Acoplado a clients pra que cada rascunho viva enquanto não é
-- finalizado. Lista de clientes pode filtrar pra mostrar rascunhos
-- separados na UI.

alter table clients
    add column onboarding_step int check (onboarding_step between 1 and 6);

create index ix_clients_drafts on clients (consultant_id) where onboarding_step is not null;
