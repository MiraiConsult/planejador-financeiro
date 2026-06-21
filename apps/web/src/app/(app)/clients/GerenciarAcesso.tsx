'use client';

import { useState, useTransition } from 'react';
import { Copy, KeyRound, Loader2, Mail, ShieldCheck, Trash2, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import {
  criarAcessoCliente,
  enviarResetEmailCliente,
  resetarSenhaCliente,
  revogarAcessoCliente,
} from './admin-actions';

interface Props {
  clientId: string;
  clientNome: string;
  temLogin: boolean;
}

export function GerenciarAcessoButton({ clientId, clientNome, temLogin }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-brand-300 hover:text-brand-700 transition-colors"
        title="Gerenciar acesso do cliente"
      >
        {temLogin ? <ShieldCheck size={11} className="text-emerald-600" /> : <KeyRound size={11} />}
        {temLogin ? 'Acesso ativo' : 'Dar acesso'}
      </button>
      {open && (
        <AcessoDialog
          clientId={clientId}
          clientNome={clientNome}
          temLogin={temLogin}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function AcessoDialog({ clientId, clientNome, temLogin: temLoginInit, onClose }: Props & { onClose: () => void }) {
  const [temLogin, setTemLogin] = useState(temLoginInit);
  const [email, setEmail] = useState('');
  const [pending, start] = useTransition();
  const [senhaGerada, setSenhaGerada] = useState<string | null>(null);

  function copiar(txt: string) {
    navigator.clipboard?.writeText(txt);
    toast.success('Copiado');
  }

  function criar() {
    if (!email.trim()) {
      toast.error('Informe o e-mail do cliente');
      return;
    }
    start(async () => {
      const res = await criarAcessoCliente({ client_id: clientId, email: email.trim() });
      if (!res.ok) {
        toast.error(res.error ?? 'Falha');
        return;
      }
      setTemLogin(true);
      if (res.senha_gerada) setSenhaGerada(res.senha_gerada);
      toast.success('Acesso criado');
    });
  }

  function resetar() {
    start(async () => {
      const res = await resetarSenhaCliente({ client_id: clientId });
      if (!res.ok) {
        toast.error(res.error ?? 'Falha');
        return;
      }
      if (res.senha_gerada) setSenhaGerada(res.senha_gerada);
      toast.success('Senha redefinida');
    });
  }

  function enviarEmail() {
    start(async () => {
      const res = await enviarResetEmailCliente({ client_id: clientId });
      if (!res.ok) {
        toast.error(res.error ?? 'Falha');
        return;
      }
      toast.success(`E-mail de redefinição enviado${res.enviado_para ? ` para ${res.enviado_para}` : ''}`);
    });
  }

  function revogar() {
    if (!confirm('Revogar o acesso? O cliente não conseguirá mais logar (o login é apagado).')) return;
    start(async () => {
      const res = await revogarAcessoCliente({ client_id: clientId });
      if (!res.ok) {
        toast.error(res.error ?? 'Falha');
        return;
      }
      setTemLogin(false);
      setSenhaGerada(null);
      toast.success('Acesso revogado');
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600">
              Acesso do cliente
            </p>
            <h3 className="mt-1 text-lg font-bold text-slate-900">{clientNome}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900">
            <X size={18} />
          </button>
        </div>

        {senhaGerada && (
          <div className="rounded-lg border-2 border-emerald-300 bg-emerald-50 p-3 space-y-1">
            <p className="text-xs font-semibold text-emerald-900">Senha gerada — copie e entregue ao cliente:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono bg-white rounded px-2 py-1 border border-emerald-200">
                {senhaGerada}
              </code>
              <button onClick={() => copiar(senhaGerada)} className="text-emerald-700 hover:text-emerald-900" title="Copiar">
                <Copy size={15} />
              </button>
            </div>
            <p className="text-[10px] text-emerald-700">Não será mostrada de novo. Oriente o cliente a trocá-la no primeiro acesso.</p>
          </div>
        )}

        {!temLogin ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Crie um login pra esse cliente acessar o painel dele. Uma senha provisória será gerada
              automaticamente (ou o cliente define via e-mail de redefinição).
            </p>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-700">E-mail do cliente</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@email.com"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              />
            </label>
            <Button variant="primary" size="sm" onClick={criar} disabled={pending} className="w-full">
              {pending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              Criar acesso
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <ShieldCheck size={15} />
              Esse cliente tem login ativo.
            </div>
            <div className="grid gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={resetar} disabled={pending}>
                <KeyRound size={13} />
                Gerar nova senha provisória
              </Button>
              <Button variant="outline" size="sm" onClick={enviarEmail} disabled={pending}>
                <Mail size={13} />
                Enviar e-mail de redefinição
              </Button>
              <Button variant="ghost" size="sm" onClick={revogar} disabled={pending}>
                <Trash2 size={13} />
                Revogar acesso
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
