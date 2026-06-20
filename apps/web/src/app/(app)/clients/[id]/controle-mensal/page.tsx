import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Building2, ClipboardCheck, SlidersHorizontal, Wallet } from 'lucide-react';
import { simulate } from '@planejador/engine';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/PageHeader';
import { loadSimulationInput } from '@/lib/loadSimulation';
import type { Lancamento } from '@/lib/controle-mensal/analytics';
import { ImportCard } from './ImportCard';
import { ControleMensalViews } from './ControleMensalViews';
import { NovoLancamentoButton } from './NovoLancamentoButton';
import { WizardCentros } from './WizardCentros';
import { listarCentros, garantirCentros } from './centros/actions';
import { ativarBalancoPatrimonial } from '../../actions';

const brlCompact = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}R$ ${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}R$ ${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}R$ ${(abs / 1e3).toFixed(0)}k`;
  return `${sign}R$ ${abs.toFixed(0)}`;
};

type Params = Promise<{ id: string }>;

const COLS =
  'id,data,descricao,valor,categoria,subcategoria,mes,mes_num,ano,competencia,tipo,centro_id,eh_receita,origem,cliente_obs,viagem,sistema,is_nexlex';

function uniqOrdenado(vals: Array<string | null | undefined>): string[] {
  return [...new Set(vals.map((v) => (v ?? '').trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  );
}

export default async function ControleMensalPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: client } = await supabase
    .from('clients')
    .select('id, nome_completo, tem_balanco_patrimonial, onboarding_step')
    .eq('id', id)
    .single();
  if (!client) notFound();

  // Resumo do Balanço Patrimonial (se contratado e finalizado)
  let bpSummary:
    | { pendente: false; idadeInicial: number; idadeFinal: number; patrimonioHoje: number; patrimonioFinal: number }
    | { pendente: true; step: number }
    | null = null;
  if (client.tem_balanco_patrimonial) {
    if (client.onboarding_step != null) {
      bpSummary = { pendente: true, step: client.onboarding_step };
    } else {
      const loaded = await loadSimulationInput(id);
      if (loaded) {
        const r = simulate(loaded.input);
        bpSummary = {
          pendente: false,
          idadeInicial: r.input_summary.idade_inicial,
          idadeFinal: r.input_summary.idade_final,
          patrimonioHoje:
            r.input_summary.saldo_financeiro_inicial + r.input_summary.patrimonio_iliquido_inicial,
          patrimonioFinal: r.summary.patrimonio_final,
        };
      }
    }
  }

  const { data: rowsRaw } = await supabase
    .from('controle_mensal_lancamentos')
    .select(COLS)
    .eq('client_id', id);
  const rowsPreBackfill = (rowsRaw ?? []) as unknown as Lancamento[];

  // Auto-backfill: cria centros default + preenche centro_id/eh_receita
  // em lançamentos que ainda não têm (idempotente).
  if (rowsPreBackfill.length > 0) {
    const precisaBackfill = rowsPreBackfill.some(
      (r) => r.centro_id == null || r.eh_receita == null,
    );
    if (precisaBackfill) {
      await garantirCentros(id);
    }
  }

  // Re-query depois do backfill (só REVISADOS alimentam as views/números).
  const { data: rowsRaw2 } = await supabase
    .from('controle_mensal_lancamentos')
    .select(COLS)
    .eq('client_id', id)
    .eq('revisado', true);
  const rows = (rowsRaw2 ?? []) as unknown as Lancamento[];

  // Conta lançamentos aguardando revisão (importados de banco, ainda não validados)
  const { count: pendentesRevisao } = await supabase
    .from('controle_mensal_lancamentos')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', id)
    .eq('revisado', false);

  const centros = await listarCentros(id);

  const sugestoes = {
    categorias: uniqOrdenado(rows.map((r) => r.categoria)),
    subcategorias: uniqOrdenado(rows.map((r) => r.subcategoria)),
    origens: uniqOrdenado(rows.map((r) => r.origem)),
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <Link href={client.tem_balanco_patrimonial ? `/clients/${id}` : '/clients'}>
          <Button variant="ghost" size="sm">
            <ArrowLeft size={14} />
            {client.tem_balanco_patrimonial ? 'Voltar para o cliente' : 'Voltar para clientes'}
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Link href={`/clients/${id}/controle-mensal/bancos`}>
            <Button variant="ghost" size="sm">
              <Building2 size={14} />
              Bancos
            </Button>
          </Link>
          <Link href={`/clients/${id}/controle-mensal/dados-cadastrais`}>
            <Button variant="ghost" size="sm">
              <SlidersHorizontal size={14} />
              Dados Cadastrais
            </Button>
          </Link>
          <NovoLancamentoButton clientId={id} sugestoes={sugestoes} centros={centros} />
        </div>
      </div>

      <PageHeader
        eyebrow="Controle Mensal"
        title={`Realizado — ${client.nome_completo}`}
        description="Lançamentos reais (receitas e gastos) importados mês a mês. Fonte: planilha de Lançamentos. O tipo Mirai nunca entra nos gastos pessoais; viagens ficam à parte."
      />

      {(pendentesRevisao ?? 0) > 0 && (
        <Link
          href={`/clients/${id}/controle-mensal/revisao`}
          className="block rounded-2xl border-2 border-amber-300 bg-amber-50/60 hover:bg-amber-50 transition-colors p-5 flex items-center gap-4 group"
        >
          <div className="h-11 w-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0">
            <ClipboardCheck size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">
              {pendentesRevisao} lançamento{pendentesRevisao === 1 ? '' : 's'} aguardando revisão
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Importados dos bancos. Confira a categorização e aprove pra entrarem nos números.
            </p>
          </div>
          <span className="text-sm font-medium text-amber-700 flex items-center gap-1 shrink-0">
            Revisar agora
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </span>
        </Link>
      )}

      {!client.tem_balanco_patrimonial && (
        <form action={ativarBalancoPatrimonial}>
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            className="w-full text-left rounded-2xl border-2 border-dashed border-slate-300 hover:border-brand-400 hover:bg-brand-50/40 transition-colors p-5 flex items-center gap-4 group"
          >
            <div className="h-11 w-11 rounded-2xl bg-slate-100 group-hover:bg-brand-500 group-hover:text-white text-slate-500 flex items-center justify-center shrink-0 transition-colors">
              <Wallet size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 group-hover:text-brand-900">
                Ativar Balanço Patrimonial
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Planejamento de longo prazo: ativos, despesas, eventos e projeção da vida toda
              </p>
            </div>
            <ArrowRight size={16} className="text-slate-400 group-hover:text-brand-600 shrink-0" />
          </button>
        </form>
      )}

      {bpSummary && (
        <Link
          href={bpSummary.pendente ? `/clients/new?id=${id}` : `/clients/${id}`}
          className={`block rounded-3xl border-2 p-5 transition-all hover:-translate-y-0.5 shadow-soft hover:shadow-soft-lg ${
            bpSummary.pendente
              ? 'border-amber-200 bg-amber-50/40 hover:border-amber-300'
              : 'border-brand-200/70 bg-gradient-to-br from-brand-50/30 to-white hover:border-brand-300'
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
                bpSummary.pendente ? 'bg-amber-500 text-white' : 'bg-brand-500 text-white'
              }`}
            >
              <Wallet size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-700">
                  Balanço Patrimonial
                </p>
                {bpSummary.pendente && (
                  <Badge variant="warning">Onboarding pendente · passo {bpSummary.step}/6</Badge>
                )}
              </div>
              {bpSummary.pendente ? (
                <p className="mt-1 text-base font-semibold text-slate-900">
                  Termine o onboarding pra abrir o plano de longo prazo
                </p>
              ) : (
                <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-sm tabular-nums items-baseline">
                  <span className="text-base font-semibold text-slate-900">
                    {bpSummary.idadeInicial}–{bpSummary.idadeFinal} anos
                  </span>
                  <span className="text-slate-500">
                    Patrimônio hoje{' '}
                    <strong className="text-slate-900">{brlCompact(bpSummary.patrimonioHoje)}</strong>
                  </span>
                  <span className="text-slate-500">
                    Projeção{' '}
                    <strong
                      className={
                        bpSummary.patrimonioFinal < 0 ? 'text-red-600' : 'text-emerald-700'
                      }
                    >
                      {brlCompact(bpSummary.patrimonioFinal)}
                    </strong>
                  </span>
                </div>
              )}
            </div>
            <ArrowRight size={16} className="text-slate-400 shrink-0 mt-1" />
          </div>
        </Link>
      )}

      {rows.length === 0 ? (
        <>
          {centros.length === 0 && <WizardCentros clientId={id} />}
          <ImportCard clientId={id} vazio />
        </>
      ) : (
        <>
          <ImportCard clientId={id} />
          <ControleMensalViews rows={rows} clientId={id} sugestoes={sugestoes} centros={centros} />
        </>
      )}
    </div>
  );
}
