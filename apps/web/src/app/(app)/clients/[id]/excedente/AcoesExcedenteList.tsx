'use client';

import { useState, useTransition } from 'react';
import { Loader2, PiggyBank, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { registrarAcaoExcedente, removerAcaoExcedente } from './actions';

interface Acao {
  id: string;
  idade: number | null;
  acao: string;
}

interface Props {
  clientId: string;
  acoes: Acao[];
}

export function AcoesExcedenteList({ clientId, acoes }: Props) {
  const [pending, start] = useTransition();
  const [nova, setNova] = useState('');
  const [idade, setIdade] = useState<number | ''>('');

  function adicionar() {
    if (!nova.trim()) return;
    start(async () => {
      const res = await registrarAcaoExcedente({
        client_id: clientId,
        idade: typeof idade === 'number' ? idade : null,
        acao: nova.trim(),
      });
      if (!res.ok) {
        toast.error(res.error ?? 'Erro ao salvar');
        return;
      }
      toast.success('Ação adicionada');
      setNova('');
      setIdade('');
    });
  }

  function remover(id: string) {
    start(async () => {
      const res = await removerAcaoExcedente({ client_id: clientId, id });
      if (!res.ok) toast.error(res.error ?? 'Erro ao remover');
      else toast.success('Removida');
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
      <div className="flex items-start gap-3">
        <PiggyBank size={20} className="text-emerald-600 mt-0.5" />
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
            Ações sobre excedentes
          </h2>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Quando a simulação detecta excedente não investido, o popup do balanço pergunta o
            que fazer. As respostas ficam registradas aqui. Você pode adicionar manualmente.
          </p>
        </div>
      </div>

      {acoes.length === 0 ? (
        <p className="text-xs text-slate-400 italic">Nenhuma ação registrada ainda.</p>
      ) : (
        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
          {acoes.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm text-slate-700">{a.acao}</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">
                  {a.idade == null ? 'padrão (todas as idades)' : `idade ${a.idade}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remover(a.id)}
                disabled={pending}
                className="text-slate-400 hover:text-red-600 disabled:opacity-30"
                title="Remover"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-[80px_1fr_auto] gap-2 items-end pt-2 border-t border-slate-100">
        <label className="block space-y-1">
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
            Idade
          </span>
          <input
            type="number"
            min={1}
            max={120}
            value={idade}
            onChange={(e) => setIdade(e.target.value ? parseInt(e.target.value) : '')}
            placeholder="—"
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
            Nova ação
          </span>
          <input
            type="text"
            value={nova}
            onChange={(e) => setNova(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && adicionar()}
            placeholder="Ex.: aportar em renda fixa, antecipar dívida…"
            maxLength={500}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          />
        </label>
        <Button
          variant="primary"
          size="sm"
          onClick={adicionar}
          disabled={pending || !nova.trim()}
          type="button"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Adicionar
        </Button>
      </div>
    </section>
  );
}
