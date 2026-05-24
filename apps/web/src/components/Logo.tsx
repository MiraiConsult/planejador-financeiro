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
        {/* Símbolo MC Castro — "M" estilizado em ponte */}
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="url(#mc-gradient)" />
          <path
            d="M7 22V12L12.5 17L16 13L19.5 17L25 12V22"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M10 24C13 21 19 21 22 24"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.5"
          />
          <defs>
            <linearGradient id="mc-gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop stopColor="#2B5EA7" />
              <stop offset="1" stopColor="#4B8BCB" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Planejador</span>
        <span className="text-[10px] uppercase tracking-widest text-brand-600 dark:text-brand-400">MC Castro</span>
      </div>
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}
