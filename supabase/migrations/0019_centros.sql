-- ============================================================
-- 0019 — Centros do Controle Mensal: divisões configuráveis por cliente
-- (substitui o enum `tipo` hardcoded por uma árvore de centros: "Diego",
--  "Mirai", "Família", etc.). Mantém `tipo` como fallback até confirmar.
-- ============================================================

create table if not exists controle_mensal_centros (
    id                 uuid primary key default gen_random_uuid(),
    client_id          uuid not null references clients(id) on delete cascade,
    parent_id          uuid references controle_mensal_centros(id) on delete cascade,
    nome               text not null,
    tipo_visual        text not null default 'pessoa'
                         check (tipo_visual in ('pessoa','empresa','projeto','grupo','outro')),
    tem_demonstrativo  boolean not null default false,
    cor                text not null default '#2563eb',
    icone              text not null default 'Receipt',
    ordem              int  not null default 0,
    ativo              boolean not null default true,
    created_at         timestamptz not null default now(),
    updated_at         timestamptz not null default now()
);

create index if not exists ix_cmc_client on controle_mensal_centros (client_id, ordem);
create index if not exists ix_cmc_parent on controle_mensal_centros (parent_id);

alter table controle_mensal_centros enable row level security;

drop policy if exists cmc_via_client on controle_mensal_centros;
create policy cmc_via_client on controle_mensal_centros
  for all using (private.owns_client(client_id)) with check (private.owns_client(client_id));

drop trigger if exists trg_cmc_updated on controle_mensal_centros;
create trigger trg_cmc_updated
  before update on controle_mensal_centros
  for each row execute function public.set_updated_at();

-- ─── Lançamentos: FK opcional pro centro + flag de receita ──────────
alter table controle_mensal_lancamentos
  add column if not exists centro_id  uuid references controle_mensal_centros(id) on delete set null,
  add column if not exists eh_receita boolean;

create index if not exists ix_cml_centro on controle_mensal_lancamentos (centro_id);

-- O `tipo` continua existindo (NOT NULL) por enquanto. Vai sendo
-- preenchido como derivado quando há centro_id (pra views legadas).
-- Pode ser dropado em migration futura quando todas as consultas
-- estiverem migradas pro centro_id.
