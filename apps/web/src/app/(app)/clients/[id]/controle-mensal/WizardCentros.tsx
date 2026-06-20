'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, Wand2, X } from 'lucide-react';
import * as Lucide from 'lucide-react';
import { Tag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { TEMPLATES, type TemplateCentro } from '@/lib/controle-mensal/centros';
import { aplicarTemplate } from './centros/actions';

function Icone({ nome, size = 12 }: { nome: string; size?: number }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Cmp = (Lucide as any)[nome] ?? Tag;
  return <Cmp size={size} />;
}

function flattenTpl(centros: TemplateCentro[]): TemplateCentro[] {
  const out: TemplateCentro[] = [];
  const walk = (n: TemplateCentro): void => { out.push(n); n.filhos?.forEach(walk); };
  centros.forEach(walk);
  return out;
}

/**
 * Onboarding mostrado quando o cliente não tem nenhum centro configurado
 * e nenhum lançamento ainda. Convida a escolher um template, configurar
 * manualmente, ou pular e ir direto pro import (cria centros default
 * por backfill quando o primeiro CSV chegar).
 */
export function WizardCentros({ clientId }: { clientId: string }) {
  const [selecionado, setSelecionado] = useState<string | null>('solo');
  const [dispensado, setDispensado] = useState(false);
  const [pending, start] = useTransition();

  if (dispensado) return null;

  function aplicar(): void {
    if (!selecionado) return;
    start(async () => {
      const res = await aplicarTemplate(clientId, selecionado);
      if (res.ok) {
        toast.success('Centros criados — agora é só importar ou lançar');
        // page.tsx revalida; o wizard some no próximo render porque
        // centros.length > 0
      } else {
        toast.error(res.erro ?? 'Falha ao aplicar template');
      }
    });
  }

  return (
    <Card className="border-2 border-brand-200 dark:border-brand-900 bg-gradient-to-br from-brand-50/60 to-white dark:from-brand-950/30 dark:to-slate-900">
      <CardContent className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0">
              <Wand2 size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Vamos configurar os centros deste cliente
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                Centros organizam os lançamentos por área (pessoa, empresa, projeto). Escolha um modelo abaixo —
                você pode renomear, adicionar e remover depois.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDispensado(true)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0"
            title="Pular agora (você pode configurar depois em Centros)"
            aria-label="Dispensar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelecionado(t.id)}
              className={`text-left p-3 rounded-lg border-2 transition-colors bg-white dark:bg-slate-900 ${
                selecionado === t.id
                  ? 'border-brand-500'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t.nome}</p>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{t.descricao}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {flattenTpl(t.centros).map((c, i) => (
                  <span
                    key={`${c.nome}-${i}`}
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium"
                    style={{ backgroundColor: `${c.cor}22`, color: c.cor }}
                  >
                    <Icone nome={c.icone} size={10} />
                    {c.nome}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-800">
          <Link
            href={`/clients/${clientId}/controle-mensal/dados-cadastrais?tab=centros`}
            className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 inline-flex items-center gap-1"
          >
            Prefiro criar do zero
            <ArrowRight size={11} />
          </Link>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDispensado(true)}>
              Pular
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={aplicar}
              disabled={pending || !selecionado}
            >
              <Sparkles size={13} />
              {pending ? 'Aplicando…' : 'Aplicar template'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
