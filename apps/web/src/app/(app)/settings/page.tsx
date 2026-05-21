import { Sliders, Percent, TrendingUp, Building2, Landmark, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Input, Label } from '@/components/ui/Input';
import { upsertConsultantAssumptions } from './actions';

const defaults = {
  inflacao_anual_br: 0.04,
  retorno_conservador: 0.08,
  volatilidade_conservador: 0.04,
  retorno_moderado: 0.1,
  volatilidade_moderado: 0.08,
  retorno_arrojado: 0.13,
  volatilidade_arrojado: 0.15,
  valorizacao_imovel_uso: 0,
  taxa_desconto_npv: 0.06,
  imposto_renda_efetivo: 0.15,
  custo_credito_aa: 0.15,
};

function pct(n: number) {
  return (n * 100).toFixed(2).replace(/\.?0+$/, '') || '0';
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: assumption } = await supabase
    .from('assumptions')
    .select('*')
    .eq('consultant_id', user!.id)
    .is('client_id', null)
    .maybeSingle();

  const v = (key: keyof typeof defaults) => pct(assumption?.[key] ?? defaults[key]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <PageHeader
        eyebrow="Configuração"
        title="Premissas globais"
        description="Estes valores são o ponto de partida para todo cliente novo. Cada cliente pode sobrescrevê-los."
      />

      <form action={upsertConsultantAssumptions} className="space-y-6">
        {/* Macroeconomia */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center ring-1 ring-inset ring-brand-100">
                <Percent size={16} />
              </div>
              <div>
                <CardTitle>Macroeconomia</CardTitle>
                <CardDescription>Taxa de desconto usada nos cálculos (sistema opera em valores nominais)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-5">
            <FieldPct name="taxa_desconto_npv" label="Taxa de desconto (NPV)" value={v('taxa_desconto_npv')} hint="para valor presente dos fluxos futuros" />
          </CardContent>
        </Card>

        {/* Carteiras */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center ring-1 ring-inset ring-emerald-100">
                <TrendingUp size={16} />
              </div>
              <div>
                <CardTitle>Retorno por perfil de carteira</CardTitle>
                <CardDescription>
                  Retornos esperados e volatilidades. Cenários otimista/pessimista usam retorno ± volatilidade.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <ProfileRow
              title="Conservador"
              retornoName="retorno_conservador"
              retornoValue={v('retorno_conservador')}
              volName="volatilidade_conservador"
              volValue={v('volatilidade_conservador')}
              color="slate"
            />
            <ProfileRow
              title="Moderado"
              retornoName="retorno_moderado"
              retornoValue={v('retorno_moderado')}
              volName="volatilidade_moderado"
              volValue={v('volatilidade_moderado')}
              color="brand"
            />
            <ProfileRow
              title="Arrojado"
              retornoName="retorno_arrojado"
              retornoValue={v('retorno_arrojado')}
              volName="volatilidade_arrojado"
              volValue={v('volatilidade_arrojado')}
              color="amber"
            />
          </CardContent>
        </Card>

        {/* Imóveis e impostos */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center ring-1 ring-inset ring-amber-100">
                <Building2 size={16} />
              </div>
              <div>
                <CardTitle>Imóveis e impostos</CardTitle>
                <CardDescription>Valorização padrão e tributação</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-5">
            <FieldPct
              name="valorizacao_imovel_uso"
              label="Valorização anual de imóvel de uso"
              value={v('valorizacao_imovel_uso')}
              hint="aplicada se o ativo não define a própria"
            />
            <FieldPct
              name="imposto_renda_efetivo"
              label="IR efetivo sobre rendimentos"
              value={v('imposto_renda_efetivo')}
              hint="alíquota média líquida"
            />
          </CardContent>
        </Card>

        {/* Crédito */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center ring-1 ring-inset ring-red-100">
                <Landmark size={16} />
              </div>
              <div>
                <CardTitle>Crédito</CardTitle>
                <CardDescription>
                  Quando o cliente esgota patrimônio e contrata empréstimo
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <FieldPct
              name="custo_credito_aa"
              label="Custo de crédito anual"
              value={v('custo_credito_aa')}
              hint="taxa de juros sobre dívida — incide a cada ano sobre o saldo devedor"
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3 sticky bottom-4 z-10">
          <p className="text-xs text-slate-500">
            <Sliders size={11} className="inline -mt-0.5 mr-1" />
            Valores em percentagem (ex: 4 = 4% ao ano)
          </p>
          <SubmitButton size="lg" className="shadow-lg" successMessage="Premissas salvas">
            <Save size={15} />
            Salvar premissas
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}

function FieldPct({ name, label, value, hint }: { name: string; label: string; value: string; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <div className="relative">
        <Input id={name} name={name} type="number" step="0.01" defaultValue={value} className="pr-10 tabular-nums" />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
          %
        </span>
      </div>
      {hint && <p className="text-[11px] text-slate-500 leading-relaxed">{hint}</p>}
    </div>
  );
}

function ProfileRow({
  title,
  retornoName,
  retornoValue,
  volName,
  volValue,
  color,
}: {
  title: string;
  retornoName: string;
  retornoValue: string;
  volName: string;
  volValue: string;
  color: 'slate' | 'brand' | 'amber';
}) {
  const colorMap: Record<typeof color, string> = {
    slate: 'bg-slate-100 text-slate-700',
    brand: 'bg-brand-50 text-brand-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span
          className={`text-xs font-semibold uppercase tracking-widest px-2 py-0.5 rounded-md ${colorMap[color]}`}
        >
          {title}
        </span>
        <span className="text-[10px] text-slate-400">
          retorno ± volatilidade
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FieldPct name={retornoName} label="Retorno esperado" value={retornoValue} />
        <FieldPct name={volName} label="Volatilidade" value={volValue} />
      </div>
    </div>
  );
}
