-- Aplicação financeira pode ter aporte (ou retirada, valor negativo)
-- recorrente mensal num intervalo de idades.
-- Útil pra visualizar como o saldo evoluiria com aportes regulares.

alter table assets
    add column aporte_mensal           numeric(18,2),
    add column idade_aporte_inicio     int check (idade_aporte_inicio between 0 and 120),
    add column idade_aporte_fim        int check (idade_aporte_fim between 0 and 120),
    add constraint aporte_idade_ordem
        check (idade_aporte_fim is null
               or idade_aporte_inicio is null
               or idade_aporte_fim >= idade_aporte_inicio);
