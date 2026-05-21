import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Wallet, Receipt, CalendarHeart, ChevronDown } from 'lucide-react';
import { valorAnualSerie } from '@planejador/engine';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/Button';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Input, Label } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EditableSeriesChart, type EditablePoint } from '@/components/charts/EditableSeriesChart';
import {
  AgeRangeFields,
  AssetNatureFields,
  ExpenseGrowthRecurrenceFields,
  RecorrenciaField,
} from './FormFields';
import {
  addAsset,
  addExpense,
  addEvent,
  updateAsset,
  updateExpense,
  updateEvent,
  deleteAsset,
  deleteExpense,
  deleteEvent,
} from './actions';

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const brlK = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}R$ ${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}R$ ${(abs / 1_000).toFixed(0)}k`;
  return `${sign}R$ ${abs.toFixed(0)}`;
};

const assetTipos = [
  { value: 'financeiro_liquido', label: 'Aplicação financeira', natureza: 'estoque' },
  { value: 'imovel', label: 'Imóvel', natureza: 'estoque' },
  { value: 'terreno', label: 'Terreno', natureza: 'estoque' },
  { value: 'carro', label: 'Veículo', natureza: 'estoque' },
  { value: 'heranca_recebida', label: 'Herança', natureza: 'estoque' },
  { value: 'salario', label: 'Salário', natureza: 'fluxo' },
  { value: 'aluguel', label: 'Aluguel/Arrendamento', natureza: 'fluxo' },
  { value: 'outro', label: 'Outro', natureza: 'estoque' },
];

const natureByTipo: Record<string, string> = Object.fromEntries(
  assetTipos.map((t) => [t.value, t.natureza]),
);

const expenseCategorias = [
  'moradia', 'alimentacao', 'transporte', 'saude', 'lazer',
  'servicos_dom', 'filhos', 'estudos', 'viagens', 'cuidado_familia', 'outro',
];

const eventTipos = [
  { value: 'sonho', label: 'Sonho' },
  { value: 'compra', label: 'Compra' },
  { value: 'viagem_pontual', label: 'Viagem' },
  { value: 'heranca', label: 'Herança' },
  { value: 'imprevisto', label: 'Imprevisto' },
];

const recorrenciaOptions = [
  { value: 'recorrente_anual', label: 'Todo ano' },
  { value: 'unico', label: 'Apenas no início' },
  { value: 'recorrente_espacado', label: 'A cada N anos' },
];

// Premissa de inflação local (espelha o assumptions default; em fase 2 vem do banco)
const INFLACAO_AA = 0.045;

/**
 * Calcula a série paramétrica (valor "base", sem override) ano a ano,
 * para preencher o gráfico editável.
 */
function buildEditablePoints(opts: {
  valorBase: number;
  idadeInicio: number;
  idadeFim: number;
  padrao?: string | null;
  intervaloAnos?: number | null;
  crescimentoRealAa?: number | null;
  indexadoInflacao: boolean;
  overrides: Record<string, number>;
}): EditablePoint[] {
  const points: EditablePoint[] = [];
  for (let idade = opts.idadeInicio; idade <= opts.idadeFim; idade++) {
    const t = idade - opts.idadeInicio;
    const inflacaoFator = Math.pow(1 + INFLACAO_AA, t);
    const base = valorAnualSerie({
      valorBase: opts.valorBase,
      idade,
      idadeInicio: opts.idadeInicio,
      idadeFim: opts.idadeFim,
      padrao: (opts.padrao ?? undefined) as never,
      intervaloAnos: opts.intervaloAnos ?? undefined,
      crescimentoRealAa: opts.crescimentoRealAa ?? undefined,
      indexadoInflacao: opts.indexadoInflacao,
      inflacaoFator,
      overrides: undefined,
    });
    const ov = opts.overrides?.[String(idade)];
    points.push({
      idade,
      base: Math.round(base),
      ...(ov !== undefined && ov !== null ? { override: Number(ov) } : {}),
    });
  }
  return points;
}

type Params = Promise<{ id: string }>;

export default async function EditClientPage({ params }: { params: Params }) {
  const { id: client_id } = await params;
  const supabase = await createClient();

  const [{ data: client }, { data: assets }, { data: expenses }, { data: events }] = await Promise.all([
    supabase.from('clients').select('id, nome_completo, expectativa_vida_anos').eq('id', client_id).maybeSingle(),
    supabase.from('assets').select('*').eq('client_id', client_id).order('created_at'),
    supabase.from('expenses').select('*').eq('client_id', client_id).order('created_at'),
    supabase.from('events').select('*').eq('client_id', client_id).order('created_at'),
  ]);

  if (!client) notFound();

  // ─── Agregados para os headers ───
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
        <p className="text-sm text-slate-500 mt-1">
          Adicione, edite ou remova ativos, despesas e eventos. Mudanças refletem na simulação automaticamente.
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
        <CardContent className="p-0">
          {(assets ?? []).length > 0 && (
            <ul className="divide-y divide-slate-100">
              {(assets ?? []).map((a) => {
                const isFluxo = a.natureza === 'fluxo';
                const points = isFluxo
                  ? buildEditablePoints({
                      valorBase: Number(a.valor),
                      idadeInicio: Number(a.idade_inicio),
                      idadeFim: Number(a.idade_fim),
                      padrao: a.padrao_recorrencia,
                      intervaloAnos: a.intervalo_anos,
                      crescimentoRealAa: a.crescimento_real_aa,
                      indexadoInflacao: a.indexado_inflacao,
                      overrides: (a.overrides ?? {}) as Record<string, number>,
                    })
                  : [];
                return (
                  <details key={a.id} className="group">
                    <summary className="px-6 py-3 flex items-center gap-4 hover:bg-slate-50/60 cursor-pointer list-none">
                      <ChevronDown size={14} className="text-slate-300 transition-transform group-open:rotate-180" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{a.nome}</p>
                        <p className="text-xs text-slate-500">
                          {assetTipos.find((t) => t.value === a.tipo)?.label ?? a.tipo} ·{' '}
                          {isFluxo ? 'receita anual' : 'patrimônio'} · idades {a.idade_inicio}–{a.idade_fim}
                        </p>
                      </div>
                      <p className="text-sm font-semibold tabular-nums text-slate-900">{brl(Number(a.valor))}</p>
                    </summary>
                    <div className="px-6 pb-5 pt-2 bg-slate-50/40 space-y-5">
                      <form action={updateAsset} className="grid sm:grid-cols-2 gap-3">
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="client_id" value={client_id} />
                        <Field label="Nome" name="nome" defaultValue={a.nome} className="sm:col-span-2" />
                        <AssetNatureFields
                          defaultTipo={a.tipo}
                          defaultNatureza={a.natureza}
                          defaultTaxaRetorno={a.taxa_retorno_aa}
                          defaultValorizacao={a.valorizacao_aa}
                          defaultCrescimento={a.crescimento_real_aa}
                          defaultRecorrencia={a.padrao_recorrencia}
                          defaultIntervalo={a.intervalo_anos}
                          tipoOptions={assetTipos.map((t) => ({ value: t.value, label: t.label }))}
                          natureByTipo={natureByTipo}
                        />
                        <FieldMoney label={isFluxo ? 'Valor anual (BRL)' : 'Valor (BRL)'} name="valor" defaultValue={a.valor} />
                        <AgeRangeFields defaultStart={a.idade_inicio} defaultEnd={a.idade_fim} />

                        <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                          <input type="checkbox" name="indexado_inflacao" defaultChecked={a.indexado_inflacao} className="rounded" />
                          Indexado à inflação
                        </label>
                        <div className="sm:col-span-2 flex justify-between items-center pt-2">
                          <SubmitButton formAction={deleteAsset} variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" successMessage="Ativo excluído">
                            <Trash2 size={13} />
                            Excluir
                          </SubmitButton>
                          <SubmitButton size="sm" successMessage="Ativo atualizado">Salvar alterações</SubmitButton>
                        </div>
                      </form>

                      {/* Gráfico editável: só para fluxos (receitas) */}
                      {isFluxo && points.length > 1 && (
                        <div className="rounded-lg border border-slate-200 bg-white p-4">
                          <EditableSeriesChart
                            entity="assets"
                            id={a.id}
                            client_id={client_id}
                            points={points}
                            color="#10b981"
                            label="Receita anual projetada"
                          />
                        </div>
                      )}
                    </div>
                  </details>
                );
              })}
            </ul>
          )}

          {/* add */}
          <details className="border-t border-slate-100">
            <summary className="px-6 py-4 flex items-center gap-3 hover:bg-slate-50/60 cursor-pointer text-sm font-medium text-brand-600 list-none">
              <Plus size={14} />
              Adicionar ativo ou receita
            </summary>
            <form action={addAsset} className="px-6 pb-5 pt-2 bg-slate-50/40 grid sm:grid-cols-2 gap-3">
              <input type="hidden" name="client_id" value={client_id} />
              <Field label="Nome" name="nome" placeholder="Ex: Apartamento centro" required className="sm:col-span-2" />
              <AssetNatureFields
                defaultTipo="financeiro_liquido"
                defaultNatureza="estoque"
                tipoOptions={assetTipos.map((t) => ({ value: t.value, label: t.label }))}
                natureByTipo={natureByTipo}
              />
              <FieldMoney label="Valor (BRL)" name="valor" required />
              <AgeRangeFields defaultStart={60} defaultEnd={client.expectativa_vida_anos} />
              <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                <input type="checkbox" name="indexado_inflacao" defaultChecked className="rounded" />
                Indexado à inflação
              </label>
              <div className="sm:col-span-2 flex justify-end">
                <SubmitButton size="sm" successMessage="Ativo adicionado"><Plus size={13} />Adicionar</SubmitButton>
              </div>
            </form>
          </details>
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
        <CardContent className="p-0">
          {(expenses ?? []).length > 0 && (
            <ul className="divide-y divide-slate-100">
              {(expenses ?? []).map((e) => {
                const points = buildEditablePoints({
                  valorBase: Number(e.valor_mensal) * 12,
                  idadeInicio: Number(e.idade_inicio),
                  idadeFim: Number(e.idade_fim),
                  padrao: e.padrao_recorrencia,
                  intervaloAnos: e.intervalo_anos,
                  crescimentoRealAa: e.crescimento_real_aa,
                  indexadoInflacao: e.indexado_inflacao,
                  overrides: (e.overrides ?? {}) as Record<string, number>,
                });
                return (
                  <details key={e.id} className="group">
                    <summary className="px-6 py-3 flex items-center gap-4 hover:bg-slate-50/60 cursor-pointer list-none">
                      <ChevronDown size={14} className="text-slate-300 transition-transform group-open:rotate-180" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{e.descricao}</p>
                        <p className="text-xs text-slate-500">
                          {e.categoria} · {e.idade_inicio}–{e.idade_fim}
                          {e.essencial && <span className="ml-1.5"><Badge variant="danger">essencial</Badge></span>}
                        </p>
                      </div>
                      <p className="text-sm font-semibold tabular-nums text-red-600">{brl(Number(e.valor_mensal))}/mês</p>
                    </summary>
                    <div className="px-6 pb-5 pt-2 bg-slate-50/40 space-y-5">
                      <form action={updateExpense} className="grid sm:grid-cols-2 gap-3">
                        <input type="hidden" name="id" value={e.id} />
                        <input type="hidden" name="client_id" value={client_id} />
                        <Field label="Descrição" name="descricao" defaultValue={e.descricao} className="sm:col-span-2" />
                        <FieldSelect label="Categoria" name="categoria" defaultValue={e.categoria} options={expenseCategorias.map((c) => ({ value: c, label: c }))} />
                        <FieldMoney label="Valor mensal (BRL)" name="valor_mensal" defaultValue={e.valor_mensal} />
                        <AgeRangeFields defaultStart={e.idade_inicio} defaultEnd={e.idade_fim} />
                        <ExpenseGrowthRecurrenceFields
                          defaultCrescimento={e.crescimento_real_aa}
                          defaultRecorrencia={e.padrao_recorrencia}
                          defaultIntervalo={e.intervalo_anos}
                        />
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input type="checkbox" name="indexado_inflacao" defaultChecked={e.indexado_inflacao} className="rounded" />
                          Indexado à inflação
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input type="checkbox" name="essencial" defaultChecked={e.essencial} className="rounded" />
                          Despesa essencial
                        </label>
                        <div className="sm:col-span-2 flex justify-between items-center pt-2">
                          <SubmitButton formAction={deleteExpense} variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" successMessage="Despesa excluída">
                            <Trash2 size={13} />
                            Excluir
                          </SubmitButton>
                          <SubmitButton size="sm" successMessage="Despesa atualizada">Salvar alterações</SubmitButton>
                        </div>
                      </form>

                      {points.length > 1 && (
                        <div className="rounded-lg border border-slate-200 bg-white p-4">
                          <EditableSeriesChart
                            entity="expenses"
                            id={e.id}
                            client_id={client_id}
                            points={points}
                            color="#ef4444"
                            label="Despesa anual projetada"
                          />
                        </div>
                      )}
                    </div>
                  </details>
                );
              })}
            </ul>
          )}

          <details className="border-t border-slate-100">
            <summary className="px-6 py-4 flex items-center gap-3 hover:bg-slate-50/60 cursor-pointer text-sm font-medium text-brand-600 list-none">
              <Plus size={14} />
              Adicionar despesa
            </summary>
            <form action={addExpense} className="px-6 pb-5 pt-2 bg-slate-50/40 grid sm:grid-cols-2 gap-3">
              <input type="hidden" name="client_id" value={client_id} />
              <Field label="Descrição" name="descricao" placeholder="Ex: Aluguel" required className="sm:col-span-2" />
              <FieldSelect label="Categoria" name="categoria" defaultValue="moradia" options={expenseCategorias.map((c) => ({ value: c, label: c }))} />
              <FieldMoney label="Valor mensal (BRL)" name="valor_mensal" required />
              <AgeRangeFields defaultStart={60} defaultEnd={client.expectativa_vida_anos} />
              <ExpenseGrowthRecurrenceFields />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="indexado_inflacao" defaultChecked className="rounded" />
                Indexado à inflação
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="essencial" className="rounded" />
                Essencial
              </label>
              <div className="sm:col-span-2 flex justify-end">
                <SubmitButton size="sm" successMessage="Despesa adicionada"><Plus size={13} />Adicionar</SubmitButton>
              </div>
            </form>
          </details>
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
        <CardContent className="p-0">
          {(events ?? []).length > 0 && (
            <ul className="divide-y divide-slate-100">
              {(events ?? []).map((ev) => (
                <details key={ev.id} className="group">
                  <summary className="px-6 py-3 flex items-center gap-4 hover:bg-slate-50/60 cursor-pointer list-none">
                    <ChevronDown size={14} className="text-slate-300 transition-transform group-open:rotate-180" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{ev.descricao}</p>
                      <p className="text-xs text-slate-500">
                        {ev.tipo} · idade {ev.idade_inicio}
                        {ev.padrao_recorrencia === 'recorrente_anual' && ` · todo ano até ${ev.idade_fim ?? '∞'}`}
                        {ev.padrao_recorrencia === 'recorrente_espacado' && ` · a cada ${ev.intervalo_anos} anos`}
                      </p>
                    </div>
                    <p className={`text-sm font-semibold tabular-nums ${Number(ev.valor) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {Number(ev.valor) >= 0 ? '+' : '−'} {brl(Math.abs(Number(ev.valor)))}
                    </p>
                  </summary>
                  <div className="px-6 pb-5 pt-2 bg-slate-50/40">
                    <form action={updateEvent} className="grid sm:grid-cols-2 gap-3">
                      <input type="hidden" name="id" value={ev.id} />
                      <input type="hidden" name="client_id" value={client_id} />
                      <Field label="Descrição" name="descricao" defaultValue={ev.descricao} className="sm:col-span-2" />
                      <FieldSelect label="Tipo" name="tipo" defaultValue={ev.tipo} options={eventTipos} />
                      <FieldMoney label="Valor (BRL, com sinal)" name="valor" defaultValue={ev.valor} hint="negativo = saída" allowNegative />
                      <AgeRangeFields defaultStart={ev.idade_inicio} defaultEnd={ev.idade_fim ?? ''} endLabel="Idade fim (opcional)" required={false} />
                      <RecorrenciaField
                        defaultRecorrencia={ev.padrao_recorrencia}
                        defaultIntervalo={ev.intervalo_anos}
                        options={[
                          { value: 'unico', label: 'Único' },
                          { value: 'recorrente_anual', label: 'Todo ano' },
                          { value: 'recorrente_espacado', label: 'A cada N anos' },
                        ]}
                      />
                      <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                        <input type="checkbox" name="indexado_inflacao" defaultChecked={ev.indexado_inflacao} className="rounded" />
                        Indexado à inflação
                      </label>
                      <div className="sm:col-span-2 flex justify-between items-center pt-2">
                        <SubmitButton formAction={deleteEvent} variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" successMessage="Evento excluído">
                          <Trash2 size={13} />
                          Excluir
                        </SubmitButton>
                        <SubmitButton size="sm" successMessage="Evento atualizado">Salvar alterações</SubmitButton>
                      </div>
                    </form>
                  </div>
                </details>
              ))}
            </ul>
          )}

          <details className="border-t border-slate-100">
            <summary className="px-6 py-4 flex items-center gap-3 hover:bg-slate-50/60 cursor-pointer text-sm font-medium text-brand-600 list-none">
              <Plus size={14} />
              Adicionar evento
            </summary>
            <form action={addEvent} className="px-6 pb-5 pt-2 bg-slate-50/40 grid sm:grid-cols-2 gap-3">
              <input type="hidden" name="client_id" value={client_id} />
              <Field label="Descrição" name="descricao" placeholder="Ex: Compra de imóvel" required className="sm:col-span-2" />
              <FieldSelect label="Tipo" name="tipo" defaultValue="sonho" options={eventTipos} />
              <FieldMoney label="Valor (BRL, com sinal)" name="valor" required hint="positivo = entrada; negativo = saída" allowNegative />
              <AgeRangeFields defaultStart={60} defaultEnd="" endLabel="Idade fim (opcional)" required={false} />
              <RecorrenciaField
                defaultRecorrencia="unico"
                options={[
                  { value: 'unico', label: 'Único' },
                  { value: 'recorrente_anual', label: 'Todo ano' },
                  { value: 'recorrente_espacado', label: 'A cada N anos' },
                ]}
              />
              <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                <input type="checkbox" name="indexado_inflacao" defaultChecked className="rounded" />
                Indexado à inflação
              </label>
              <div className="sm:col-span-2 flex justify-end">
                <SubmitButton size="sm" successMessage="Evento adicionado"><Plus size={13} />Adicionar</SubmitButton>
              </div>
            </form>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────── Field helpers ───────────

