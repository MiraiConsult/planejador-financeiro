'use client';

import { StepShell } from '../StepShell';
import { idadeFromBirth } from '../helpers';
import { DreamCategories } from '../DreamCategories';
import type { WizardState } from '../Wizard';

interface Props {
  state: WizardState;
  update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
}

export function StepEventos({ state, update }: Props) {
  const idadeAtual = idadeFromBirth(state.data_nascimento) ?? 30;

  return (
    <StepShell
      eyebrow="Passo 2"
      title="Quais são os sonhos?"
      description="Antes da grana, o porquê. Abra qualquer categoria pra ver o que ele quer realizar e quanto custa. Pode ter quantos sonhos quiser dentro de cada uma (ex.: 2 casas em momentos diferentes)."
    >
      <DreamCategories
        events={state.events}
        onChange={(next) => update('events', next)}
        idadeAtual={idadeAtual}
        expectativaVida={state.expectativa_vida_anos}
      />
    </StepShell>
  );
}
