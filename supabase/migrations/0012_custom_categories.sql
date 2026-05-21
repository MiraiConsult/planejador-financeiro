-- Permitir categorias customizadas pelo consultor.
--
-- 1) Trocar colunas enum por text livre, pra que o user possa armazenar
--    valores não previstos. Engine continua reconhecendo os valores
--    "especiais" (financeiro_liquido, imovel, venda_ativo) pelo nome.
-- 2) Tabela custom_categories com as opções extras por consultor.

-- Drop constraint que comparava com enum literal — recriamos abaixo
alter table events drop constraint events_venda_ativo;

-- ─── 1) converter enum → text ───
alter table assets   alter column tipo     type text using tipo::text;
alter table assets   alter column natureza type text using natureza::text;
alter table expenses alter column categoria type text using categoria::text;
alter table events   alter column tipo     type text using tipo::text;

-- Recriar constraint do venda_ativo (agora comparando text com text)
alter table events add constraint events_venda_ativo
  check (tipo <> 'venda_ativo' or ativo_referenciado is not null);

-- Os enums em si são deixados (pode haver outros usos). Não dropamos
-- pra evitar quebrar algo. Não fazem mais constraint nas colunas acima.

-- ─── 2) tabela de categorias customizadas ───
create table custom_categories (
    id            uuid primary key default gen_random_uuid(),
    consultant_id uuid not null references profiles(id) on delete cascade,
    kind          text not null check (kind in ('asset_tipo', 'expense_categoria', 'event_tipo')),
    value         text not null,
    label         text not null,
    -- extra carrega metadados; pra asset_tipo guardamos {"natureza": "estoque" | "fluxo"}
    extra         jsonb not null default '{}'::jsonb,
    created_at    timestamptz not null default now(),
    unique (consultant_id, kind, value)
);

create index ix_custom_categories_consultor on custom_categories (consultant_id, kind);

alter table custom_categories enable row level security;

create policy custom_categories_owner on custom_categories
  for all
  using  (consultant_id = auth.uid())
  with check (consultant_id = auth.uid());
