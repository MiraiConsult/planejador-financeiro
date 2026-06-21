'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, PiggyBank, Save } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { registrarAcaoExcedente } from './actions';

interface Props {
  clientId: string;
  open: boolean;
  /** Primeira idade em que apareceu excedente positivo, para contexto. */
  idadeReferencia: number | null;
  /** Soma do consumo_excedente ao longo da simulação. */
  totalExcedente: number;
}

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function ExcedentePopup({ clientId, open, idadeReferencia, totalExcedente }: Props) {
  const [aberto, setAberto] = useState(open);
  const [acao, setAcao] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!acao.trim()) return;
    setSalvando(true);
    const res = await registrarAcaoExcedente({
      client_id: clientId,
      idade: null, // ação padrão; cliente pode adicionar específicas em Perfil
      acao: acao.trim(),
    });
    setSalvando(false);
    if (!res.ok) {
      toast.error(res.error ?? 'Erro ao salvar');
      return;
    }
    toast.success('Ação registrada');
    setAberto(false);
  }

  return (
    <Dialog open={aberto} onClose={() => setAberto(false)} size="sm" title={
      <span className="flex items-center gap-2">
        <PiggyBank size={18} className="text-emerald-600" />
        Teve excedente. O que você quer fazer?
      </span>
    }>
      <div className="space-y-4 p-1">
        <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2.5 text-xs">
          <p className="text-emerald-900">
            Na simulação aparece <strong>{brl(totalExcedente)}</strong> de excedente
            {idadeReferencia != null ? <> a partir dos <strong>{idadeReferencia} anos</strong></> : null}
            {' '}que não está sendo investido (saiu como consumo extra).
          </p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-700">Sua ação preferida</span>
          <textarea
            value={acao}
            onChange={(e) => setAcao(e.target.value)}
            placeholder="Ex.: Antecipar quitação do financiamento, aumentar aporte em renda fixa, reservar para viagem anual…"
            rows={3}
            maxLength={500}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            autoFocus
          />
          <span className="text-[10px] text-slate-400">{acao.length}/500</span>
        </label>

        <p className="text-[11px] text-slate-500 leading-relaxed">
          Se tu quiser editar essa informação, pode editar em{' '}
          <Link
            href={`/clients/${clientId}/perfil`}
            className="text-brand-700 font-semibold hover:underline"
          >
            Perfil do cliente &gt; Alocação do excedente
          </Link>
          .
        </p>

        <div className="flex justify-end gap-2 pt-1">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => setAberto(false)}
            disabled={salvando}
          >
            Depois
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="button"
            onClick={salvar}
            disabled={salvando || !acao.trim()}
          >
            {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Registrar ação
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
