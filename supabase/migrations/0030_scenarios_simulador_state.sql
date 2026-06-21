-- Guarda o estado interativo do "Simulador" (sliders + checkboxes +
-- metas pontuais) num cenário tipo='personalizado'. Ao carregar para
-- /compare ou /balanco, o app reaplica esse state sobre o input base.
--
-- Formato esperado (validado em app/lib/simuladorState.ts):
-- {
--   "ajustes": {
--     "receitaPct": number, "gastosPct": number, "sonhosPct": number,
--     "desReceita": string[], "desGastos": string[], "desSonhos": string[]
--   },
--   "metas": [
--     { "id": uuid, "descricao": text, "idade": int, "valor": number,
--       "tipo": "compra" | "sonho" | "viagem_pontual" }
--   ]
-- }
alter table scenarios
  add column if not exists simulador_state jsonb;
