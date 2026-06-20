-- ============================================================
-- 0026 — Plano de contas: TIPO (receita/despesa) → CATEGORIA → RUBRICA
--
-- O tipo aceita só receita ou despesa (sem 'ambos'/'gasto').
-- Cada categoria raiz define o tipo; rubricas (filhas) herdam.
-- O plano é por cliente — o consultor monta e mantém.
-- ============================================================

alter table controle_mensal_categorias drop constraint if exists controle_mensal_categorias_tipo_check;

update controle_mensal_categorias set tipo = 'despesa' where tipo = 'gasto';
update controle_mensal_categorias set tipo = 'receita' where tipo not in ('receita','despesa');

alter table controle_mensal_categorias
  add constraint controle_mensal_categorias_tipo_check
  check (tipo in ('receita','despesa'));

comment on column controle_mensal_categorias.tipo is
  'receita ou despesa. Categorias raiz definem o tipo; rubricas (filhas) herdam.';
