'use client';

import { useState, useTransition } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { importarCsvOnboarding } from '../actions';

interface ParsedRow {
  data: string;
  descricao: string;
  valor: number;
  categoria?: string;
  raw: string[];
}

interface Props {
  clientId: string;
  onPrev: () => void;
  onFinalizar: () => void;
  finalizando: boolean;
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  // Detector simples de separador: , ou ; ou \t
  const head = lines[0]!;
  const sep = (head.includes(';') ? ';' : head.includes('\t') ? '\t' : ',') as string;
  const split = (line: string): string[] =>
    line.split(sep).map((c) => c.replace(/^"|"$/g, '').trim());
  return { headers: split(head), rows: lines.slice(1).map(split) };
}

function parseValor(raw: string): number {
  if (!raw) return NaN;
  // pt-BR: 1.234,56 | en-US: 1,234.56 — assume vírgula como decimal se houver
  const cleaned = raw.replace(/\s/g, '').replace(/[^\d,.\-]/g, '');
  if (cleaned.includes(',') && cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
  }
  return parseFloat(cleaned.replace(/,/g, ''));
}

function parseData(raw: string): string | null {
  if (!raw) return null;
  const s = raw.trim();
  // ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // dd/mm/yyyy
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

const KEYS_DATA = ['data', 'date', 'dt', 'dia'];
const KEYS_DESC = ['descricao', 'descrição', 'descricão', 'description', 'historico', 'histórico', 'memo'];
const KEYS_VALOR = ['valor', 'value', 'amount', 'montante', 'preço', 'preco'];
const KEYS_CAT = ['categoria', 'category', 'classe'];

function detectColuna(headers: string[], aceitas: string[]): number {
  const norm = headers.map((h) => h.toLowerCase().trim());
  for (const a of aceitas) {
    const i = norm.indexOf(a);
    if (i >= 0) return i;
  }
  return -1;
}

export function StepImportacao({ clientId, onPrev, onFinalizar, finalizando }: Props) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [erroParse, setErroParse] = useState<string | null>(null);
  const [importing, startImport] = useTransition();
  const [importados, setImportados] = useState<number | null>(null);

  async function handleArquivo(f: File) {
    setArquivo(f);
    setErroParse(null);
    setImportados(null);
    try {
      const text = await f.text();
      const { headers, rows } = parseCsv(text);
      if (headers.length === 0) {
        setErroParse('Arquivo vazio');
        return;
      }
      setHeaders(headers);

      const iData = detectColuna(headers, KEYS_DATA);
      const iDesc = detectColuna(headers, KEYS_DESC);
      const iValor = detectColuna(headers, KEYS_VALOR);
      const iCat = detectColuna(headers, KEYS_CAT);

      if (iData < 0 || iDesc < 0 || iValor < 0) {
        setErroParse(
          'Não consegui detectar as colunas necessárias. Esperado: data, descrição, valor (e opcionalmente categoria).',
        );
        return;
      }

      const linhas: ParsedRow[] = [];
      for (const r of rows) {
        const data = parseData(r[iData] ?? '');
        const valor = parseValor(r[iValor] ?? '');
        const descricao = (r[iDesc] ?? '').trim();
        if (!data || !descricao || Number.isNaN(valor) || valor === 0) continue;
        linhas.push({
          data,
          descricao,
          valor,
          categoria: iCat >= 0 ? (r[iCat] ?? '').trim() || undefined : undefined,
          raw: r,
        });
      }
      setParsed(linhas);
    } catch (err) {
      setErroParse(err instanceof Error ? err.message : 'Falha ao ler arquivo');
    }
  }

  function importar() {
    if (parsed.length === 0) return;
    startImport(async () => {
      const res = await importarCsvOnboarding({
        client_id: clientId,
        rows: parsed.map((p) => ({
          data: p.data,
          descricao: p.descricao,
          valor: p.valor,
          categoria: p.categoria,
        })),
      });
      if (!res.ok) {
        toast.error(res.error ?? 'Falha na importação');
        return;
      }
      setImportados(res.inseridos ?? 0);
      toast.success(`${res.inseridos ?? 0} lançamento(s) importado(s)`);
    });
  }

  function limpar() {
    setArquivo(null);
    setHeaders([]);
    setParsed([]);
    setErroParse(null);
    setImportados(null);
  }

  const totReceita = parsed.filter((p) => p.valor > 0).reduce((s, p) => s + p.valor, 0);
  const totGasto = parsed.filter((p) => p.valor < 0).reduce((s, p) => s + Math.abs(p.valor), 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
          Passo 4 de 4 · Importação
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
          Importar planilha (opcional)
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
          Tem um CSV com lançamentos? Faça upload aqui e detectamos as colunas (data, descrição, valor,
          categoria). Valores positivos viram receita, negativos viram gasto. Pode pular se preferir
          importar depois.
        </p>
      </div>

      {!arquivo && (
        <label className="block rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-12 text-center cursor-pointer hover:border-brand-400 dark:hover:border-brand-600 transition-colors">
          <div className="flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Upload size={24} className="text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Arraste o CSV ou clique para selecionar
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Formato esperado: colunas data, descrição, valor (e opcionalmente categoria)
              </p>
            </div>
          </div>
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleArquivo(f);
            }}
          />
        </label>
      )}

      {arquivo && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                <FileSpreadsheet size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {arquivo.name}
                </p>
                <p className="text-xs text-slate-500">
                  {(arquivo.size / 1024).toFixed(1)} KB · {parsed.length} linha(s) válida(s) detectada(s)
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={limpar}
              className="text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              disabled={importing}
            >
              <X size={16} />
            </button>
          </div>

          {erroParse && (
            <div className="rounded-lg border border-red-200 bg-red-50/60 dark:bg-red-950/30 p-3 text-xs text-red-800 dark:text-red-200">
              {erroParse}
              <div className="mt-1 text-red-600 dark:text-red-300 text-[10px]">
                Cabeçalhos encontrados: {headers.join(', ')}
              </div>
            </div>
          )}

          {parsed.length > 0 && (
            <>
              <div className="flex gap-4 text-xs tabular-nums">
                <span className="text-emerald-700 dark:text-emerald-400">
                  +R$ {totReceita.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </span>
                <span className="text-red-600 dark:text-red-400">
                  −R$ {totGasto.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </span>
                <span className="text-slate-900 dark:text-slate-100 font-semibold">
                  Saldo R$ {(totReceita - totGasto).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </span>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-100 dark:border-slate-800">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-1.5 font-semibold text-slate-500">Data</th>
                      <th className="text-left px-2 py-1.5 font-semibold text-slate-500">Descrição</th>
                      <th className="text-right px-2 py-1.5 font-semibold text-slate-500">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {parsed.slice(0, 50).map((p, i) => (
                      <tr key={i}>
                        <td className="px-2 py-1 text-slate-700 dark:text-slate-300 tabular-nums">
                          {p.data}
                        </td>
                        <td className="px-2 py-1 text-slate-700 dark:text-slate-300 truncate max-w-[300px]">
                          {p.descricao}
                        </td>
                        <td
                          className={`px-2 py-1 text-right tabular-nums font-medium ${
                            p.valor > 0 ? 'text-emerald-700' : 'text-red-600'
                          }`}
                        >
                          {p.valor > 0 ? '+' : ''}
                          {p.valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ))}
                    {parsed.length > 50 && (
                      <tr>
                        <td colSpan={3} className="px-2 py-2 text-center text-slate-500">
                          + {parsed.length - 50} linha(s)…
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {importados == null ? (
                <div className="flex justify-end">
                  <Button variant="primary" size="sm" onClick={importar} disabled={importing}>
                    {importing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                    Importar {parsed.length} lançamento(s)
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/30 p-3 flex items-center gap-2 text-sm">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span className="text-emerald-900 dark:text-emerald-100">
                    {importados} lançamento(s) importados com sucesso
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
        <Button variant="ghost" size="md" onClick={onPrev} disabled={finalizando}>
          <ArrowLeft size={14} />
          Voltar
        </Button>
        <Button variant="primary" size="md" onClick={onFinalizar} disabled={finalizando}>
          {finalizando ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <>
              <CheckCircle2 size={14} />
              Finalizar onboarding
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
