-- ============================================================
-- 0001 — Core schema (entidades de input)
-- Decisões aplicadas: Q1 (todos os ativos), Q2 (perfil de carteira),
-- Q3 (sem drawdown obrigatório), Q4 (tudo em BRL — sem campo moeda),
-- Q5 (assumptions por consultor), Q6 (cascata venda→empréstimo).
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- ENUMs ----------
create type user_role           as enum ('consultant', 'client', 'admin');
create type estado_civil        as enum ('solteiro','casado','divorciado','viuvo');
create type perfil_carteira     as enum ('conservador','moderado','arrojado','custom');

create type asset_tipo          as enum ('imovel','financeiro_liquido','salario','aluguel',
                                         'heranca_recebida','carro','terreno','outro');
create type asset_natureza      as enum ('estoque','fluxo');

create type expense_categoria   as enum ('moradia','alimentacao','transporte','saude','lazer',
                                         'servicos_dom','filhos','estudos','viagens','cuidado_familia','outro');
create type indice_correcao     as enum ('IPCA','IGPM','custom');

create type event_tipo          as enum ('sonho','compra','heranca','venda_ativo','viagem_pontual','imprevisto');
create type recorrencia         as enum ('unico','recorrente_anual','recorrente_espacado');
create type prioridade          as enum ('essencial','desejavel','opcional');

create type scenario_tipo       as enum ('base','otimista','pessimista','personalizado');

-- ---------- profiles (espelha auth.users) ----------
create table profiles (
    id           uuid primary key references auth.users(id) on delete cascade,
    role         user_role   not null default 'consultant',
    full_name    text        not null,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

-- ---------- clients ----------
-- Mesma tela serve consultor e cliente (Q12). client_user_id opcional vincula o login do cliente final.
create table clients (
    id                       uuid primary key default gen_random_uuid(),
    consultant_id            uuid not null references profiles(id) on delete restrict,
    client_user_id           uuid     references profiles(id) on delete set null,
    nome_completo            text not null check (length(nome_completo) >= 3),
    data_nascimento          date not null,
    expectativa_vida_anos    int  not null check (expectativa_vida_anos between 1 and 120),
    idade_aposentadoria      int      check (idade_aposentadoria      between 0 and 120),
    idade_reducao_trabalho   int      check (idade_reducao_trabalho   between 0 and 120),
    estado_civil             estado_civil,
    perfil_carteira          perfil_carteira not null default 'moderado',
    custom_retorno_aa        numeric(6,4)              check (custom_retorno_aa     between -1 and 1),
    custom_volatilidade_aa   numeric(6,4)              check (custom_volatilidade_aa between  0 and 1),
    pais_residencia          text,
    created_at               timestamptz not null default now(),
    updated_at               timestamptz not null default now(),
    constraint clients_custom_requer_params check (
        perfil_carteira <> 'custom'
        or (custom_retorno_aa is not null and custom_volatilidade_aa is not null)
    )
);
create index ix_clients_consultant on clients (consultant_id);

-- ---------- assets ----------
-- Q4: sem campo moeda. Q1: todos os tipos (não só financeiros).
-- Q6: prioridade_liquidacao define ordem de venda forçada quando há déficit.
create table assets (
    id                       uuid primary key default gen_random_uuid(),
    client_id                uuid not null references clients(id) on delete cascade,
    nome                     text not null,
    tipo                     asset_tipo     not null,
    natureza                 asset_natureza not null,
    valor                    numeric(18,2)  not null check (valor > 0),
    idade_inicio             int            not null check (idade_inicio between 0 and 120),
    idade_fim                int            not null check (idade_fim    between 0 and 120),
    indexado_inflacao        boolean        not null default true,
    taxa_retorno_aa          numeric(6,4)            check (taxa_retorno_aa  between -1 and 1),
    valorizacao_aa           numeric(6,4)            check (valorizacao_aa   between -1 and 1),
    prioridade_liquidacao    int                     check (prioridade_liquidacao > 0),
    categoria_classe         text,
    notas                    text,
    created_at               timestamptz not null default now(),
    updated_at               timestamptz not null default now(),
    constraint assets_idade_ordem check (idade_fim >= idade_inicio)
);
create index ix_assets_client on assets (client_id);

-- ---------- expenses ----------
create table expenses (
    id                  uuid primary key default gen_random_uuid(),
    client_id           uuid not null references clients(id) on delete cascade,
    categoria           expense_categoria not null,
    descricao           text not null,
    valor_mensal        numeric(18,2) not null check (valor_mensal > 0),
    idade_inicio        int not null,
    idade_fim           int not null,
    indexado_inflacao   boolean not null default true,
    indice              indice_correcao,
    essencial           boolean not null default false,
    notas               text,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),
    constraint expenses_idade_ordem check (idade_fim >= idade_inicio)
);
create index ix_expenses_client on expenses (client_id);

