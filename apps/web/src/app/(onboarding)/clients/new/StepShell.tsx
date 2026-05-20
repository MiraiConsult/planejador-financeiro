import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface Props {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function StepShell({ eyebrow, title, description, children }: Props) {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600">
          {eyebrow}
        </p>
        <h1 className="text-display-sm font-bold tracking-tight text-slate-900 text-balance">
          {title}
        </h1>
        <p className="text-sm text-slate-500 max-w-xl leading-relaxed text-pretty">
          {description}
        </p>
      </header>
      {children}
    </div>
  );
}

interface RadioCardProps {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
  badge?: string;
  className?: string;
}

export function RadioCard({ selected, onSelect, title, description, badge, className }: RadioCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'relative text-left p-5 rounded-2xl border-2 transition-all',
        selected
          ? 'border-brand-500 bg-brand-50/40 shadow-glow'
          : 'border-slate-200 bg-white hover:border-slate-300',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <span className={cn('font-semibold', selected ? 'text-brand-700' : 'text-slate-900')}>
          {title}
        </span>
        {badge && (
          <span
            className={cn(
              'text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-md',
              selected ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500',
            )}
          >
            {badge}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
      <div
        className={cn(
          'absolute top-3 right-3 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all',
          selected ? 'border-brand-600 bg-brand-600' : 'border-slate-300 bg-white',
        )}
      >
        {selected && <div className="h-2 w-2 rounded-full bg-white" />}
      </div>
    </button>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center bg-slate-50/30">
      <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400">
        <Icon size={20} />
      </div>
      <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">{description}</p>
      {action}
    </div>
  );
}
