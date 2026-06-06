-- Guarda a transcrição da reunião associada ao cliente. Permite voltar
-- nela depois pra refinamentos guiados pela IA.

alter table clients
    add column transcricao text;
