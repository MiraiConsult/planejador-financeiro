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
  Trash2,
  TriangleAlert,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/components/ui/Toast';
import {
  adicionarConexao,
  pausarConexao,
  removerConexao,
  sincronizarAgora,
  type BankConnectionInput,
} from './actions';

export interface BancoRow {
  id: string;
  external_item_id: string;
  institution_name: string | null;
  account_type: string | null;
  status: string;
  last_sync_at: string | null;
  last_sync_error: string | null;
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

export function BancosManager({
  clientId,
  conexoes,
  logs,
}: {
  clientId: string;
  conexoes: BancoRow[];
  logs: SyncLogRow[];
}) {
  const [mostrarForm, setMostrarForm] = useState(conexoes.length === 0);
  const [pending, start] = useTransition();
  const [syncingId, setSyncingId] = useState<string | 'all' | null>(null);

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
      const inserted = res.results?.[0]?.inserted ?? 0;
      toast.success(`${inserted} lançamento(s) novo(s)`);
    });
  }

  function handlePause(id: string, atualPause: boolean) {
    start(async () => {
      const res = await pausarConexao({ client_id: clientId, id, pause: !atualPause });
      if (!res.ok) toast.error(res.error ?? 'Falha');
      else toast.success(atualPause ? 'Conexão reativada' : 'Conexão pausada');
    });
  }

  function handleRemove(id: string) {
    if (!confirm('Remover essa conexão? Os lançamentos já importados ficam.')) return;
    start(async () => {
      const res = await removerConexao({ client_id: clientId, id });
      if (!res.ok) toast.error(res.error ?? 'Falha');
      else toast.success('Conexão removida');
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Bancos conectados via Banco MCP
          </p>
          <p className="text-sm text-slate-700 mt-1">
            {conexoes.length === 0
              ? 'Nenhuma conexão ainda. Conecte um banco no painel do Banco MCP e cole o item_id aqui.'
              : `${conexoes.length} conexão(ões) — sync diário automático às 6h, ou manual abaixo.`}
          </p>
        </div>
        <div className="flex gap-2">
          {conexoes.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncAll}
              disabled={pending}
            >
              {syncingId === 'all' ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              Sincronizar todos
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={() => setMostrarForm((s) => !s)}>
            <Plus size={13} />
            Adicionar conexão
          </Button>
        </div>
      </div>

      {mostrarForm && (
        <FormAdicionar
          clientId={clientId}
          onClose={() => setMostrarForm(false)}
        />
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
                      {c.institution_name || '—'}
                    </p>
                    <span className="text-[10px] text-slate-500">{meta.label}</span>
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
                    <span>item_id: <code className="font-mono">{c.external_item_id.slice(0, 12)}…</code></span>
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

function FormAdicionar({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const [externalItemId, setExternalItemId] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [accountType, setAccountType] = useState<BankConnectionInput['account_type']>('checking');
  const [lookback, setLookback] = useState(90);
  const [pending, start] = useTransition();

  function submit() {
    if (!externalItemId.trim() || !institutionName.trim()) {
      toast.error('Preencha banco e item_id');
      return;
    }
    start(async () => {
      const res = await adicionarConexao({
        client_id: clientId,
        input: {
          external_item_id: externalItemId,
          institution_name: institutionName,
          account_type: accountType,
          initial_lookback_days: lookback,
        },
      });
      if (!res.ok) {
        toast.error(res.error ?? 'Falha');
        return;
      }
      toast.success('Conexão adicionada — sincronize pra puxar transações');
      onClose();
    });
  }

  return (
    <Card className="border-2 border-brand-200 bg-brand-50/30">
      <CardContent className="space-y-3">
        <p className="text-sm font-semibold text-slate-900">Nova conexão bancária</p>
        <p className="text-xs text-slate-500">
          Conecte o banco no painel do Banco MCP, copie o <code>item_id</code> da conexão e cole abaixo. Pra
          cada banco/cartão diferente cria uma conexão.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-[11px] font-medium text-slate-700">Banco / Instituição</span>
            <input
              type="text"
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
              placeholder="Ex: Itaú Conta Corrente"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] font-medium text-slate-700">Tipo</span>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as BankConnectionInput['account_type'])}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
            >
              <option value="checking">Conta corrente</option>
              <option value="savings">Poupança</option>
              <option value="credit_card">Cartão de crédito</option>
              <option value="investment">Investimento</option>
              <option value="loan">Empréstimo</option>
              <option value="other">Outro</option>
            </select>
          </label>
        </div>
        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-slate-700">item_id (do painel do Banco MCP)</span>
          <input
            type="text"
            value={externalItemId}
            onChange={(e) => setExternalItemId(e.target.value)}
            placeholder="ex: a1b2c3d4-..."
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          />
        </label>
        <label className="block space-y-1 max-w-xs">
          <span className="text-[11px] font-medium text-slate-700">
            Buscar histórico dos últimos N dias no primeiro sync
          </span>
          <input
            type="number"
            min={1}
            max={365}
            value={lookback}
            onChange={(e) => setLookback(parseInt(e.target.value) || 90)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
          />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={pending}>
            {pending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Adicionar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
