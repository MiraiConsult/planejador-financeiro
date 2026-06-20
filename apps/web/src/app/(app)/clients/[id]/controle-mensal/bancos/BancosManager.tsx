'use client';

import { useState, useTransition } from 'react';
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Loader2,
  PauseCircle,
  PiggyBank,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TriangleAlert,
  Wallet,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/components/ui/Toast';
import {
  adicionarContas,
  descobrirContasDisponiveis,
  pausarConexao,
  removerConexao,
  sincronizarAgora,
  type DiscoveredAccount,
} from './actions';

export interface BancoRow {
  id: string;
  external_account_id: string;
  external_item_id: string | null;
  institution_name: string | null;
  account_type: string | null;
  account_subtype: string | null;
  account_number: string | null;
  status: string;
  last_sync_at: string | null;
  last_sync_error: string | null;
  last_balance: number | null;
}

export interface SyncLogRow {
  id: string;
  bank_connection_id: string | null;
  started_at: string;
  finished_at: string | null;
  status: string;
  transactions_inserted: number;
  transactions_skipped: number;
  error_message: string | null;
  triggered_by: string;
}

const TYPE_META: Record<string, { label: string; icon: typeof Wallet; tint: string }> = {
  checking: { label: 'Conta corrente', icon: Wallet, tint: 'text-blue-600 bg-blue-50' },
  savings: { label: 'Poupança', icon: PiggyBank, tint: 'text-emerald-600 bg-emerald-50' },
  credit_card: { label: 'Cartão de crédito', icon: CreditCard, tint: 'text-purple-600 bg-purple-50' },
  investment: { label: 'Investimento', icon: PiggyBank, tint: 'text-amber-600 bg-amber-50' },
  loan: { label: 'Empréstimo', icon: Wallet, tint: 'text-rose-600 bg-rose-50' },
  other: { label: 'Outro', icon: Building2, tint: 'text-slate-600 bg-slate-50' },
};