function Field({
  label, name, defaultValue, placeholder, required, className,
}: {
  label: string; name: string; defaultValue?: string; placeholder?: string; required?: boolean; className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} placeholder={placeholder} required={required} />
    </div>
  );
}

function FieldMoney({
  label, name, defaultValue, required, hint, allowNegative,
}: {
  label: string; name: string; defaultValue?: number | string; required?: boolean; hint?: string; allowNegative?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
        <Input
          id={name}
          name={name}
          type="number"
          step={allowNegative ? 1 : 0.01}
          defaultValue={defaultValue}
          required={required}
          className="pl-9 tabular-nums"
        />
      </div>
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

function FieldNum({
  label, name, defaultValue, required = true, allowNegative, hint,
}: {
  label: string; name: string; defaultValue?: number | string; required?: boolean; allowNegative?: boolean; hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <div className="relative">
        <Input
          id={name}
          name={name}
          type="number"
          step={allowNegative ? 1 : 0.01}
          defaultValue={defaultValue}
          required={required}
          className="pl-9 tabular-nums"
        />
      </div>
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

/** Campo percentual: armazenado como fração (0.11), exibido como número (11). */
function FieldPct({
  label, name, defaultValue, hint, allowNegative,
}: {
  label: string; name: string; defaultValue?: number | string | null; hint?: string; allowNegative?: boolean;
}) {
  const display =
    defaultValue === null || defaultValue === undefined || defaultValue === ''
      ? ''
      : (Number(defaultValue) * 100).toString();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <div className="relative">
        <Input
          id={name}
          name={name}
          type="number"
          step={allowNegative ? 0.1 : 0.1}
          defaultValue={display}
          placeholder="—"
          className="pr-8 tabular-nums"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
      </div>
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

function FieldSelect({
  label, name, defaultValue, options,
}: {
  label: string; name: string; defaultValue?: string; options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-brand-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
