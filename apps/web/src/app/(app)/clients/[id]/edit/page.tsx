import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Wallet, TrendingUp, Receipt, CalendarHeart, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
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
                {assets?.length ?? 0} cadastrados — patrimônio + fontes de renda
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* lista */}
          {(assets ?? []).length > 0 && (
            <ul className="divide-y divide-slate-100">
              {(assets ?? []).map((a) => (
                <details key={a.id} className="group">
                  <summary className="px-6 py-3 flex items-center gap-4 hover:bg-slate-50/60 cursor-pointer list-none">
                    <ChevronDown size={14} className="text-slate-300 transition-transform group-open:rotate-180" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{a.nome}</p>
                      <p className="text-xs text-slate-500">
                        {assetTipos.find((t) => t.value === a.tipo)?.label ?? a.tipo} ·{' '}
                        {a.natureza === 'fluxo' ? 'receita anual' : 'patrimônio'} ·{' '}
                        idades {a.idade_inicio}–{a.idade_fim}
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums text-slate-900">{brl(Number(a.valor))}</p>
                  </summary>
                  <div className="px-6 pb-5 pt-2 bg-slate-50/40">
                    <form action={updateAsset} className="grid sm:grid-cols-2 gap-3">
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="client_id" value={client_id} />
                      <Field label="Nome" name="nome" defaultValue={a.nome} className="sm:col-span-2" />
                      <FieldSelect label="Tipo" name="tipo" defaultValue={a.tipo} options={assetTipos.map((t) => ({ value: t.value, label: t.label }))} />
                      <FieldSelect label="Natureza" name="natureza" defaultValue={a.natureza} options={[{ value: 'estoque', label: 'Estoque (patrimônio)' }, { value: 'fluxo', label: 'Fluxo (receita anual)' }]} />
                      <FieldMoney label="Valor (BRL)" name="valor" defaultValue={a.valor} />
                      <FieldNum label="Idade início" name="idade_inicio" defaultValue={a.idade_inicio} />
                      <FieldNum label="Idade fim" name="idade_fim" defaultValue={a.idade_fim} />
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" name="indexado_inflacao" defaultChecked={a.indexado_inflacao} className="rounded" />
                        Indexado à inflação
                      </label>
                      <div className="sm:col-span-2 flex justify-between items-center pt-2">
                        <DeleteForm action={deleteAsset} id={a.id} client_id={client_id} />
                        <Button type="submit" size="sm">Salvar alterações</Button>
                      </div>
                    </form>
                  </div>
                </details>
              ))}
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
              <FieldSelect label="Tipo" name="tipo" defaultValue="financeiro_liquido" options={assetTipos.map((t) => ({ value: t.value, label: t.label }))} />
              <FieldSelect label="Natureza" name="natureza" defaultValue="estoque" options={[{ value: 'estoque', label: 'Estoque (patrimônio)' }, { value: 'fluxo', label: 'Fluxo (receita anual)' }]} />
              <FieldMoney label="Valor (BRL)" name="valor" required />
              <FieldNum label="Idade início" name="idade_inicio" defaultValue={60} required />
              <FieldNum label="Idade fim" name="idade_fim" defaultValue={client.expectativa_vida_anos} required />
              <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                <input type="checkbox" name="indexado_inflacao" defaultChecked className="rounded" />
                Indexado à inflação
              </label>
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" size="sm"><Plus size={13} />Adicionar</Button>
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
              <CardDescription>{expenses?.length ?? 0} cadastradas</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {(expenses ?? []).length > 0 && (
            <ul className="divide-y divide-slate-100">
              {(expenses ?? []).map((e) => (
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
                  <div className="px-6 pb-5 pt-2 bg-slate-50/40">
                    <form action={updateExpense} className="grid sm:grid-cols-2 gap-3">
                      <input type="hidden" name="id" value={e.id} />
                      <input type="hidden" name="client_id" value={client_id} />
                      <Field label="Descrição" name="descricao" defaultValue={e.descricao} className="sm:col-span-2" />
                      <FieldSelect label="Categoria" name="categoria" defaultValue={e.categoria} options={expenseCategorias.map((c) => ({ value: c, label: c }))} />
                      <FieldMoney label="Valor mensal (BRL)" name="valor_mensal" defaultValue={e.valor_mensal} />
                      <FieldNum label="Idade início" name="idade_inicio" defaultValue={e.idade_inicio} />
                      <FieldNum label="Idade fim" name="idade_fim" defaultValue={e.idade_fim} />
                      <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                        <input type="checkbox" name="essencial" defaultChecked={e.essencial} className="rounded" />
                        Despesa essencial (não pode ser cortada)
                      </label>
                      <div className="sm:col-span-2 flex justify-between items-center pt-2">
                        <DeleteForm action={deleteExpense} id={e.id} client_id={client_id} />
                        <Button type="submit" size="sm">Salvar alterações</Button>
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
              Adicionar despesa
            </summary>
            <form action={addExpense} className="px-6 pb-5 pt-2 bg-slate-50/40 grid sm:grid-cols-2 gap-3">
              <input type="hidden" name="client_id" value={client_id} />
              <Field label="Descrição" name="descricao" placeholder="Ex: Aluguel" required className="sm:col-span-2" />
              <FieldSelect label="Categoria" name="categoria" defaultValue="moradia" options={expenseCategorias.map((c) => ({ value: c, label: c }))} />
              <FieldMoney label="Valor mensal (BRL)" name="valor_mensal" required />
              <FieldNum label="Idade início" name="idade_inicio" defaultValue={60} required />
              <FieldNum label="Idade fim" name="idade_fim" defaultValue={client.expectativa_vida_anos} required />
              <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                <input type="checkbox" name="essencial" className="rounded" />
                Essencial
              </label>
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" size="sm"><Plus size={13} />Adicionar</Button>
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
              <CardDescription>{events?.length ?? 0} cadastrados</CardDescription>
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
                        {ev.padrao_recorrencia === 'recorrente_anual' && ' · todo ano'}
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
                      <FieldSelect label="Recorrência" name="padrao_recorrencia" defaultValue={ev.padrao_recorrencia} options={[
                        { value: 'unico', label: 'Único' },
                        { value: 'recorrente_anual', label: 'Todo ano' },
                        { value: 'recorrente_espacado', label: 'A cada N anos' },
                      ]} />
                      <FieldMoney label="Valor (BRL, com sinal)" name="valor" defaultValue={ev.valor} hint="negativo = saída" allowNegative />
                      <FieldNum label="Idade início" name="idade_inicio" defaultValue={ev.idade_inicio} />
                      <FieldNum label="Idade fim" name="idade_fim" defaultValue={ev.idade_fim ?? ''} />
                      <FieldNum label="Intervalo (se espaçado)" name="intervalo_anos" defaultValue={ev.intervalo_anos ?? ''} />
                      <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                        <input type="checkbox" name="indexado_inflacao" defaultChecked={ev.indexado_inflacao} className="rounded" />
                        Indexado à inflação
                      </label>
                      <div className="sm:col-span-2 flex justify-between items-center pt-2">
                        <DeleteForm action={deleteEvent} id={ev.id} client_id={client_id} />
                        <Button type="submit" size="sm">Salvar alterações</Button>
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
              <Field label="Descrição" name="descricao" placeholder="Ex: Casamento da filha" required className="sm:col-span-2" />
              <FieldSelect label="Tipo" name="tipo" defaultValue="sonho" options={eventTipos} />
              <FieldSelect label="Recorrência" name="padrao_recorrencia" defaultValue="unico" options={[
                { value: 'unico', label: 'Único' },
                { value: 'recorrente_anual', label: 'Todo ano' },
                { value: 'recorrente_espacado', label: 'A cada N anos' },
              ]} />
              <FieldMoney label="Valor (com sinal)" name="valor" required hint="negativo = saída, positivo = entrada" allowNegative />
              <FieldNum label="Idade início" name="idade_inicio" defaultValue={60} required />
              <FieldNum label="Idade fim" name="idade_fim" />
              <FieldNum label="Intervalo (se espaçado)" name="intervalo_anos" />
              <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                <input type="checkbox" name="indexado_inflacao" defaultChecked className="rounded" />
                Indexado à inflação
              </label>
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" size="sm"><Plus size={13} />Adicionar</Button>
              </div>
            </form>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, name, defaultValue, placeholder, required, className }: { label: string; name: string; defaultValue?: string; placeholder?: string; required?: boolean; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} placeholder={placeholder} required={required} />
    </div>
  );
}

function FieldNum({ label, name, defaultValue, required }: { label: string; name: string; defaultValue?: number | string; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type="number" defaultValue={defaultValue} required={required} className="tabular-nums" />
    </div>
  );
}

function FieldMoney({
  label,
  name,
  defaultValue,
  required,
  hint,
  allowNegative,
}: {
  label: string;
  name: string;
  defaultValue?: number | string;
  required?: boolean;
  hint?: string;
  allowNegative?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">R$</span>
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

function FieldSelect({ label, name, defaultValue, options }: { label: string; name: string; defaultValue?: string; options: { value: string; label: string }[] }) {
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

function DeleteForm({ action, id, client_id }: { action: (fd: FormData) => Promise<void>; id: string; client_id: string }) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="client_id" value={client_id} />
      <Button type="submit" variant="ghost" size="sm" className="text-red-600 hover:bg-red-50">
        <Trash2 size={13} />
        Excluir
      </Button>
    </form>
  );
}
