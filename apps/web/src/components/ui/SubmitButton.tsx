'use client';

import { useEffect, useRef, type ComponentProps, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { Button } from './Button';
import { toast } from './Toast';

/**
 * Componente invisível que emite toast.success(successMessage) quando o
 * server action do form pai termina. Use quando você não pode/não quer
 * substituir o botão de submit (ex: botão custom com layout próprio).
 */
export function ToastOnSubmit({ successMessage }: { successMessage: string }) {
  const { pending } = useFormStatus();
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending) toast.success(successMessage);
    wasPending.current = pending;
  }, [pending, successMessage]);
  return null;
}

type ButtonProps = ComponentProps<typeof Button>;

interface Props extends Omit<ButtonProps, 'type'> {
  /** Mensagem do toast de sucesso após o action terminar. Vazio = sem toast. */
  successMessage?: string;
  /** Conteúdo do botão (texto + ícones). */
  children: ReactNode;
}

/**
 * Botão de submit que:
 *  - mostra spinner enquanto o server action está pendente
 *  - emite toast.success(successMessage) quando o action conclui
 *
 * Precisa estar DENTRO de um <form action={serverAction}>.
 * Se o action lançar, Next mostra o overlay/error — não chamamos success.
 */
export function SubmitButton({ successMessage, children, disabled, ...rest }: Props) {
  const { pending } = useFormStatus();
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending) {
      if (successMessage) toast.success(successMessage);
    }
    wasPending.current = pending;
  }, [pending, successMessage]);

  return (
    <Button type="submit" disabled={pending || disabled} {...rest}>
      {pending && <Loader2 size={13} className="animate-spin" />}
      {children}
    </Button>
  );
}
