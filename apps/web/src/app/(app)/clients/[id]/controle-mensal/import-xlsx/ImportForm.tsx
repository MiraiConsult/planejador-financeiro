'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { importarLancamentosXLSX } from './actions';

interface Resultado {
  ok: boolean;
  error?: string;
  inseridos?: number;
  duplicados?: number;
  ignorados?: number;
  total_lidos?: number;
}

export function ImportForm({ clientId }: { clientId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [pending, start] = useTransition();

  function enviar() {
    if (!file) return;
    const fd = new FormData();
    fd.set('client_id', clientId);
    fd.set('file', file);
    setResultado(null);
    start(async () => {
      const r = await importarLancamentosXLSX(fd);
      setResultado(r);
    });
  }

  return (
    <div className="space-y-4">
      <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 px-6 py-8 cursor-pointer hover:border-brand-400 hover:bg-brand-50/40 transition">
        <FileSpreadsheet size={28} className="text-slate-400" />
        <span className="text-sm font-semibold text-slate-700">
          {file ? file.name : 'Clique para escolher um arquivo .xlsx'}
        </span>
        {file && (
          <span className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</span>
        )}
        <input
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setResultado(null);
          }}
          disabled={pending}
        />
      </label>

      <Button
        variant="primary"
        size="md"
        type="button"
        onClick={enviar}
        disabled={!file || pending}
        className="w-full"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        {pending ? 'Importando…' : 'Importar lançamentos'}
      </Button>

      {resultado && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            resultado.ok
              ? 'border-emerald-200 bg-emerald-50/60 text-emerald-900'
              : 'border-red-200 bg-red-50/60 text-red-900'
          }`}
        >
          {resultado.ok ? (
            <div className="space-y-1">
              <p className="font-semibold flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                Importação concluída
              </p>
              <ul className="text-xs space-y-0.5 ml-6 list-disc">
                <li>{resultado.total_lidos ?? 0} lançamentos lidos da planilha</li>
                <li>
                  <strong>{resultado.inseridos ?? 0}</strong> inseridos
                </li>
                <li>
                  <strong>{resultado.duplicados ?? 0}</strong> duplicados ignorados
                </li>
                {(resultado.ignorados ?? 0) > 0 && (
                  <li>{resultado.ignorados} linhas inválidas (sem data/valor) puladas</li>
                )}
              </ul>
            </div>
          ) : (
            <p>
              <strong>Erro:</strong> {resultado.error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
