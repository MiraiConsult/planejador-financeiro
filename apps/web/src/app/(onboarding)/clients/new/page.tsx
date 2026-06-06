import { Wizard, type WizardState } from './Wizard';
import { loadOnboardingDraft } from './actions';

interface SearchParams {
  id?: string;
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const draftId = sp.id;

  if (!draftId) return <Wizard />;

  const res = await loadOnboardingDraft(draftId);
  if (!res.ok) {
    // id inválido — recomeça do zero
    return <Wizard />;
  }

  const initial: WizardState = {
    nome_completo: res.payload.nome_completo,
    data_nascimento: res.payload.data_nascimento,
    expectativa_vida_anos: res.payload.expectativa_vida_anos,
    idade_aposentadoria: res.payload.idade_aposentadoria,
    idade_reducao_trabalho: res.payload.idade_reducao_trabalho,
    perfil_carteira: res.payload.perfil_carteira,
    custom_retorno_aa: res.payload.custom_retorno_aa,
    custom_volatilidade_aa: res.payload.custom_volatilidade_aa,
    perfil_subjetivo: res.payload.perfil_subjetivo ?? {},
    assets: res.payload.assets,
    expenses: res.payload.expenses,
    events: res.payload.events,
    liabilities: res.payload.liabilities,
  };

  return (
    <Wizard initialClientId={draftId} initialState={initial} initialStep={res.step} />
  );
}
