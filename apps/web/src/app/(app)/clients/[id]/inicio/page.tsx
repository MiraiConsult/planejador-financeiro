import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, CalendarRange, Wallet } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { loadSimulationInput } from '@/lib/loadSimulation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BpKpisClient } from './BpKpisClient';

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const brlCompact = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}R$ ${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}R$ ${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}R$ ${(abs / 1e3).toFixed(0)}k`;
  return brl(n);
};

type Params = Promise<{ id: string }>;

export default async function InicioPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: c } = await supabase
    .from('clients')
    .select('id, nome_completo, tem_balanco_patrimonial, tem_controle_mensal, onboarding_step, onboarding_step_cm')
    .eq('id', id)
    .maybeSingle();
  if (!c) notFound();

  // ─── BP: só pegamos o input. A simulação roda no client. ──────
  const bpPendente = c.tem_balanco_patrimonial && c.onboarding_step != null;
  const bpInput =
    c.tem_balanco_patrimonial && !bpPendente ? await loadSimulationInput(id) : null;

  // ─── CF: resumo do mês corrente ───────────────────────────────
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  let cf: {
    pendente: boolean;
    step: number | null;
    receitaMes: number;
    gastoMes: number;
    lancMes: number;
    mesLabel: string;
  } | null = null;
  if (c.tem_controle_mensal) {
    const hoje = new Date();
    const compAtual = hoje.getFullYear() * 100 + (hoje.getMonth() + 1);
    const { data: lancs } = await supabase
      .from('controle_mensal_lancamentos')
      .select('valor, eh_receita')
      .eq('client_id', id)
      .eq('competencia', compAtual);
    const rows = (lancs ?? []) as Array<{ valor: number; eh_receita: boolean | null }>;
    const receitaMes = rows
      .filter((r) => r.eh_receita === true || (r.eh_receita == null && Number(r.valor) > 0))
      .reduce((s, r) => s + Math.abs(Number(r.valor)), 0);
    const gastoMes = rows
      .filter((r) => r.eh_receita === false || (r.eh_receita == null && Number(r.valor) < 0))
      .reduce((s, r) => s + Math.abs(Number(r.valor)), 0);
    cf = {
      pendente: c.onboarding_step_cm != null,
      step: c.onboarding_step_cm,
      receitaMes,
      gastoMes,
      lancMes: rows.length,
      mesLabel: `${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`,
    };
  }

  const saldoMes = cf ? cf.receitaMes - cf.gastoMes : 0;
  const temBp = c.tem_balanco_patrimonial;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600">Início</p>
        <h1 className="text-display-sm font-bold tracking-tight text-slate-900 mt-1">
          {c.nome_completo}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Resumo geral do seu plano financeiro.
        </p>
      </div>

      {/* ─── BP card ──────────────────────────────────────────── */}
      {temBp && (
        <Link href={`/clients/${id}/balanco`} className="block group">
          <Card className="group-hover:ring-2 group-hover:ring-brand-200 transition-all">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-brand-50 p-2.5 ring-1 ring-inset ring-brand-100">
                    <Wallet size={18} className="text-brand-700" />
                  </div>
                  <div>
                    <CardTitle>Balanço Patrimonial</CardTitle>
                    <CardDescription>Projeção de patrimônio ao longo da vida</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {bpPendente && <Badge variant="warning">Onboarding pendente</Badge>}
                  <ArrowRight size={18} className="text-slate-400 group-hover:text-brand-700 transition-colors" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {bpPendente ? (
                <p className="text-sm text-slate-500">
                  Continue o cadastro para ver a projeção patrimonial.
                </p>
              ) : bpInput ? (
                <BpKpisClient input={bpInput.input} />
              ) : null}
            </CardContent>
          </Card>
        </Link>
      )}

      {/* ─── CF card ──────────────────────────────────────────── */}
      {cf && (
        <Link
          href={cf.pendente ? `/clients/${id}/onboarding-cm` : `/clients/${id}/controle-mensal`}
          className="block group"
        >
          <Card className="group-hover:ring-2 group-hover:ring-emerald-200 transition-all">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-50 p-2.5 ring-1 ring-inset ring-emerald-100">
                    <CalendarRange size={18} className="text-emerald-700" />
                  </div>
                  <div>
                    <CardTitle>Controle Financeiro</CardTitle>
                    <CardDescription>
                      {cf.pendente
                        ? `Onboarding em andamento (passo ${cf.step}/4)`
                        : cf.mesLabel}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {cf.pendente && <Badge variant="warning">passo {cf.step}/4</Badge>}
                  <ArrowRight size={18} className="text-slate-400 group-hover:text-emerald-700 transition-colors" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {cf.pendente ? (
                <p className="text-sm text-slate-500">
                  Termine o onboarding pra começar a registrar lançamentos.
                </p>
              ) : cf.lancMes === 0 ? (
                <p className="text-sm text-slate-500">
                  Nenhum lançamento neste mês ainda.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <KpiCfBox label="Receita do mês" value={brlCompact(cf.receitaMes)} tone="success" />
                  <KpiCfBox label="Gastos do mês" value={brlCompact(cf.gastoMes)} tone="danger" />
                  <KpiCfBox
                    label="Saldo do mês"
                    value={brlCompact(saldoMes)}
                    tone={saldoMes < 0 ? 'danger' : 'success'}
                  />
                  <KpiCfBox label="Lançamentos" value={String(cf.lancMes)} />
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      )}

      {!temBp && !cf && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-slate-500">
              Nenhum produto contratado ainda.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KpiCfBox({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'danger';
}) {
  const cor =
    tone === 'success' ? 'text-emerald-700' : tone === 'danger' ? 'text-red-600' : 'text-slate-900';
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`text-lg font-bold tabular-nums tracking-tight mt-1 ${cor}`}>{value}</p>
    </div>
  );
}
