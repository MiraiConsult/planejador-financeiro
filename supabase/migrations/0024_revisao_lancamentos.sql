-- ============================================================
-- 0024 — Revisão de lançamentos importados + mapa de categorização
--
-- Fluxo de validação: lançamentos vindos de bancos (Banco MCP) entram
-- como revisado=false e NÃO contam nos gráficos/demonstrativos até o
-- consultor revisar a categorização e aprovar.
--
-- Categorização automática: cada categoria local guarda um prefixo de
-- match (external_match_prefix) que casa com os 2 primeiros dígitos do
-- categoryId do provedor (taxonomia Pluggy/Banco MCP).
-- ============================================================

-- Flag de revisão. Default true pra não afetar lançamentos existentes
-- (manuais e importações antigas). Importados via banco entram com false.
alter table controle_mensal_lancamentos
  add column if not exists revisado boolean not null default true;

create index if not exists ix_cml_revisao
  on controle_mensal_lancamentos (client_id, revisado)
  where revisado = false;

-- Prefixo de match pra categorização automática (ex: '19' = Transporte)
alter table controle_mensal_categorias
  add column if not exists external_match_prefix text;

create index if not exists ix_cmcat_prefix
  on controle_mensal_categorias (client_id, external_match_prefix)
  where external_match_prefix is not null;

comment on column controle_mensal_lancamentos.revisado is
  'Lançamentos importados de banco entram false (fila de revisão). Manuais e aprovados = true. Views só contam true.';
comment on column controle_mensal_categorias.external_match_prefix is
  'Prefixo (2 dígitos) do categoryId do provedor que mapeia pra esta categoria. Ex: 17=Moradia, 19=Transporte.';
