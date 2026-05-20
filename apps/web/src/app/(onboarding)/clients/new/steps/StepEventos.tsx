'use client';

import { useState } from 'react';
import { Sparkles, ShoppingCart, Plane, Gift, AlertCircle, Plus, CalendarHeart, Trash2 } from 'lucide-react';
import { Input, Label } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { StepShell, EmptyState } from '../StepShell';
import type { WizardState } from '../Wizard';
import type { DraftEvent } from '../types';

interface Props {
  state: WizardState;
  update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
}

const tipos: {
  tipo: DraftEvent['tipo'];
  label: string;
  icon: typeof Sparkles;
  cor: string;
  defaultSinal: -1 | 1;
}[] = [
  { tipo: 'sonho', label: 'Sonho / objetivo', icon: Sparkles, cor: 'bg-brand-50 text-brand-600 ring-brand-100', defaultSinal: -1 },
  { tipo: 'compra', label: 'Compra grande', icon: ShoppingCart, cor: 'bg-amber-50 text-amber-600 ring-amber-100', defaultSinal: -1 },
  { tipo: 'viagem_pontual', label: 'Viagem específica', icon: Plane, cor: 'bg-emerald-50 text-emerald-600 ring-emerald-100', defaultSinal: -1 },
  { tipo: 'heranca', label: 'Herança a receber', icon: Gift, cor: 'bg-rose-50 text-rose-600 ring-rose-100', defaultSinal: 1 },
  { tipo: 'imprevisto', label: 'Reserva imprevisto', icon: AlertCircle, cor: 'bg-slate-100 text-slate-600 ring-slate-200', defaultSinal: -1 },
];

function brl(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '+';
  return `${sign} ${abs.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}`;
}

export function StepEventos({ state, update }: Props) {
  const [tipo, setTipo] = useState<DraftEvent['tipo']>('sonho');
  const [desc, setDesc] = useState('');
  const [valor, setValor] = useState('');
  const [idade, setIdade] = useState<string>('');
  const [recorrencia, setRecorrencia] = useState<DraftEvent['padrao_recorrencia']>('unico');
  const [intervalo, setIntervalo] = useState('');

  function add() {
    const v = Number(valor.replace(/\./g, '').replace(',', '.'));
    const i = Number(idade);
    if (!desc.trim() || !Number.isFinite(v) || v <= 0 || !Number.isFinite(i)) return;
    const meta = tipos.find((t) => t.tipo === tipo)!;
    const ev: DraftEvent = {
      id: crypto.randomUUID(),
      tipo,
      descricao: desc.trim(),
      valor: v * meta.defaultSinal,
      padrao_recorrencia: recorrencia,
      idade_inicio: i,
      idade_fim: recorrencia === 'unico' ? null : state.expectativa_vida_anos,
      intervalo_anos: recorrencia === 'recorrente_espacado' ? Number(intervalo) || null : null,
      indexado_inflacao: true,
    };
    update('events', [...state.events, ev]);
    setDesc('');
    setValor('');
    setIdade('');
    setIntervalo('');
  }

  function remove(id: string) {
    update('events', state.events.filter((e) => e.id !== id));
  }

  return (
    <StepShell
      eyebrow="Passo 5"
      title="Sonhos e gastos pontuais"
      description="Eventos que acontecem em uma idade específica ou se repetem espaçados (carro a cada 5 anos, viagem a cada 2 anos). Heranças a receber também entram aqui (com sinal positivo)."
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft space-y-4">
          <div>
            <Label>Tipo de evento</Label>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-5 gap-2">
              {tipos.map(({ tipo: t, label, icon: Icon, cor }) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={`p-3 rounded-xl border-2 transition-all text-left flex flex-col gap-2 ${
                    tipo === t
                      ? 'border-brand-500 bg-brand-50/40 shadow-glow'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ring-1 ring-inset ${cor}`}>
                    <Icon size={14} />
                  </div>
                  <span className="text-xs font-semibold text-slate-800 leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ev_desc">Descrição</Label>
              <Input
                id="ev_desc"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Ex: Casamento da filha"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev_valor">Valor (BRL)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">R$</span>
                <Input
                  id="ev_valor"
                  inputMode="decimal"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="50.000"
                  className="pl-9 tabular-nums"
                />
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="ev_idade">Idade do evento</Label>
              <div className="relative">
                <Input
                  id="ev_idade"
                  type="number"
                  value={idade}
                  onChange={(e) => setIdade(e.target.value)}
                  placeholder="65"
                  className="pr-12 tabular-nums"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                  anos
                </span>
              </div>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Frequência</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['unico', 'recorrente_anual', 'recorrente_espacado'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRecorrencia(r)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      recorrencia === r
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {r === 'unico' && 'Único'}
                    {r === 'recorrente_anual' && 'Todo ano'}
                    {r === 'recorrente_espacado' && 'A cada N anos'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {recorrencia === 'recorrente_espacado' && (
            <div className="space-y-1.5 max-w-xs animate-fade-up">
              <Label htmlFor="ev_intervalo">A cada quantos anos?</Label>
              <Input
                id="ev_intervalo"
                type="number"
                min={1}
                value={intervalo}
                onChange={(e) => setIntervalo(e.target.value)}
                placeholder="5"
                className="tabular-nums"
              />
            </div>
          )}

          <Button type="button" onClick={add} disabled={!desc.trim() || !valor || !idade} size="md">
            <Plus size={14} />
            Adicionar evento
          </Button>
        </div>

        {state.events.length === 0 ? (
          <EmptyState
            icon={CalendarHeart}
            title="Sem eventos específicos?"
            description="Tudo bem — esta etapa é opcional. Você pode pular se o cliente não tem sonhos pontuais ou heranças previstas."
          />
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-soft overflow-hidden">
            <ul className="divide-y divide-slate-100">
              {state.events.map((e) => {
                const meta = tipos.find((t) => t.tipo === e.tipo)!;
                const Icon = meta.icon;
                return (
                  <li key={e.id} className="px-5 py-3 flex items-center gap-4 hover:bg-slate-50/60">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center ring-1 ring-inset shrink-0 ${meta.cor}`}>
                      <Icon size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{e.descricao}</p>
                      <p className="text-xs text-slate-500">
                        {meta.label} · idade {e.idade_inicio}
                        {e.padrao_recorrencia === 'recorrente_anual' && ' · todo ano até morte'}
                        {e.padrao_recorrencia === 'recorrente_espacado' && ` · a cada ${e.intervalo_anos} anos`}
                      </p>
                    </div>
                    <p className={`text-sm font-semibold tabular-nums ${e.valor >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {brl(e.valor)}
                    </p>
                    <button
                      type="button"
                      onClick={() => remove(e.id)}
                      className="h-7 w-7 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center"
                    >
                      <Trash2 size={13} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </StepShell>
  );
}
