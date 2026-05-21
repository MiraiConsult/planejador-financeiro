'use client';

import { Copy, Trash2 } from 'lucide-react';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { toast } from '@/components/ui/Toast';
import { undoDelete } from './actions';

type Entity = 'assets' | 'expenses' | 'events';

const labels: Record<Entity, { item: string; restored: string }> = {
  assets: { item: 'Ativo', restored: 'Ativo restaurado' },
  expenses: { item: 'Despesa', restored: 'Despesa restaurada' },
  events: { item: 'Evento', restored: 'Evento restaurado' },
};

/**
 * Botão Excluir que dispara a server action (soft delete) via formAction
 * e, ao concluir, mostra toast "Item excluído · Desfazer" por 6 segundos.
 *
 * Usar DENTRO de um form (o formAction sobrescreve o action do form pai).
 */
export function DeleteButtonWithUndo({
  entity,
  id,
  client_id,
  deleteAction,
  className,
}: {
  entity: Entity;
  id: string;
  client_id: string;
  deleteAction: (formData: FormData) => Promise<void>;
  className?: string;
}) {
  const { item, restored } = labels[entity];
  return (
    <SubmitButton
      formAction={deleteAction}
      variant="ghost"
      size="sm"
      className={className ?? 'text-red-600 hover:bg-red-50'}
      successCallback={() => {
        toast.withAction(
          `${item} excluído`,
          {
            label: 'Desfazer',
            onClick: async () => {
              const res = await undoDelete({ entity, id, client_id });
              if (res.ok) toast.success(restored);
              else toast.error('Não foi possível desfazer');
            },
          },
          { kind: 'success', durationMs: 6000 },
        );
      }}
    >
      <Trash2 size={13} />
      Excluir
    </SubmitButton>
  );
}

/**
 * Botão "Duplicar" embutido num form próprio que chama a action de
 * duplicação correspondente à entidade.
 */
export function DuplicateButton({
  duplicateAction,
  id,
  client_id,
}: {
  duplicateAction: (formData: FormData) => Promise<void>;
  id: string;
  client_id: string;
}) {
  return (
    <form action={duplicateAction} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="client_id" value={client_id} />
      <SubmitButton variant="ghost" size="sm" successMessage="Duplicado">
        <Copy size={13} />
        Duplicar
      </SubmitButton>
    </form>
  );
}
