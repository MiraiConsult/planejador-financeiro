'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LancamentoForm, type Sugestoes } from './LancamentoForm';

export function NovoLancamentoButton({ clientId, sugestoes }: { clientId: string; sugestoes: Sugestoes }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
        <Plus size={14} />
        Novo lançamento
      </Button>
      {open && (
        <LancamentoForm
          clientId={clientId}
          initial={null}
          onClose={() => setOpen(false)}
          sugestoes={sugestoes}
        />
      )}
    </>
  );
}
