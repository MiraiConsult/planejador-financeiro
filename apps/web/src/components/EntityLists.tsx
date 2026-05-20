import {
  Banknote,
  Home,
  Car,
  Trees,
  Gift,
  Building2,
  Briefcase,
  Building,
  TrendingUp,
  UtensilsCrossed,
  Heart,
  Gamepad2,
  Sparkles,
  Baby,
  GraduationCap,
  Plane,
  HandHeart,
  ShoppingCart,
  AlertCircle,
  CalendarHeart,
  Receipt,
  Wallet,
} from 'lucide-react';
import type { Asset, Expense, FinancialEvent } from '@planejador/engine';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Badge } from './ui/Badge';

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const assetIcons: Record<string, { icon: typeof Banknote; color: string; label: string }> = {
  financeiro_liquido: { icon: Banknote, color: 'bg-emerald-50 text-emerald-600 ring-emerald-100', label: 'Aplicação financeira' },
  imovel: { icon: Home, color: 'bg-blue-50 text-blue-600 ring-blue-100', label: 'Imóvel' },
  terreno: { icon: Trees, color: 'bg-amber-50 text-amber-600 ring-amber-100', label: 'Terreno' },
  carro: { icon: Car, color: 'bg-slate-100 text-slate-600 ring-slate-200', label: 'Veículo' },
  heranca_recebida: { icon: Gift, color: 'bg-rose-50 text-rose-600 ring-rose-100', label: 'Herança' },
  salario: { icon: Briefcase, color: 'bg-brand-50 text-brand-600 ring-brand-100', label: 'Salário' },
  aluguel: { icon: Building, color: 'bg-emerald-50 text-emerald-600 ring-emerald-100', label: 'Aluguel/arrendamento' },
  outro: { icon: Building2, color: 'bg-slate-100 text-slate-600 ring-slate-200', label: 'Outro' },
};

const expenseIcons: Record<string, { icon: typeof Home; label: string }> = {
  moradia: { icon: Home, label: 'Moradia' },
  alimentacao: { icon: UtensilsCrossed, label: 'Alimentação' },
  transporte: { icon: Car, label: 'Transporte' },
  saude: { icon: Heart, label: 'Saúde' },
  lazer: { icon: Gamepad2, label: 'Lazer' },
  servicos_dom: { icon: Sparkles, label: 'Serviços domésticos' },
  filhos: { icon: Baby, label: 'Filhos' },
  estudos: { icon: GraduationCap, label: 'Estudos' },
  viagens: { icon: Plane, label: 'Viagens' },
  cuidado_familia: { icon: HandHeart, label: 'Cuidado familiar' },
  outro: { icon: Receipt, label: 'Outro' },
};

const eventIcons: Record<string, { icon: typeof Sparkles; color: string; label: string }> = {
  sonho: { icon: Sparkles, color: 'bg-brand-50 text-brand-600 ring-brand-100', label: 'Sonho' },
  compra: { icon: ShoppingCart, color: 'bg-amber-50 text-amber-600 ring-amber-100', label: 'Compra' },
  viagem_pontual: { icon: Plane, color: 'bg-emerald-50 text-emerald-600 ring-emerald-100', label: 'Viagem' },
  heranca: { icon: Gift, color: 'bg-rose-50 text-rose-600 ring-rose-100', label: 'Herança' },
  venda_ativo: { icon: TrendingUp, color: 'bg-sky-50 text-sky-600 ring-sky-100', label: 'Venda de ativo' },
  imprevisto: { icon: AlertCircle, color: 'bg-slate-100 text-slate-600 ring-slate-200', label: 'Imprevisto' },
};

interface Props {
  assets: Asset[];
  expenses: Expense[];
  events: FinancialEvent[];
}