-- ---------- events ----------
create table events (
    id                  uuid primary key default gen_random_uuid(),
    client_id           uuid not null references clients(id) on delete cascade,
    tipo                event_tipo not null,
    descricao           text not null,
    valor               numeric(18,2) not null,
    padrao_recorrencia  recorrencia not null,
    idade_inicio        int not null,
    idade_fim           int,
    intervalo_anos      int,
    indexado_inflacao   boolean not null default true,
    prioridade          prioridade,
    ativo_referenciado  uuid references assets(id) on delete set null,
    notas               text,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),
    constraint events_espacado_intervalo
        check (padrao_recorrencia <> 'recorrente_espacado'
               or (intervalo_anos is not null and intervalo_anos > 0)),
    constraint events_venda_ativo
        check (tipo <> 'venda_ativo' or ativo_referenciado is not null)
);
create index ix_events_client on events (client_id);

-- ---------- assumptions ----------
-- Q5: por consultor. client_id NULL => default do consultor; preenchido => override do cliente.
-- Q2: presets de retorno+volatilidade por perfil. Q6: custo_credito_aa default 0.15.
create table assumptions (
    id                          uuid primary key default gen_random_uuid(),
    consultant_id               uuid not null references profiles(id) on delete cascade,
    client_id                   uuid     references clients(id)        on delete cascade,
    inflacao_anual_br           numeric(6,4) not null default 0.0400,
    retorno_conservador         numeric(6,4) not null default 0.0800,
    volatilidade_conservador    numeric(6,4) not null default 0.0400,
    retorno_moderado            numeric(6,4) not null default 0.1000,
    volatilidade_moderado       numeric(6,4) not null default 0.0800,
    retorno_arrojado            numeric(6,4) not null default 0.1300,
    volatilidade_arrojado       numeric(6,4) not null default 0.1500,
    valorizacao_imovel_uso      numeric(6,4) not null default 0.0000,
    taxa_desconto_npv           numeric(6,4) not null default 0.0600,
    imposto_renda_efetivo       numeric(6,4) not null default 0.1500,
    custo_credito_aa            numeric(6,4) not null default 0.1500,
    created_at                  timestamptz not null default now(),
    updated_at                  timestamptz not null default now()
);
create unique index ux_assumptions_default_per_consultant
    on assumptions (consultant_id) where client_id is null;
create unique index ux_assumptions_default_per_client
    on assumptions (client_id)     where client_id is not null;

-- ---------- scenarios ----------
create table scenarios (
    id                      uuid primary key default gen_random_uuid(),
    client_id               uuid not null references clients(id) on delete cascade,
    nome                    text not null check (length(nome) between 1 and 100),
    descricao               text,
    tipo                    scenario_tipo not null,
    is_default              boolean not null default false,
    overrides_premissas     jsonb not null default '{}'::jsonb,
    overrides_ativos        jsonb not null default '[]'::jsonb,
    overrides_despesas      jsonb not null default '[]'::jsonb,
    eventos_adicionais      uuid[] not null default '{}',
    eventos_removidos       uuid[] not null default '{}',
    horizonte_idade_final   int,
    created_at              timestamptz not null default now(),
    updated_at              timestamptz not null default now()
);
create unique index ux_scenarios_one_base_per_client
    on scenarios (client_id) where tipo = 'base';
create unique index ux_scenarios_one_default_per_client
    on scenarios (client_id) where is_default = true;

-- ---------- trigger updated_at ----------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','clients','assets','expenses','events','assumptions','scenarios']
  loop
    execute format(
      'create trigger trg_%I_updated before update on %I for each row execute function set_updated_at();',
      t, t);
  end loop;
end $$;
