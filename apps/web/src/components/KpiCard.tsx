import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Props {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: 'default' | 'positive' | 'negative' | 'brand';
  trend?: 'up' | 'down' | 'flat';
}

const tones: Record<
  NonNullable<Props['tone']>,
  { value: string; iconBg: string; iconFg: string; accent: string }
> = {
  default: {
    value: 'text-slate-900',
    iconBg: 'bg-slate-100',
    iconFg: 'text-slate-600',
    accent: 'from-slate-300/0 via-slate-300 to-slate-300/0',
  },
  positive: {
    value: 'text-emerald-700',
    iconBg: 'bg-emerald-50',
    iconFg: 'text-emerald-600',
    accent: 'from-emerald-300/0 via-emerald-400 to-emerald-300/0',
  },
  negative: {
    value: 'text-red-700',
    iconBg: 'bg-red-50',
    iconFg: 'text-red-600',
    accent: 'from-red-300/0 via-red-400 to-red-300/0',
  },
  brand: {
    value: 'text-slate-900',
    iconBg: 'bg-brand-50',
    iconFg: 'text-brand-600',
    accent: 'from-brand-300/0 via-brand-500 to-brand-300/0',
  },
};

const trendIcons = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus };

export function KpiCard({ label, value, hint, icon: Icon, tone = 'default', trend }: Props) {
  const t = tones[tone];
  const TrendIcon = trend ? trendIcons[trend] : null;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-6 shadow-soft transition-all hover:shadow-soft-lg hover:-translate-y-0.5">
      {/* top accent line */}
      <div className={cn('absolute top-0 inset-x-0 h-px bg-gradient-to-r', t.accent)} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              {label}
            </p>
            {TrendIcon && (
              <TrendIcon
                size={12}
                className={cn(
                  trend === 'up' && 'text-emerald-500',
                  trend === 'down' && 'text-red-500',
                  trend === 'flat' && 'text-slate-400',
                )}
              />
            )}
          </div>
          <p
            className={cn(
              'mt-2.5 text-xl xl:text-[22px] font-bold tabular-nums tracking-tight leading-tight whitespace-nowrap',
              t.value,
            )}
          >
            {value}
          </p>
          {hint && <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">{hint}</p>}
        </div>
        {Icon && (
          <div
            className={cn(
              'h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-inset ring-black/[0.03]',
              t.iconBg,
              t.iconFg,
            )}
          >
            <Icon size={16} strokeWidth={2.25} />
          </div>
        )}
      </div>
    </div>
  );
}
