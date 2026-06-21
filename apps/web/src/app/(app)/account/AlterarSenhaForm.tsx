'use client';

import { useState, useTransition } from 'react';
import { Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { alterarSenha } from './actions';

export function AlterarSenhaForm() {
  const [s1, setS1] = useState('');
  const [s2, setS2] = useState('');
  const [show, setShow] = useState(false);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (s1.length < 6) { toast.error('Mínimo 6 caracteres'); return; }
    if (s1 !== s2) { toast.error('As senhas não batem'); return; }
    start(async () => {
      const res = await alterarSenha({ novaSenha: s1 });
      if (!res.ok) { toast.error(res.error ?? 'Falha'); return; }
      toast.success('Senha alterada — use a nova no próximo login');
      setS1(''); setS2('');
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3 max-w-md">
      <label className="block space-y-1">
        <span className="text-xs font-medium text-slate-700">Nova senha</span>
        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            value={s1}
            onChange={(e) => setS1(e.target.value)}
            minLength={6}
            placeholder="Mínimo 6 caracteres"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900">
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-slate-700">Repetir a nova senha</span>
        <input
          type={show ? 'text' : 'password'}
          value={s2}
          onChange={(e) => setS2(e.target.value)}
          minLength={6}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        />
      </label>
      <Button type="submit" variant="primary" size="md" disabled={pending}>
        {pending ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
        Alterar senha
      </Button>
    </form>
  );
}