function timeAgo(iso: string | null): string {
  if (!iso) return 'nunca';
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'agora mesmo';
  if (min < 60) return `${min}min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return `${d}d atrás`;
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });

export function BancosManager({
  clientId,
  conexoes,
  logs,
}: {
  clientId: string;
  conexoes: BancoRow[];
  logs: SyncLogRow[];
}) {
  const [pending, start] = useTransition();
  const [syncingId, setSyncingId] = useState<string | 'all' | null>(null);
  const [descobrindo, setDescobrindo] = useState(false);
  const [accountsDisponiveis, setAccountsDisponiveis] = useState<
    (DiscoveredAccount & { ja_conectada: boolean })[] | null
  >(null);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());

  function descobrir() {
    setDescobrindo(true);
    setAccountsDisponiveis(null);
    start(async () => {
      const res = await descobrirContasDisponiveis({ client_id: clientId });
      setDescobrindo(false);
      if (!res.ok) {
        toast.error(res.error ?? 'Falha ao consultar Banco MCP');
        return;
      }
      setAccountsDisponiveis(res.accounts ?? []);
      // pré-marca as que ainda não estão conectadas
      const preMark = new Set(
        (res.accounts ?? []).filter((a) => !a.ja_conectada).map((a) => a.external_account_id),
      );
      setMarcados(preMark);
    });
  }

  function adicionarMarcadas() {
    if (!accountsDisponiveis || marcados.size === 0) return;
    const selecionadas = accountsDisponiveis.filter(
      (a) => marcados.has(a.external_account_id) && !a.ja_conectada,
    );
    if (selecionadas.length === 0) return;
    start(async () => {
      const res = await adicionarContas({
        client_id: clientId,
        accounts: selecionadas.map(({ ja_conectada: _ja, ...rest }) => rest),
      });
      if (!res.ok) {
        toast.error(res.error ?? 'Falha ao adicionar contas');
        return;
      }
      toast.success(`${res.inseridos ?? 0} conta(s) adicionada(s) — sincronize pra puxar as transações`);
      setAccountsDisponiveis(null);
      setMarcados(new Set());
    });
  }

  function handleSyncAll() {
    setSyncingId('all');
    start(async () => {
      const res = await sincronizarAgora({ client_id: clientId });
      setSyncingId(null);
      if (!res.ok) {
        toast.error(res.error ?? 'Falha ao sincronizar');
        return;
      }
      const total = (res.results ?? []).reduce((s, r) => s + r.inserted, 0);
      const erros = (res.results ?? []).filter((r) => r.status === 'error');
      if (erros.length > 0) {
        toast.error(`${erros.length} conta(s) com erro: ${erros[0]?.error ?? ''}`);
      }
      toast.success(`Sincronização concluída — ${total} lançamento(s) novo(s)`);
    });
  }

  function handleSyncOne(id: string) {
    setSyncingId(id);
    start(async () => {
      const res = await sincronizarAgora({ client_id: clientId, bank_connection_id: id });
      setSyncingId(null);
      if (!res.ok) {
        toast.error(res.error ?? 'Falha ao sincronizar');
        return;
      }
      const r = res.results?.[0];
      if (!r) {
        toast.error('Nenhum resultado retornado');
        return;
      }
      if (r.status === 'error') {
        toast.error(r.error ?? 'Falha');
      } else {
        toast.success(`${r.inserted} lançamento(s) novo(s)`);
      }
    });
  }

  function handlePause(id: string, atualPause: boolean) {
    start(async () => {
      const res = await pausarConexao({ client_id: clientId, id, pause: !atualPause });
      if (!res.ok) toast.error(res.error ?? 'Falha');
      else toast.success(atualPause ? 'Conta reativada' : 'Conta pausada');
    });
  }

  function handleRemove(id: string) {
    if (!confirm('Remover essa conta? Os lançamentos já importados ficam (você pode apagá-los depois).')) return;
    start(async () => {
      const res = await removerConexao({ client_id: clientId, id });
      if (!res.ok) toast.error(res.error ?? 'Falha');
      else toast.success('Conta removida');
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Banco MCP · Open Finance
          </p>
          <p className="text-sm text-slate-700 mt-1">
            {conexoes.length === 0
              ? 'Nenhuma conta conectada ainda. Comece descobrindo as contas disponíveis no seu Banco MCP.'
              : `${conexoes.length} conta${conexoes.length === 1 ? '' : 's'} conectada${conexoes.length === 1 ? '' : 's'} — sincronize quando quiser.`}
          </p>
        </div>
        <div className="flex gap-2">
          {conexoes.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleSyncAll} disabled={pending}>
              {syncingId === 'all' ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              Sincronizar tudo
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={descobrir} disabled={pending}>
            {descobrindo ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
            Descobrir contas no Banco MCP
          </Button>
        </div>
      </div>

      {accountsDisponiveis !== null && (
        <Card className="border-2 border-brand-200 bg-brand-50/30">
          <CardContent className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Contas encontradas no Banco MCP ({accountsDisponiveis.length})
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Marque as que você quer importar nesse cliente. As já conectadas ficam destacadas.
                </p>
              </div>
              <button
                onClick={() => {
                  setAccountsDisponiveis(null);
                  setMarcados(new Set());
                }}
                className="text-slate-400 hover:text-slate-900"
              >
                <X size={16} />
              </button>
            </div>

            {accountsDisponiveis.length === 0 ? (
              <p className="text-sm text-slate-600 py-4 text-center">
                Nenhuma conta encontrada. Conecte um banco no painel do Banco MCP primeiro.
              </p>
            ) : (
              <>
                <div className="space-y-1.5">
                  {accountsDisponiveis.map((a) => {
                    const meta = TYPE_META[a.account_type] ?? TYPE_META.other!;
                    const Icon = meta.icon;
                    const checked = marcados.has(a.external_account_id);
                    return (
                      <label
                        key={a.external_account_id}
                        className={`flex items-center gap-3 p-3 rounded-lg border bg-white cursor-pointer ${
                          a.ja_conectada
                            ? 'border-emerald-200 opacity-60 cursor-default'
                            : checked
                              ? 'border-brand-400'
                              : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={a.ja_conectada}
                          checked={a.ja_conectada || checked}
                          onChange={(e) => {
                            setMarcados((s) => {
                              const n = new Set(s);
                              if (e.target.checked) n.add(a.external_account_id);
                              else n.delete(a.external_account_id);
                              return n;
                            });
                          }}
                          className="h-4 w-4 shrink-0"
                        />
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${meta.tint}`}>
                          <Icon size={15} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {a.display_name}
                            </p>
                            {a.ja_conectada && (
                              <Badge variant="success">
                                <CheckCircle2 size={9} />
                                Já conectada
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex gap-3 mt-0.5">
                            <span>{a.owner ?? '—'}</span>
                            <span className="tabular-nums">
                              Saldo: {brl(parseFloat(a.balance) || 0)}
                            </span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <div className="flex justify-end pt-2 border-t border-brand-100">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={adicionarMarcadas}
                    disabled={pending || marcados.size === 0}
                  >
                    {pending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    Adicionar {marcados.size > 0 ? `${marcados.size} conta(s)` : ''}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {conexoes.map((c) => {
          const meta = TYPE_META[c.account_type ?? 'other'] ?? TYPE_META.other!;
          const Icon = meta.icon;
          const isError = c.status === 'error';
          const isPaused = c.status === 'paused';
          return (
            <Card key={c.id} className={isError ? 'border-red-200 bg-red-50/30' : ''}>
              <CardContent className="flex items-start gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${meta.tint}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900">
                      {c.institution_name ?? '—'}{' '}
                      <span className="text-slate-400 font-normal">· {meta.label}</span>
                      {c.account_number && <span className="text-slate-400 font-normal"> · {c.account_number}</span>}
                    </p>
                    {isPaused && <Badge variant="warning">Pausado</Badge>}
                    {isError && <Badge variant="warning">Erro</Badge>}
                    {c.status === 'active' && !isError && !isPaused && (
                      <Badge variant="success">
                        <CheckCircle2 size={9} />
                        Ativo
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
                    {c.last_balance != null && (
                      <span className="tabular-nums">Saldo: {brl(c.last_balance)}</span>
                    )}
                    <span>Último sync: {timeAgo(c.last_sync_at)}</span>
                  </div>
                  {isError && c.last_sync_error && (
                    <div className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1 flex items-start gap-1.5">
                      <TriangleAlert size={11} className="shrink-0 mt-0.5" />
                      {c.last_sync_error}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSyncOne(c.id)}
                    disabled={pending || isPaused}
                    className="h-8 w-8 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center disabled:opacity-40"
                    title="Sincronizar agora"
                  >
                    {syncingId === c.id ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePause(c.id, isPaused)}
                    disabled={pending}
                    className="h-8 w-8 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center disabled:opacity-40"
                    title={isPaused ? 'Reativar' : 'Pausar'}
                  >
                    {isPaused ? <Play size={13} /> : <PauseCircle size={13} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(c.id)}
                    disabled={pending}
                    className="h-8 w-8 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center disabled:opacity-40"
                    title="Remover"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {logs.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Últimas sincronizações
          </p>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500">Quando</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500">Tipo</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500">Status</th>
                  <th className="text-right px-3 py-2 font-semibold text-slate-500">Importados</th>
                  <th className="text-right px-3 py-2 font-semibold text-slate-500">Ignorados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="px-3 py-1.5 text-slate-700">{timeAgo(l.started_at)}</td>
                    <td className="px-3 py-1.5 text-slate-500">{l.triggered_by}</td>
                    <td className="px-3 py-1.5">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          l.status === 'success'
                            ? 'bg-emerald-100 text-emerald-800'
                            : l.status === 'running'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-slate-900">
                      {l.transactions_inserted}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-slate-500">
                      {l.transactions_skipped}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
