'use client';

import { useMemo, useState, useTransition } from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { brl, fmtData } from '@/lib/controle-mensal/format';
import { marcarConciliado, marcarConciliadoEmMassa } from './actions';

export interface LancConc {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  origem: string | null;
  competencia: number | null;
  eh_receita: boolean | null;
  conciliado: boolean;
}

const MESES = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const labelComp = (c: number) => `${MESES[c % 100]} ${Math.floor(c / 100)}`;

export function ConciliacaoManager({
  clientId,
  rows,
  bancos,
}: {
  clientId: string;
  rows: LancConc[];
  bancos: string[];
}) {
  const [banco, setBanco] = useState(bancos[0] ?? '');
  const [comp, setComp] = useState<number | ''>('');
  const [saldoExtrato, setSaldoExtrato] = useState('');
  const [pending, start] = useTransition();
  // Estado local otimista de conciliação (id -> bool)
  const [localConc, setLocalConc] = useState<Record<string, boolean>>({});

  const estaConc = (l: LancConc) => localConc[l.id] ?? l.conciliado;

  // Competências disponíveis para o banco escolhido
  const compsDoBanco = useMemo(() => {
    const set = new Set<number>();
    for (const r of rows) {
      if ((r.origem ?? '').trim() === banco && r.competencia) set.add(r.competencia);
    }
    return [...set].sort((a, b) => b - a);
  }, [rows, banco]);

  const filtrados = useMemo(() => {
    return rows
      .filter((r) => (r.origem ?? '').trim() === banco)
      .filter((r) => comp === '' || r.competencia === comp)
      .sort((a, b) => (a.data < b.data ? 1 : -1));
  }, [rows, banco, comp]);

  const resumo = useMemo(() => {
    let entradas = 0, saidas = 0, concV = 0, concN = 0;
    for (const l of filtrados) {
      if (l.valor > 0) entradas += l.valor;
      else saidas += Math.abs(l.valor);
      if (estaConc(l)) {
        concN++;
        concV += l.valor;
      }
    }
    const movimento = entradas - saidas;
    return { entradas, saidas, movimento, concV, concN, total: filtrados.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtrados, localConc]);

  const saldoInformado = saldoExtrato ? parseFloat(saldoExtrato.replace(',', '.')) : null;
  const diferenca = saldoInformado != null ? saldoInformado - resumo.movimento : null;

  function toggle(l: LancConc) {
    const novo = !estaConc(l);
    setLocalConc((s) => ({ ...s, [l.id]: novo }));
    start(async () => {
      const res = await marcarConciliado({ client_id: clientId, id: l.id, conciliado: novo });
      if (!res.ok) {
        setLocalConc((s) => ({ ...s, [l.id]: !novo }));
        toast.error(res.error ?? 'Falha');
      }
    });
  }

  function conciliarTodos(valor: boolean) {
    const ids = filtrados.map((l) => l.id);
    if (!ids.length) return;
    setLocalConc((s) => {
      const n = { ...s };
      for (const id of ids) n[id] = valor;
      return n;
    });
    start(async () => {
      const res = await marcarConciliadoEmMassa({ client_id: clientId, ids, conciliado: valor });
      if (res.ok) toast.success(valor ? 'Todos conciliados' : 'Conciliação limpa');
      else toast.error(res.error ?? 'Falha');
    });
  }

  if (bancos.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-slate-500">
          Nenhum banco encontrado. Cadastre um banco (em Bancos) ou importe lançamentos com origem
          preenchida.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controles */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3">
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Banco</span>
            <select
              value={banco}
              onChange={(e) => { setBanco(e.target.value); setComp(''); }}
              className="block h-9 min-w-[180px] rounded-lg border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {bancos.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Mês</span>
            <select
              value={comp}
              onChange={(e) => setComp(e.target.value ? Number(e.target.value) : '')}
              className="block h-9 min-w-[150px] rounded-lg border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <option value="">Todos os meses</option>
              {compsDoBanco.map((c) => <option key={c} value={c}>{labelComp(c)}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
              Saldo do extrato (movimento do período)
            </span>
            <input
              type="text"
              value={saldoExtrato}
              onChange={(e) => setSaldoExtrato(e.target.value)}
              placeholder="Ex.: 12500 ou -3200,50"
              className="block h-9 w-48 rounded-lg border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />
          </label>
        </CardContent>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Box label="Entradas" value={brl(resumo.entradas)} tone="success" />
        <Box label="Saídas" value={`−${brl(resumo.saidas)}`} tone="danger" />
        <Box label="Movimento do período" value={brl(resumo.movimento)} tone={resumo.movimento < 0 ? 'danger' : 'default'} />
        <Box
          label="Conciliados"
          value={`${resumo.concN}/${resumo.total}`}
          hint={resumo.total > 0 ? `${Math.round((resumo.concN / resumo.total) * 100)}%` : undefined}
        />
      </div>

      {diferenca != null && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm flex items-center justify-between ${
            Math.abs(diferenca) < 0.5
              ? 'border-emerald-200 bg-emerald-50/60 text-emerald-900'
              : 'border-amber-200 bg-amber-50/60 text-amber-900'
          }`}
        >
          <span>
            Saldo do extrato: <strong>{brl(saldoInformado!)}</strong> · Movimento calculado:{' '}
            <strong>{brl(resumo.movimento)}</strong>
          </span>
          <span className="font-bold tabular-nums">
            {Math.abs(diferenca) < 0.5 ? 'Bate! ✓' : `Diferença ${brl(diferenca)}`}
          </span>
        </div>
      )}

      {/* Lista */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
            <span className="text-sm font-medium text-slate-700">
              {filtrados.length} lançamento(s)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => conciliarTodos(true)}
                disabled={pending || filtrados.length === 0}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 disabled:opacity-40 px-2 py-1"
              >
                Conciliar todos
              </button>
              <button
                type="button"
                onClick={() => conciliarTodos(false)}
                disabled={pending || filtrados.length === 0}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 disabled:opacity-40 px-2 py-1"
              >
                Limpar
              </button>
            </div>
          </div>
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {filtrados.map((l) => {
                  const c = estaConc(l);
                  return (
                    <tr
                      key={l.id}
                      onClick={() => toggle(l)}
                      className={`cursor-pointer transition-colors ${c ? 'bg-emerald-50/40' : 'hover:bg-slate-50/60'}`}
                    >
                      <td className="pl-4 pr-2 py-2 w-8">
                        {c ? (
                          <CheckCircle2 size={16} className="text-emerald-600" />
                        ) : (
                          <Circle size={16} className="text-slate-300" />
                        )}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-slate-500">{fmtData(l.data)}</td>
                      <td className="px-2 py-2 text-slate-800">{l.descricao}</td>
                      <td className={`px-4 py-2 text-right tabular-nums font-medium ${l.valor < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {brl(l.valor)}
                      </td>
                    </tr>
                  );
                })}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">
                      Nenhum lançamento para esse banco/mês.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Box({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'success' | 'danger';
}) {
  const cor =
    tone === 'success' ? 'text-emerald-700' : tone === 'danger' ? 'text-red-600' : 'text-slate-900';
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-[10px] uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`text-lg font-bold tabular-nums tracking-tight mt-1 ${cor}`}>{value}</p>
      {hint && <p className="text-[10px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}
