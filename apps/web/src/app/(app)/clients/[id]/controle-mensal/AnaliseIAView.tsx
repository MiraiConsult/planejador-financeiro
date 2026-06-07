'use client';

import { useState } from 'react';
import {
  Sparkles, Loader2, Send, CheckCircle2, Info, AlertTriangle, AlertOctagon, Lightbulb,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { ControleInsights } from '@/lib/ai/controleInsightsSchema';

type Sev = 'positivo' | 'info' | 'atencao' | 'alerta';

const sevMeta: Record<Sev, { icon: typeof Info; cls: string; dot: string }> = {
  positivo: { icon: CheckCircle2, cls: 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20', dot: 'text-emerald-600' },
  info: { icon: Info, cls: 'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/30', dot: 'text-slate-500' },
  atencao: { icon: AlertTriangle, cls: 'border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20', dot: 'text-amber-600' },
  alerta: { icon: AlertOctagon, cls: 'border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20', dot: 'text-red-600' },
};

export function AnaliseIAView({ clientId, temDados }: { clientId: string; temDados: boolean }) {
  const [insights, setInsights] = useState<ControleInsights | null>(null);
  const [loadingIns, setLoadingIns] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [pergunta, setPergunta] = useState('');
  const [resposta, setResposta] = useState<string | null>(null);
  const [loadingResp, setLoadingResp] = useState(false);

  async function call(body: object) {
    const res = await fetch(`/api/clients/${clientId}/controle-mensal/analise`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => null);
      throw new Error(b?.error ?? `HTTP ${res.status}`);
    }
    return res.json();
  }

  async function analisar() {
    setLoadingIns(true);
    setErro(null);
    try {
      const data = (await call({})) as { insights: ControleInsights };
      setInsights(data.insights);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'erro');
    } finally {
      setLoadingIns(false);
    }
  }

  async function perguntar() {
    if (!pergunta.trim()) return;
    setLoadingResp(true);
    setResposta(null);
    setErro(null);
    try {
      const data = (await call({ pergunta })) as { resposta: string };
      setResposta(data.resposta);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'erro');
    } finally {
      setLoadingResp(false);
    }
  }

  if (!temDados) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-slate-500">
          Importe ou adicione lançamentos pra liberar a análise por IA.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <CardTitle>Análise por IA</CardTitle>
                <CardDescription>A IA lê os agregados do período e aponta o que importa</CardDescription>
              </div>
            </div>
            <Button variant="primary" size="sm" onClick={analisar} disabled={loadingIns}>
              {loadingIns ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {loadingIns ? 'Analisando…' : insights ? 'Analisar de novo' : 'Analisar com IA'}
            </Button>
          </div>
        </CardHeader>
        {(insights || erro) && (
          <CardContent className="space-y-3">
            {erro && <p className="text-sm text-red-600">{erro}</p>}
            {insights && (
              <>
                <p className="text-sm text-slate-700 dark:text-slate-200 bg-brand-50/50 dark:bg-brand-950/30 rounded-lg px-3 py-2">
                  {insights.resumo}
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {insights.insights.map((ins, i) => {
                    const meta = sevMeta[ins.severidade] ?? sevMeta.info;
                    const Icon = meta.icon;
                    return (
                      <div key={i} className={`rounded-xl border p-3 ${meta.cls}`}>
                        <div className="flex items-start gap-2">
                          <Icon size={15} className={`${meta.dot} shrink-0 mt-0.5`} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{ins.titulo}</p>
                            {ins.rubrica && (
                              <span className="inline-block text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">{ins.rubrica}</span>
                            )}
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{ins.descricao}</p>
                            {ins.recomendacao && (
                              <p className="text-xs text-brand-700 dark:text-brand-300 mt-1.5 flex items-start gap-1">
                                <Lightbulb size={12} className="shrink-0 mt-0.5" />
                                {ins.recomendacao}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pergunte à IA</CardTitle>
          <CardDescription>Tire dúvidas sobre os números (ex: "onde eu mais gastei à toa?")</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end gap-2">
            <textarea
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void perguntar();
                }
              }}
              rows={2}
              placeholder='Ex: "quanto dá pra cortar de assinaturas?" · "qual mês foi o pior e por quê?"'
              className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <Button variant="primary" size="md" onClick={perguntar} disabled={loadingResp || !pergunta.trim()}>
              {loadingResp ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </Button>
          </div>
          {resposta && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
              {resposta}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
