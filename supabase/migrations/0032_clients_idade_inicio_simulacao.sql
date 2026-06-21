-- Permite forçar a idade em que a simulação começa, independente da
-- idade real derivada de data_nascimento. Quando setada, loadSimulation
-- computa uma reference_date sintética (data_nascimento + N anos) para
-- que o motor enxergue essa idade como "hoje". Quando NULL, motor usa
-- a idade real.
alter table clients
  add column if not exists idade_inicio_simulacao int
    check (idade_inicio_simulacao is null or (idade_inicio_simulacao between 1 and 120));
