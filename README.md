# Planejador Financeiro — MC Castro

SaaS multi-tenant de planejamento financeiro pessoal. Substitui planilhas Excel customizadas por uma ferramenta interativa de simulação de fluxo de caixa de longo prazo, cenários e sensibilidade.

## Stack

- **Frontend:** Next.js 15 (App Router) + TypeScript
- **Engine:** TS puro, função `simulate(input)` em `packages/engine`
- **DB + Auth:** Supabase (Postgres + RLS por consultant_id)
- **Deploy:** Vercel

## Estrutura

```
.
├── apps/web/                  Next.js app (UI + Server Actions)
├── packages/engine/           Engine de simulação (TS puro, sem deps de framework)
├── supabase/migrations/       0001_core_schema, 0002_outputs, 0003_rls
└── package.json               pnpm workspace
```

## Setup

```bash
pnpm install
pnpm -F @planejador/engine test
pnpm -F @planejador/web dev
```

## Status

POC: engine completo, 25 testes verdes, página inicial renderiza simulação do Marcelo Castro.

Próximas fases: ver `CLAUDE.md` (plano em 4 fases).
