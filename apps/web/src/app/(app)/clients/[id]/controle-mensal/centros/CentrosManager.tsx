'use client';

import { useState, useTransition, useMemo } from 'react';
import {
  Plus, Edit3, Trash2, ChevronUp, ChevronDown, Eye, EyeOff,
  Sparkles, FolderTree, Tag,
} from 'lucide-react';
import * as Lucide from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { toast } from '@/components/ui/Toast';
import {
  type Centro, type CentroNode, type TipoVisual, type TemplateCentro,
  buildTree, flatten, TEMPLATES, ICONES_DISPONIVEIS, CORES_DISPONIVEIS,
} from '@/lib/controle-mensal/centros';
import {
  criarCentro, atualizarCentro, excluirCentro, reordenarCentros, aplicarTemplate,
  type CentroInput,
} from './actions';

function Icone({ nome, size = 14 }: { nome: string; size?: number }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Cmp = (Lucide as any)[nome] ?? Tag;
  return <Cmp size={size} />;
}

const TIPO_VISUAL_LABEL: Record<TipoVisual, string> = {
  pessoa: 'Pessoa',
  empresa: 'Empresa',
  projeto: 'Projeto',
  grupo: 'Grupo (agrupa filhos)',
  outro: 'Outro',
};

interface Props {
  clientId: string;
  centros: Centro[];
}

interface FormState {
  modo: 'criar' | 'editar';
  centro?: Centro;
  parent_id: string | null;
}

