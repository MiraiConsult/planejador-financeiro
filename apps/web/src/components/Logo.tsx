import Link from 'next/link';
import { cn } from '@/lib/cn';

interface Props {
  className?: string;
  href?: string;
}

export function Logo({ className, href = '/clients' }: Props) {
  const inner = (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="relative">
        {/* Mark: gráfico crescente estilizado */}
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="url(#logo-gradient)" />
          <path
            d="M8 22L13 17L17 20L24 10"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="24" cy="10" r="1.5" fill="white" />
          <defs>
            <linearGradient id="logo-gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3b82f6" />
              <stop offset="1" stopColor="#2563eb" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-bold text-slate-900">Planejador</span>
        <span className="text-[10px] uppercase tracking-widest text-slate-500">MC Castro</span>
      </div>
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}
