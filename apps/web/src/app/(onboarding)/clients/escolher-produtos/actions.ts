'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function criarClienteComProdutos(args: {
  nome_completo: string;
  data_nascimento: string;
  tem_balanco_patrimonial: boolean;
  tem_controle_mensal: boolean;
}): Promise<{ ok: true; client_id: string; first_onboarding_url: string } | { ok: false; error: string }> {
  const nome = args.nome_completo.trim();
  if (!nome) return { ok: false, error: 'Informe o nome do cliente' };
  if (!args.data_nascimento) return { ok: false, error: 'Informe a data de nascimento' };
  if (!args.tem_balanco_patrimonial && !args.tem_controle_mensal) {
    return { ok: false, error: 'Selecione ao menos um produto' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Não autenticado' };

  const { data, error } = await supabase
    .from('clients')
    .insert({
      consultant_id: user.id,
      nome_completo: nome,
      data_nascimento: args.data_nascimento,
      expectativa_vida_anos: 90,
      idade_aposentadoria: 65,
      perfil_carteira: 'moderado',
      pais_residencia: 'BR',
      tem_balanco_patrimonial: args.tem_balanco_patrimonial,
      tem_controle_mensal: args.tem_controle_mensal,
      onboarding_step: args.tem_balanco_patrimonial ? 1 : null,
      onboarding_step_cm: args.tem_controle_mensal ? 1 : null,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? 'Falha ao criar cliente' };
  }

  await supabase.from('assumptions').insert({ consultant_id: user.id, client_id: data.id });
  await supabase.from('scenarios').insert([
    { client_id: data.id, nome: 'Base', tipo: 'base', is_default: true },
    { client_id: data.id, nome: 'Otimista', tipo: 'otimista', is_default: false },
    { client_id: data.id, nome: 'Pessimista', tipo: 'pessimista', is_default: false },
  ]);

  const first = args.tem_balanco_patrimonial
    ? `/clients/new?id=${data.id}`
    : `/clients/${data.id}/onboarding-cm`;

  return { ok: true, client_id: data.id, first_onboarding_url: first };
}

export async function redirectToFirstOnboarding(args: {
  client_id: string;
  tem_balanco_patrimonial: boolean;
  tem_controle_mensal: boolean;
}): Promise<never> {
  if (args.tem_balanco_patrimonial) redirect(`/clients/new?id=${args.client_id}`);
  if (args.tem_controle_mensal) redirect(`/clients/${args.client_id}/onboarding-cm`);
  redirect(`/clients/${args.client_id}`);
}
