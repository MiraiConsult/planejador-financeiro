-- Adicionar:
--   * crescimento real anual (% acima da inflação; pode ser negativo)
--   * recorrência (único / anual / espaçado) também em assets e expenses
--   * overrides por idade (jsonb) em assets, expenses e events
--
-- overrides é { "60": 5000, "61": 5500, ... } onde a chave é a idade
-- e o valor sobrescreve o cálculo paramétrico naquela idade.

alter table assets
    add column crescimento_real_aa numeric(6,4) check (crescimento_real_aa between -1 and 1),
    add column padrao_recorrencia  recorrencia,
    add column intervalo_anos      int check (intervalo_anos > 0),
    add column overrides           jsonb not null default '{}'::jsonb;

alter table expenses
    add column crescimento_real_aa numeric(6,4) check (crescimento_real_aa between -1 and 1),
    add column padrao_recorrencia  recorrencia not null default 'recorrente_anual',
    add column intervalo_anos      int check (intervalo_anos > 0),
    add column overrides           jsonb not null default '{}'::jsonb,
    add constraint expenses_espacado_intervalo
        check (padrao_recorrencia <> 'recorrente_espacado'
               or (intervalo_anos is not null and intervalo_anos > 0));

alter table events
    add column overrides jsonb not null default '{}'::jsonb;

-- Constraint análoga em assets só vale quando há recorrência definida
alter table assets
    add constraint assets_espacado_intervalo
        check (padrao_recorrencia is null
               or padrao_recorrencia <> 'recorrente_espacado'
               or (intervalo_anos is not null and intervalo_anos > 0));
