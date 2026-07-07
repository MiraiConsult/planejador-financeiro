-- Conciliação bancária: marca lançamentos como conciliados contra o
-- extrato do banco. Índice cobre o filtro banco (origem) + competência.
alter table controle_mensal_lancamentos
  add column if not exists conciliado boolean not null default false;

create index if not exists ix_cml_conciliacao
  on controle_mensal_lancamentos (client_id, origem, competencia);