export function EntityLists({ assets, expenses, events }: Props) {
  const estoque = assets.filter((a) => a.natureza === 'estoque');
  const fluxo = assets.filter((a) => a.natureza === 'fluxo');

  const patrimonioFinanceiro = estoque
    .filter((a) => a.tipo === 'financeiro_liquido')
    .reduce((acc, a) => acc + a.valor, 0);
  const patrimonioIliquido = estoque
    .filter((a) => a.tipo !== 'financeiro_liquido')
    .reduce((acc, a) => acc + a.valor, 0);
  const receitasAnuais = fluxo.reduce((acc, a) => acc + a.valor, 0);
  const despesasMensais = expenses.reduce((acc, e) => acc + e.valor_mensal, 0);

  return (
    <section className="grid lg:grid-cols-2 gap-4">
      {/* PATRIMÔNIO */}
      <Card className="lg:col-span-2">
        <CardHeader className="border-b border-slate-100/70">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center ring-1 ring-inset ring-brand-100">
                <Wallet size={16} />
              </div>
              <div>
                <CardTitle>Patrimônio</CardTitle>
                <CardDescription>
                  {estoque.length} {estoque.length === 1 ? 'ativo' : 'ativos'} cadastrados
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-4 text-right">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400">Financeiro</p>
                <p className="text-sm font-bold tabular-nums text-emerald-700">{brl(patrimonioFinanceiro)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400">Ilíquido</p>
                <p className="text-sm font-bold tabular-nums text-slate-900">{brl(patrimonioIliquido)}</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {estoque.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-slate-500">Nenhum ativo cadastrado.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {estoque.map((a) => {
                const meta = assetIcons[a.tipo] ?? assetIcons.outro!;
                const Icon = meta.icon;
                return (
                  <li
                    key={a.id}
                    className="px-6 py-3 flex items-center gap-4 hover:bg-slate-50/60 transition-colors"
                  >
                    <div
                      className={`h-9 w-9 rounded-lg flex items-center justify-center ring-1 ring-inset shrink-0 ${meta.color}`}
                    >
                      <Icon size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{a.nome}</p>
                      <p className="text-xs text-slate-500">
                        {meta.label} · idades {a.idade_inicio}–{a.idade_fim}
                        {a.indexado_inflacao && ' · indexado'}
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums text-slate-900">{brl(a.valor)}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* RECEITAS (assets de fluxo) */}
      <Card>
        <CardHeader className="border-b border-slate-100/70">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center ring-1 ring-inset ring-emerald-100">
                <TrendingUp size={16} />
              </div>
              <div>
                <CardTitle>Receitas anuais</CardTitle>
                <CardDescription>
                  {fluxo.length} {fluxo.length === 1 ? 'fonte de renda' : 'fontes de renda'}
                </CardDescription>
              </div>
            </div>
            <Badge variant="success">{brl(receitasAnuais)}/ano</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {fluxo.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-slate-500">Nenhuma receita recorrente.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {fluxo.map((a) => {
                const meta = assetIcons[a.tipo] ?? assetIcons.outro!;
                const Icon = meta.icon;
                return (
                  <li key={a.id} className="px-6 py-3 flex items-center gap-4 hover:bg-slate-50/60">
                    <div
                      className={`h-9 w-9 rounded-lg flex items-center justify-center ring-1 ring-inset shrink-0 ${meta.color}`}
                    >
                      <Icon size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{a.nome}</p>
                      <p className="text-xs text-slate-500">
                        {meta.label} · {a.idade_inicio}–{a.idade_fim}
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums text-emerald-600">
                      {brl(a.valor)}/ano
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* DESPESAS */}
      <Card>
        <CardHeader className="border-b border-slate-100/70">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center ring-1 ring-inset ring-rose-100">
                <Receipt size={16} />
              </div>
              <div>
                <CardTitle>Despesas mensais</CardTitle>
                <CardDescription>
                  {expenses.length} {expenses.length === 1 ? 'despesa' : 'despesas'} recorrentes
                </CardDescription>
              </div>
            </div>
            <Badge variant="danger">{brl(despesasMensais)}/mês</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {expenses.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-slate-500">Nenhuma despesa cadastrada.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {expenses.map((e) => {
                const meta = expenseIcons[e.categoria] ?? expenseIcons.outro!;
                const Icon = meta.icon;
                return (
                  <li key={e.id} className="px-6 py-3 flex items-center gap-4 hover:bg-slate-50/60">
                    <div
                      className={`h-9 w-9 rounded-lg flex items-center justify-center ring-1 ring-inset shrink-0 ${
                        e.essencial
                          ? 'bg-rose-50 text-rose-600 ring-rose-100'
                          : 'bg-slate-100 text-slate-600 ring-slate-200'
                      }`}
                    >
                      <Icon size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{e.descricao}</p>
                      <p className="text-xs text-slate-500">
                        {meta.label} · {e.idade_inicio}–{e.idade_fim}
                        {e.essencial && <span className="ml-1.5 text-rose-500">· essencial</span>}
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums text-red-600">
                      {brl(e.valor_mensal)}/mês
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* EVENTOS */}
      <Card className="lg:col-span-2">
        <CardHeader className="border-b border-slate-100/70">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center ring-1 ring-inset ring-amber-100">
                <CalendarHeart size={16} />
              </div>
              <div>
                <CardTitle>Eventos pontuais</CardTitle>
                <CardDescription>
                  {events.length} {events.length === 1 ? 'evento' : 'eventos'} programados (compras, viagens, herança)
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {events.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-slate-500">
              Nenhum evento cadastrado.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {events.map((ev) => {
                const meta = eventIcons[ev.tipo] ?? eventIcons.imprevisto!;
                const Icon = meta.icon;
                return (
                  <li key={ev.id} className="px-6 py-3 flex items-center gap-4 hover:bg-slate-50/60">
                    <div
                      className={`h-9 w-9 rounded-lg flex items-center justify-center ring-1 ring-inset shrink-0 ${meta.color}`}
                    >
                      <Icon size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{ev.descricao}</p>
                      <p className="text-xs text-slate-500">
                        {meta.label} · idade {ev.idade_inicio}
                        {ev.padrao_recorrencia === 'recorrente_anual' && ' · todo ano'}
                        {ev.padrao_recorrencia === 'recorrente_espacado' && ` · a cada ${ev.intervalo_anos} anos`}
                        {ev.indexado_inflacao && ' · indexado'}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-semibold tabular-nums ${
                        ev.valor >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {ev.valor >= 0 ? '+' : '−'} {brl(Math.abs(ev.valor))}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
