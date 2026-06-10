-- ============================================================
-- 0021 — Categorias customizáveis do Controle Mensal por cliente
--
-- Antes: lançamentos tinham `categoria` e `subcategoria` como texto
-- livre. Agora também podem apontar pra uma categoria estruturada,
-- com hierarquia, cor, ícone e tipo (receita/gasto).
-- Os campos text continuam pra compat com importações cruas.
-- ============================================================

create table if not exists controle_mensal_categorias (
    id            uuid primary key default gen_random_uuid(),
    client_id     uuid not null references clients(id) on delete cascade,
    parent_id     uuid references controle_mensal_categorias(id) on delete cascade,
    nome          text not null,
    tipo          text not null default 'gasto'
                    check (tipo in ('receita','gasto','ambos')),
    cor           text not null default '#64748b',
    icone         text not null default 'Tag',
    ordem         int  not null default 0,
    ativo         boolean not null default true,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

create index if not exists ix_cmcat_client on controle_mensal_categorias (client_id, ordem);
create index if not exists ix_cmcat_parent on controle_mensal_categorias (parent_id);

alter table controle_mensal_categorias enable row level security;

drop policy if exists cmcat_via_client on controle_mensal_categorias;
create policy cmcat_via_client on controle_mensal_categorias
  for all using (private.owns_client(client_id)) with check (private.owns_client(client_id));

drop trigger if exists trg_cmcat_updated on controle_mensal_categorias;
create trigger trg_cmcat_updated
  before update on controle_mensal_categorias
  for each row execute function public.set_updated_at();

-- FK opcional pro lançamento. Mantém categoria/subcategoria text por compat.
alter table controle_mensal_lancamentos
  add column if not exists categoria_id uuid references controle_mensal_categorias(id) on delete set null;

create index if not exists ix_cml_categoria on controle_mensal_lancamentos (categoria_id);
