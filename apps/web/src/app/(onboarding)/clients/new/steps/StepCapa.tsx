'use client';

import { useState } from 'react';
import { Sparkles, FileText, Edit3, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import type { WizardState } from '../Wizard';
import type { TranscriptExtraction } from '@/lib/ai/extractSchema';
import { transcriptToWizardState } from '../transcriptToWizard';

interface Props {
  onStart: (initialState?: WizardState) => void;
}

type Mode = 'choose' | 'transcript' | 'extracting' | 'preview';

export function StepCapa({ onStart }: Props) {
  const [mode, setMode] = useState<Mode>('choose');
  const [transcript, setTranscript] = useState('');
  const [extracted, setExtracted] = useState<TranscriptExtraction | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExtract() {
    if (transcript.trim().length < 100) {
      toast.error('Transcrição muito curta. Cole o texto completo.');
      return;
    }
    setMode('extracting');
    setError(null);
    try {
      const res = await fetch('/api/onboarding/extract-transcript', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as TranscriptExtraction;
      setExtracted(data);
      setMode('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erro desconhecido');
      setMode('transcript');
    }
  }

  function confirmAndStart() {
    if (!extracted) return;
    const state = transcriptToWizardState(extracted, transcript);
    toast.success(`Pré-preenchido a partir da transcrição · revise nos próximos passos`);
    onStart(state);
  }

  if (mode === 'choose') {
    return <ChoiceScreen onTranscript={() => setMode('transcript')} onManual={() => onStart()} />;
  }

  if (mode === 'transcript' || mode === 'extracting') {
    return (
      <TranscriptScreen
        transcript={transcript}
        onChange={setTranscript}
        onBack={() => setMode('choose')}
        onExtract={handleExtract}
        loading={mode === 'extracting'}
        error={error}
      />
    );
  }

  if (mode === 'preview' && extracted) {
    return (
      <PreviewScreen
        extracted={extracted}
        onBack={() => setMode('transcript')}
        onConfirm={confirmAndStart}
      />
    );
  }

  return null;
}

function ChoiceScreen({ onTranscript, onManual }: { onTranscript: () => void; onManual: () => void }) {
  return (
    <div className="space-y-10">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-400 text-white shadow-glow mb-2">
          <Sparkles size={28} strokeWidth={2.2} />
        </div>
        <h1 className="text-display-md font-bold tracking-tight text-slate-900 dark:text-slate-100 text-balance max-w-2xl mx-auto">
          Vamos montar o plano financeiro do seu cliente
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto text-pretty leading-relaxed">
          Dois caminhos. Escolha o que faz mais sentido pra esta reunião.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
        <button
          type="button"
          onClick={onTranscript}
          className="text-left rounded-2xl border-2 border-brand-300 dark:border-brand-700 bg-brand-50/40 dark:bg-brand-950/30 p-6 space-y-3 hover:border-brand-500 hover:shadow-glow transition-all group"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-600 dark:bg-brand-500 text-white flex items-center justify-center shadow-soft">
              <FileText size={18} />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-brand-600 text-white">
              recomendado
            </span>
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              Tenho a transcrição da reunião
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Cola o texto do Granola (ou qualquer transcrição). A IA preenche tudo automaticamente
              · você revisa nos próximos passos.
            </p>
          </div>
          <p className="text-xs text-brand-600 dark:text-brand-400 font-medium flex items-center gap-1">
            Começar com transcrição
            <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
          </p>
        </button>

        <button
          type="button"
          onClick={onManual}
          className="text-left rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-3 hover:border-slate-400 transition-all group"
        >
          <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center">
            <Edit3 size={18} />
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              Preencher do zero
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Sem transcrição? Passa pelos 6 passos preenchendo tudo manualmente — forms, gráficos
              e quick-picks.
            </p>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
            Começar manualmente
            <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
          </p>
        </button>
      </div>

      <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 max-w-md mx-auto">
        Dá pra mudar de modo a qualquer hora. Tudo o que for preenchido fica salvo automaticamente.
      </p>
    </div>
  );
}

function TranscriptScreen({
  transcript,
  onChange,
  onBack,
  onExtract,
  loading,
  error,
}: {
  transcript: string;
  onChange: (s: string) => void;
  onBack: () => void;
  onExtract: () => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
          Transcrição
        </p>
        <h1 className="text-display-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Cola a transcrição completa
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Exporta do Granola (ou qualquer ferramenta) e cola abaixo. A IA vai identificar o cliente,
          extrair receitas, despesas, sonhos, eventos e perfil subjetivo. Tudo editável depois.
        </p>
      </div>

      <textarea
        value={transcript}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Speaker A: Oi Diego, vamos entender seu futuro financeiro&#10;Speaker B: Tenho 28 anos, ganho 36k/mês..."
        disabled={loading}
        rows={20}
        className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 px-4 py-3 text-sm font-mono leading-relaxed placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60"
      />

      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50/40 dark:bg-red-950/30 px-4 py-3 flex items-start gap-2">
          <AlertCircle size={14} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="md" onClick={onBack} disabled={loading}>
          Voltar
        </Button>
        <div className="flex items-center gap-3">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            {transcript.length} caracteres
          </p>
          <Button size="md" onClick={onExtract} disabled={loading || transcript.trim().length < 100}>
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Processando com IA...
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Processar com IA
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PreviewScreen({
  extracted,
  onBack,
  onConfirm,
}: {
  extracted: TranscriptExtraction;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const counts = {
    receitas: extracted.receitas.length,
    despesas: extracted.despesas.length,
    ativos: extracted.ativos.length,
    passivos: extracted.passivos.length,
    eventos: extracted.eventos.length,
  };
  const perfilCount = Object.values(extracted.perfil_subjetivo).filter((v) => v && v.length > 0).length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
          Extração concluída
        </p>
        <h1 className="text-display-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {extracted.cliente.nome_completo ?? 'Cliente'}
          {extracted.cliente.idade_atual && (
            <span className="text-slate-500 dark:text-slate-400 font-normal text-2xl">
              {' · '}
              {extracted.cliente.idade_atual} anos
            </span>
          )}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
          "{extracted.resumo}"
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <KPI label="Receitas" value={counts.receitas} color="text-emerald-600 dark:text-emerald-400" />
        <KPI label="Despesas" value={counts.despesas} color="text-red-600 dark:text-red-400" />
        <KPI label="Ativos" value={counts.ativos} color="text-violet-600 dark:text-violet-400" />
        <KPI label="Passivos" value={counts.passivos} color="text-orange-600 dark:text-orange-400" />
        <KPI label="Eventos" value={counts.eventos} color="text-amber-600 dark:text-amber-400" />
      </div>

      {/* Detalhes */}
      <Section title="Dados básicos">
        <DetailRow label="Idade atual" value={extracted.cliente.idade_atual ? `${extracted.cliente.idade_atual} anos` : '—'} />
        <DetailRow label="Expectativa de vida" value={extracted.cliente.expectativa_vida_anos ? `${extracted.cliente.expectativa_vida_anos} anos` : '—'} />
        <DetailRow label="Aposentadoria" value={extracted.cliente.idade_aposentadoria ? `${extracted.cliente.idade_aposentadoria} anos` : '—'} />
        <DetailRow label="Perfil de carteira" value={extracted.cliente.perfil_carteira ?? '—'} />
      </Section>

      {perfilCount > 0 && (
        <Section title={`Perfil subjetivo (${perfilCount} respondida${perfilCount > 1 ? 's' : ''})`}>
          {extracted.perfil_subjetivo.legado && (
            <DetailRow label="Legado" value={extracted.perfil_subjetivo.legado} multiline />
          )}
          {extracted.perfil_subjetivo.medo_principal && (
            <DetailRow label="Maior medo" value={extracted.perfil_subjetivo.medo_principal} multiline />
          )}
          {extracted.perfil_subjetivo.significado_dinheiro && (
            <DetailRow label="Dinheiro significa" value={extracted.perfil_subjetivo.significado_dinheiro} multiline />
          )}
          {extracted.perfil_subjetivo.visao_30_anos && (
            <DetailRow label="Visão 30 anos" value={extracted.perfil_subjetivo.visao_30_anos} multiline />
          )}
        </Section>
      )}

      {counts.receitas > 0 && (
        <Section title={`Receitas (${counts.receitas})`}>
          {extracted.receitas.map((r, i) => (
            <DetailRow
              key={i}
              label={r.nome}
              value={`R$ ${(r.valor_anual / 12).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/mês · ${r.idade_inicio}–${r.idade_fim}${r.crescimento_real_aa_pct ? ` · +${r.crescimento_real_aa_pct}% a.a.` : ''}`}
            />
          ))}
        </Section>
      )}

      {counts.despesas > 0 && (
        <Section title={`Despesas (${counts.despesas})`}>
          {extracted.despesas.map((d, i) => (
            <DetailRow
              key={i}
              label={d.descricao}
              value={`R$ ${d.valor_mensal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/mês · ${d.idade_inicio}–${d.idade_fim}${d.essencial ? ' · essencial' : ''}`}
            />
          ))}
        </Section>
      )}

      {counts.eventos > 0 && (
        <Section title={`Sonhos e eventos (${counts.eventos})`}>
          {extracted.eventos.map((e, i) => (
            <DetailRow
              key={i}
              label={e.descricao}
              value={`${e.valor >= 0 ? '+' : '−'} R$ ${Math.abs(e.valor).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} · ${
                e.recorrencia === 'unico'
                  ? `idade ${e.idade_inicio}`
                  : e.recorrencia === 'recorrente_anual'
                    ? `todo ano · ${e.idade_inicio}–${e.idade_fim ?? '?'}`
                    : `a cada ${e.intervalo_anos} anos · ${e.idade_inicio}–${e.idade_fim ?? '?'}`
              }`}
            />
          ))}
        </Section>
      )}

      {counts.ativos > 0 && (
        <Section title={`Ativos (${counts.ativos})`}>
          {extracted.ativos.map((a, i) => (
            <DetailRow
              key={i}
              label={a.nome}
              value={`R$ ${a.valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}${a.valorizacao_aa_pct != null ? ` · ${a.valorizacao_aa_pct > 0 ? '+' : ''}${a.valorizacao_aa_pct}% a.a.` : ''}`}
            />
          ))}
        </Section>
      )}

      {extracted.observacoes && extracted.observacoes.length > 0 && (
        <Section title="Observações pra revisar">
          {extracted.observacoes.map((o, i) => (
            <p key={i} className="text-xs text-amber-700 dark:text-amber-400 px-3 py-2 rounded bg-amber-50/60 dark:bg-amber-950/30">
              ⚠ {o}
            </p>
          ))}
        </Section>
      )}

      <div className="flex items-center justify-between gap-3 sticky bottom-0 bg-slate-50 dark:bg-slate-950 -mx-6 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
        <Button variant="ghost" size="md" onClick={onBack}>
          Voltar pra editar transcrição
        </Button>
        <Button size="md" onClick={onConfirm}>
          <Sparkles size={14} />
          Usar e revisar no wizard
        </Button>
      </div>
    </div>
  );
}

function KPI({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-center">
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
        {label}
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
        {title}
      </p>
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
        {children}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className={`px-3 py-2 ${multiline ? 'space-y-1' : 'flex items-center justify-between gap-3'}`}>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">{label}</p>
      <p className={`text-sm text-slate-900 dark:text-slate-100 ${multiline ? '' : 'text-right truncate'}`}>
        {value}
      </p>
    </div>
  );
}
