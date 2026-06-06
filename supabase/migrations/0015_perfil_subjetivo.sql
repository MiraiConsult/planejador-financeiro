-- Perfil subjetivo do cliente: respostas qualitativas que alimentam a
-- IA no passo de Sonhos. Armazenado como jsonb pra flexibilidade
-- (podemos adicionar/remover perguntas sem migration).
--
-- Estrutura prevista:
-- {
--   "visao_30_anos": "...",
--   "medo_principal": "...",
--   "significado_dinheiro": "...",
--   "referencia_dinheiro": "...",
--   "legado": "..."
-- }
--
-- Tudo opcional — cliente pode pular qualquer pergunta.

alter table clients
    add column perfil_subjetivo jsonb not null default '{}'::jsonb;
