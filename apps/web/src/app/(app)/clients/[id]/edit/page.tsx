import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Wallet, Receipt, CalendarHeart, TrendingDown, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import {
  AssetEditor,
  ExpenseEditor,
  EventEditor,
  LiabilityEditor,
  AddItemButton,
} from './ItemEditor';

const brlK = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}R$ ${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}R$ ${(abs / 1_000).toFixed(0)}k`;
  return `${sign}R$ ${abs.toFixed(0)}`;
};

type Params = Promise<{ id: string }>;

export default async function EditClientPage({ params }: { params: Params }) {
  const { id: client_id } = await params;
  const supabase = await createClient();

  const [
    { data: client },
    { data: assets },
    { data: expenses },
    { data: events },
    { data: liabilities },
    { data: customCategories },
  ] = await Promise.all([
    supabase
      .from('clients')
      .select('id, nome_completo, data_nascimento, expectativa_vida_anos')
      .eq('id', client_id)
      .maybeSingle(),
    supabase.from('assets').select('*').eq('client_id', client_id).is('deleted_at', null).order('created_at'),
    supabase.from('expenses').select('*').eq('client_id', client_id).is('deleted_at', null).order('created_at'),
    supabase.from('events').select('*').eq('client_id', client_id).is('deleted_at', null).order('created_at'),
    supabase.from('liabilities').select('*').eq('client_id', client_id).is('deleted_at', null).order('created_at'),
    supabase.from('custom_categories').select('kind, value, label, extra').order('label'),
  ]);

  if (!client) notFound();

  type RawCat = { kind: string; value: string; label: string; extra: Record<string, unknown> | null };
  const cats = (customCategories ?? []) as RawCat[];
  const customByKind = {
    asset_tipo: cats
      .filter((c) => c.kind === 'asset_tipo')
      .map((c) => ({
        value: c.value,
        label: c.label,
        natureza: (c.extra?.natureza as string | undefined) ?? 'estoque',
      })),
    expense_categoria: cats
      .filter((c) => c.kind === 'expense_categoria')
      .map((c) => ({ value: c.value, label: c.label })),
    event_tipo: cats
      .filter((c) => c.kind === 'event_tipo')
      .map((c) => ({ value: c.value, label: c.label })),
    liability_tipo: cats
      .filter((c) => c.kind === 'liability_tipo')
      .map((c) => ({ value: c.value, label: c.label })),
  };

  // idade atual do cliente para defaults sensatos ao criar novos itens
  const now = new Date();
  const nasc = new Date(client.data_nascimento);
  let idadeAtual = now.getUTCFullYear() - nasc.getUTCFullYear();
  if (
    now.getUTCMonth() < nasc.getUTCMonth() ||
    (now.getUTCMonth() === nasc.getUTCMonth() && now.getUTCDate() < nasc.getUTCDate())
  ) {
    idadeAtual -= 1;
  }
  const horizonteIdadeFim = client.expectativa_vida_anos;

  const assetsList = assets ?? [];
  const expensesList = expenses ?? [];
  const eventsList = events ?? [];

  const totalPatrimonio = assetsList
    .filter((a) => a.natureza === 'estoque')
    .reduce((acc, a) => acc + Number(a.valor), 0);
  const totalReceitaAno = assetsList
    .filter((a) => a.natureza === 'fluxo')
    .reduce((acc, a) => acc + Number(a.valor), 0);
  const totalDespesaMes = expensesList.reduce((acc, e) => acc + Number(e.valor_mensal), 0);
  const totalDespesaEssencialMes = expensesList
    .filter((e) => e.essencial)
    .reduce((acc, e) => acc + Number(e.valor_mensal), 0);
  const totalEventosImpacto = eventsList.reduce(
    (acc, e) => acc + Math.abs(Number(e.valor)),
    0,
  );
  const liabilitiesList = liabilities ?? [];
  const totalPassivos = liabilitiesList.reduce((acc, l) => acc + Number(l.saldo_atual), 0);
  const totalParcelaMes = liabilitiesList.reduce(
    (acc, l) => acc + Number(l.parcela_mensal),
    0,
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <Link href={`/clients/${client_id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft size={14} />
            Voltar para o cliente
          </Button>
        </Link>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600">
          Edição de dados
        </p>
        <h1 className="text-display-sm font-bold tracking-tight text-slate-900 mt-1">
          {client.nome_completo}
        </h1>
        <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
          <Sparkles size={12} className="text-brand-500" />
          Tudo aqui salva sozinho enquanto você edita — fique de olho no gráfico de cada item.
        </p>
      </div>

      {/* ATIVOS */}
      <Card>
        <CardHeader className="border-b border-slate-100/70 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center ring-1 ring-inset ring-brand-100">
              <Wallet size={16} />
            </div>
            <div>
              <CardTitle>Ativos & receitas</CardTitle>
              <CardDescription>
                {assetsList.length} cadastrados
                {totalPatrimonio > 0 && (
                  <>
                    {' · '}
                    <span className="font-medium text-slate-700 tabular-nums">{brlK(totalPatrimonio)}</span>{' '}
                    de patrimônio
                  </>
                )}
                {totalReceitaAno > 0 && (
                  <>
                    {' · '}
                    <span className="font-medium text-emerald-600 tabular-nums">{brlK(totalReceitaAno)}</span>
                    /ano de receita
                  </>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          {assetsList.map((a) => (
            <AssetEditor
              key={a.id}
              asset={a}
              client_id={client_id}
              customTipos={customByKind.asset_tipo}
            />
          ))}
          <AddItemButton
            kind="asset"
            client_id={client_id}
            idadeInicio={idadeAtual}
            idadeFim={horizonteIdadeFim}
          />
        </CardContent>
      </Card>

      {/* DESPESAS */}
      <Card>
        <CardHeader className="border-b border-slate-100/70 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center ring-1 ring-inset ring-rose-100">
              <Receipt size={16} />
            </div>
            <div>
              <CardTitle>Despesas mensais</CardTitle>
              <CardDescription>
                {expensesList.length} cadastradas
                {totalDespesaMes > 0 && (
                  <>
                    {' · '}
                    <span className="font-medium text-red-600 tabular-nums">{brlK(totalDespesaMes)}</span>
                    /mês
                  </>
                )}
                {totalDespesaEssencialMes > 0 && totalDespesaEssencialMes < totalDespesaMes && (
                  <>
                    {' · '}
                    <span className="tabular-nums">{brlK(totalDespesaEssencialMes)}</span> essencial
                  </>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          {expensesList.map((e) => (
            <ExpenseEditor
              key={e.id}
              expense={e}
              client_id={client_id}
              customCategorias={customByKind.expense_categoria}
            />
          ))}
          <AddItemButton
            kind="expense"
            client_id={client_id}
            idadeInicio={idadeAtual}
            idadeFim={horizonteIdadeFim}
          />
        </CardContent>
      </Card>

      {/* EVENTOS */}
      <Card>
        <CardHeader className="border-b border-slate-100/70 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center ring-1 ring-inset ring-amber-100">
              <CalendarHeart size={16} />
            </div>
            <div>
              <CardTitle>Eventos pontuais</CardTitle>
              <CardDescription>
                {eventsList.length} cadastrados
                {totalEventosImpacto > 0 && (
                  <>
                    {' · '}
                    <span className="font-medium text-slate-700 tabular-nums">{brlK(totalEventosImpacto)}</span>{' '}
                    de impacto total
                  </>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          {eventsList.map((ev) => (
            <EventEditor
              key={ev.id}
              event={ev}
              client_id={client_id}
              customTipos={customByKind.event_tipo}
            />
          ))}
          <AddItemButton
            kind="event"
            client_id={client_id}
            idadeInicio={idadeAtual}
            idadeFim={horizonteIdadeFim}
          />
        </CardContent>
      </Card>

      {/* PASSIVOS */}
      <Card>
        <CardHeader className="border-b border-slate-100/70 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center ring-1 ring-inset ring-orange-100">
              <TrendingDown size={16} />
            </div>
            <div>
              <CardTitle>Passivos &amp; dívidas</CardTitle>
              <CardDescription>
                {liabilitiesList.length} cadastrados
                {totalPassivos > 0 && (
                  <>
                    {' · '}
                    <span className="font-medium text-orange-600 tabular-nums">{brlK(totalPassivos)}</span>{' '}
                    de saldo devedor
                  </>
                )}
                {totalParcelaMes > 0 && (
                  <>
                    {' · '}
                    <span className="tabular-nums">{brlK(totalParcelaMes)}</span>/mês em parcelas
                  </>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          {liabilitiesList.map((l) => (
            <LiabilityEditor
              key={l.id}
              liability={l}
              client_id={client_id}
              customTipos={customByKind.liability_tipo}
            />
          ))}
          <AddItemButton
            kind="liability"
            client_id={client_id}
            idadeInicio={idadeAtual}
            idadeFim={horizonteIdadeFim}
          />
        </CardContent>
      </Card>
    </div>
  );
}
