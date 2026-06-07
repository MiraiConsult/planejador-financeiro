'use client';

import { useRef, useState, useTransition } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { importarLancamentos, type ImportResult } from './actions';

export function ImportCard({ clientId, vazio = false }: { clientId: string; vazio?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);

  function onFile(file: File | undefined) {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    setMsg(null);
    start(async () => {
      const res: ImportResult = await importarLancamentos(clientId, fd);
      if (res.ok) {
        setMsg({ tipo: 'ok', texto: `✓ ${res.adicionados} novos lançamentos, ${res.ignorados} já existentes.` });
      } else {
        setMsg({ tipo: 'err', texto: res.erro ?? 'Erro ao importar.' });
      }
      if (inputRef.current) inputRef.current.value = '';
    });
  }

  return (
    <Card className={vazio ? 'border-dashed' : undefined}>
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
            <FileSpreadsheet size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {vazio ? 'Nenhum lançamento ainda — importe o primeiro mês' : 'Importar mês'}
            </p>
            <p className="text-xs text-slate-500 max-w-xl">
              CSV no formato da planilha (Data, Descrição, Valor, Categoria, Subcategoria, Mês, Tipo, Origem,
              Cliente/Obs). A importação é incremental e idempotente.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {msg && (
            <span className={`text-xs font-medium ${msg.tipo === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>
              {msg.texto}
            </span>
          )}
          <input ref={inputRef} type="file" accept=".csv" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          <Button variant="primary" size="sm" disabled={pending} onClick={() => inputRef.current?.click()}>
            <Upload size={14} />
            {pending ? 'Importando…' : 'Selecionar CSV'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
