import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/cn';

interface Props {
  className?: string;
  href?: string;
  /** Mostrar só o símbolo (sem texto) pra mobile */
  compact?: boolean;
}

export function Logo({ className, href = '/clients', compact = false }: Props) {
  const inner = (
    <div className={cn('flex items-center gap-2.5', className)}>
      {compact ? (
        <Image
          src="/logo-symbol.png"
          alt="MC Castro"
          width={32}
          height={32}
          className="dark:brightness-0 dark:invert"
          priority
        />
      ) : (
        <Image
          src="/logo-light.png"
          alt="MC Castro — Negócios · Consultoria · Educação"
          width={140}
          height={40}
          className="dark:brightness-0 dark:invert h-8 w-auto"
          priority
        />
      )}
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}