export function CentrosManager({ clientId, centros }: Props) {
  const [form, setForm] = useState<FormState | null>(null);
  const [template, setTemplate] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const tree = useMemo(() => buildTree(centros), [centros]);
  const flat = useMemo(() => flatten(tree), [tree]);
  const ativos = centros.filter((c) => c.ativo);
  const inativos = centros.filter((c) => !c.ativo);

  function abrirCriar(parentId: string | null = null): void {
    setForm({ modo: 'criar', parent_id: parentId });
  }
  function abrirEditar(c: Centro): void {
    setForm({ modo: 'editar', centro: c, parent_id: c.parent_id });
  }

  function reorder(node: CentroNode, dir: -1 | 1): void {
    // Pega irmãos (mesmo parent_id), troca posição.
    const irmaos = flat.filter((n) => n.parent_id === node.parent_id).sort((a, b) => a.ordem - b.ordem);
    const idx = irmaos.findIndex((n) => n.id === node.id);
    const novo = idx + dir;
    if (novo < 0 || novo >= irmaos.length) return;
    const swapped = [...irmaos];
    const [a, b] = [swapped[idx], swapped[novo]];
    if (a && b) { swapped[idx] = b; swapped[novo] = a; }
    start(async () => {
      const res = await reordenarCentros(clientId, swapped.map((n) => n.id));
      if (!res.ok) toast.error(res.erro ?? 'Falha ao reordenar');
    });
  }

  function toggleAtivo(c: Centro): void {
    start(async () => {
      const res = await atualizarCentro(clientId, c.id, { ativo: !c.ativo });
      if (!res.ok) toast.error(res.erro ?? 'Falha ao atualizar');
    });
  }

  function excluir(c: Centro): void {
    if (!confirm(`Excluir "${c.nome}"?\n\nSe houver lançamentos vinculados, o centro será desativado (não apagado) pra preservar histórico.`)) return;
    start(async () => {
      const res = await excluirCentro(clientId, c.id);
      if (res.ok) toast.success(`"${c.nome}" excluído`);
      else toast.error(res.erro ?? 'Falha ao excluir');
    });
  }

  function aplicar(): void {
    if (!template) return;
    start(async () => {
      const res = await aplicarTemplate(clientId, template);
      if (res.ok) {
        toast.success('Template aplicado');
        setTemplate(null);
      } else {
        toast.error(res.erro ?? 'Falha ao aplicar');
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* ─── Toolbar ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {ativos.length} {ativos.length === 1 ? 'centro ativo' : 'centros ativos'}
          {inativos.length > 0 && ` · ${inativos.length} inativo${inativos.length === 1 ? '' : 's'}`}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setTemplate('solo')}>
            <Sparkles size={13} />
            Aplicar template
          </Button>
          <Button variant="primary" size="sm" onClick={() => abrirCriar(null)}>
            <Plus size={13} />
            Novo centro
          </Button>
        </div>
      </div>

      {/* ─── Árvore ──────────────────────────────────────────────── */}
      {ativos.length === 0 ? (
        <Card>
          <CardContent>
            <div className="text-center py-10 space-y-3">
              <FolderTree size={28} className="mx-auto text-slate-300" />
              <p className="text-sm text-slate-600">Nenhum centro ainda.</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Comece com um template (pessoa solo, casal, empresa+pessoal) ou crie do zero.
              </p>
              <div className="flex justify-center gap-2 pt-2">
                <Button variant="secondary" size="sm" onClick={() => setTemplate('solo')}>
                  <Sparkles size={13} />
                  Template
                </Button>
                <Button variant="primary" size="sm" onClick={() => abrirCriar(null)}>
                  <Plus size={13} />
                  Criar do zero
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {flat.map((node) => (
                <LinhaCentro
                  key={node.id}
                  node={node}
                  onEditar={() => abrirEditar(node)}
                  onAdicionarFilho={() => abrirCriar(node.id)}
                  onExcluir={() => excluir(node)}
                  onUp={() => reorder(node, -1)}
                  onDown={() => reorder(node, 1)}
                  onToggleAtivo={() => toggleAtivo(node)}
                  disabled={pending}
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ─── Modal criar/editar ───────────────────────────────────── */}
      {form && (
        <CentroFormModal
          clientId={clientId}
          form={form}
          centros={flat}
          onClose={() => setForm(null)}
        />
      )}

      {/* ─── Modal template ───────────────────────────────────────── */}
      {template != null && (
        <Dialog
          open
          onClose={() => setTemplate(null)}
          size="lg"
          title="Aplicar template de centros"
          description="Escolhe a estrutura mais próxima do cliente. Os centros são adicionados aos existentes — você pode renomear e ajustar depois."
        >
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplate(t.id)}
                  className={`text-left p-3 rounded-lg border-2 transition-colors ${
                    template === t.id
                      ? 'border-brand-500 bg-brand-50/40 dark:bg-brand-950/30'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t.nome}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{t.descricao}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {flattenTpl(t.centros).map((c, i) => (
                      <span
                        key={`${c.nome}-${i}`}
                        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: `${c.cor}20`, color: c.cor }}
                      >
                        <Icone nome={c.icone} size={10} />
                        {c.nome}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="ghost" size="sm" onClick={() => setTemplate(null)}>Cancelar</Button>
              <Button variant="primary" size="sm" onClick={aplicar} disabled={pending}>
                {pending ? 'Aplicando…' : 'Aplicar'}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function flattenTpl(centros: TemplateCentro[]): TemplateCentro[] {
  const out: TemplateCentro[] = [];
  const walk = (n: TemplateCentro): void => {
    out.push(n);
    n.filhos?.forEach(walk);
  };
  centros.forEach(walk);
  return out;
}

function LinhaCentro({
  node, onEditar, onAdicionarFilho, onExcluir, onUp, onDown, onToggleAtivo, disabled,
}: {
  node: CentroNode;
  onEditar: () => void;
  onAdicionarFilho: () => void;
  onExcluir: () => void;
  onUp: () => void;
  onDown: () => void;
  onToggleAtivo: () => void;
  disabled: boolean;
}) {
  return (
    <li
      className={`flex items-center gap-3 px-4 py-2.5 ${node.ativo ? '' : 'opacity-50'}`}
      style={{ paddingLeft: `${16 + node.depth * 24}px` }}
    >
      <span
        className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${node.cor}22`, color: node.cor }}
      >
        <Icone nome={node.icone} size={14} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
          {node.nome}
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          {TIPO_VISUAL_LABEL[node.tipo_visual]}
          {node.tem_demonstrativo && ' · demonstrativo'}
          {!node.ativo && ' · inativo'}
        </p>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <IconBtn title="Mover pra cima"   onClick={onUp}              disabled={disabled}><ChevronUp size={13} /></IconBtn>
        <IconBtn title="Mover pra baixo"  onClick={onDown}            disabled={disabled}><ChevronDown size={13} /></IconBtn>
        <IconBtn title="Adicionar filho"  onClick={onAdicionarFilho}  disabled={disabled}><Plus size={13} /></IconBtn>
        <IconBtn title="Editar"           onClick={onEditar}          disabled={disabled}><Edit3 size={13} /></IconBtn>
        <IconBtn
          title={node.ativo ? 'Desativar' : 'Reativar'}
          onClick={onToggleAtivo}
          disabled={disabled}
        >
          {node.ativo ? <Eye size={13} /> : <EyeOff size={13} />}
        </IconBtn>
        <IconBtn title="Excluir" onClick={onExcluir} disabled={disabled}>
          <Trash2 size={13} className="text-red-500" />
        </IconBtn>
      </div>
    </li>
  );
}

function IconBtn({ children, title, onClick, disabled }: {
  children: React.ReactNode; title: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-100 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────
// Modal de criar/editar centro
// ────────────────────────────────────────────────────────────────────

function CentroFormModal({
  clientId, form, centros, onClose,
}: {
  clientId: string;
  form: FormState;
  centros: CentroNode[];
  onClose: () => void;
}) {
  const editando = form.modo === 'editar';
  const init: CentroInput = editando && form.centro
    ? {
        nome: form.centro.nome,
        parent_id: form.centro.parent_id,
        tipo_visual: form.centro.tipo_visual,
        tem_demonstrativo: form.centro.tem_demonstrativo,
        cor: form.centro.cor,
        icone: form.centro.icone,
      }
    : {
        nome: '',
        parent_id: form.parent_id,
        tipo_visual: 'pessoa',
        tem_demonstrativo: false,
        cor: CORES_DISPONIVEIS[0]!,
        icone: 'Receipt',
      };

  const [dados, setDados] = useState<CentroInput>(init);
  const [pending, start] = useTransition();

  // Possíveis pais = todos exceto o próprio centro (e seus descendentes, pra evitar ciclo)
  const proibidos = useMemo(() => {
    if (!editando || !form.centro) return new Set<string>();
    const ban = new Set<string>();
    const walk = (id: string): void => {
      ban.add(id);
      centros.filter((c) => c.parent_id === id).forEach((c) => walk(c.id));
    };
    walk(form.centro.id);
    return ban;
  }, [editando, form.centro, centros]);

  function submeter(): void {
    if (!dados.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    start(async () => {
      const res = editando && form.centro
        ? await atualizarCentro(clientId, form.centro.id, dados)
        : await criarCentro(clientId, dados);
      if (res.ok) {
        toast.success(editando ? 'Centro atualizado' : 'Centro criado');
        onClose();
      } else {
        toast.error(res.erro ?? 'Falha ao salvar');
      }
    });
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="md"
      title={editando ? 'Editar centro' : 'Novo centro'}
      description="Defina nome, hierarquia, visual e se ele deve ter demonstrativo (receita − despesas)."
    >
      <div className="space-y-3">
        <Field label="Nome">
          <input
            autoFocus
            value={dados.nome}
            onChange={(e) => setDados({ ...dados, nome: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && submeter()}
            placeholder="Ex: Diego, Mirai, Família, Empresa X"
            className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <select
              value={dados.tipo_visual}
              onChange={(e) => setDados({ ...dados, tipo_visual: e.target.value as TipoVisual })}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {Object.entries(TIPO_VISUAL_LABEL).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="Centro pai (opcional)">
            <select
              value={dados.parent_id ?? ''}
              onChange={(e) => setDados({ ...dados, parent_id: e.target.value || null })}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">— (raiz)</option>
              {centros.filter((c) => !proibidos.has(c.id)).map((c) => (
                <option key={c.id} value={c.id}>
                  {'  '.repeat(c.depth)}{c.nome}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Cor">
          <div className="flex flex-wrap gap-1.5">
            {CORES_DISPONIVEIS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setDados({ ...dados, cor: c })}
                className={`h-7 w-7 rounded-md border-2 transition-all ${
                  dados.cor === c ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            ))}
          </div>
        </Field>

        <Field label="Ícone">
          <div className="grid grid-cols-12 gap-1.5 max-h-32 overflow-y-auto p-1">
            {ICONES_DISPONIVEIS.map((nome) => (
              <button
                key={nome}
                type="button"
                onClick={() => setDados({ ...dados, icone: nome })}
                className={`h-8 w-8 inline-flex items-center justify-center rounded-md border ${
                  dados.icone === nome
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
                title={nome}
              >
                <Icone nome={nome} size={14} />
              </button>
            ))}
          </div>
        </Field>

        <label className="flex items-start gap-2 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={dados.tem_demonstrativo}
            onChange={(e) => setDados({ ...dados, tem_demonstrativo: e.target.checked })}
            className="mt-0.5 rounded border-slate-300 dark:border-slate-600"
          />
          <div>
            <p className="text-sm text-slate-800 dark:text-slate-100">Mostrar demonstrativo</p>
            <p className="text-[11px] text-slate-500">
              Centro mostra Receita − Despesas = Líquido (ex: empresa, projeto que gera receita).
            </p>
          </div>
        </label>
      </div>

      <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>Cancelar</Button>
        <Button variant="primary" size="sm" onClick={submeter} disabled={pending}>
          {pending ? 'Salvando…' : editando ? 'Salvar' : 'Criar'}
        </Button>
      </div>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}
