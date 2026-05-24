'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Settings2, LogOut, HelpCircle, Sparkles } from 'lucide-react';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { cn } from '@/lib/cn';

interface Props {
  userEmail: string;
  signOutAction: () => void;
}

const navSections: {
  title: string;
  items: { href: string; label: string; icon: typeof Users; disabled?: boolean; badge?: string }[];
}[] = [
  {
    title: 'Principal',
    items: [
      { href: '/overview', label: 'Visão geral', icon: LayoutDashboard },
      { href: '/clients', label: 'Clientes', icon: Users },
    ],
  },
  {
    title: 'Configuração',
    items: [
      { href: '/settings', label: 'Premissas', icon: Settings2 },
    ],
  },
];

export function Sidebar({ userEmail, signOutAction }: Props) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-slate-200/70 bg-white/70 backdrop-blur-sm sticky top-0 h-screen dark:border-slate-700/70 dark:bg-slate-900/70">
      <div className="px-6 py-5 flex items-center justify-between">
        <Logo />
        <ThemeToggle />
      </div>

      <div className="px-3 mb-3">
        <Link
          href="/clients"
          className="group flex items-center justify-between gap-2 rounded-xl bg-gradient-to-br from-brand-50 via-brand-50 to-sky-50 px-3 py-2.5 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200/50 hover:ring-brand-300 transition-all"
        >
          <span className="flex items-center gap-2">
            <Sparkles size={12} className="text-brand-500" />
            Plano Beta
          </span>
          <span className="text-[10px] uppercase tracking-wider text-brand-500">Free</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-6 overflow-y-auto scrollbar-thin">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon, disabled, badge }) => {
                const active = pathname === href || pathname.startsWith(href + '/');
                if (disabled) {
                  return (
                    <div
                      key={href}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 cursor-not-allowed"
                      title="Em breve"
                    >
                      <Icon size={15} strokeWidth={2} />
                      <span className="flex-1">{label}</span>
                      <span className="text-[9px] uppercase tracking-wider text-slate-300 font-medium">
                        soon
                      </span>
                    </div>
                  );
                }
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                      active
                        ? 'bg-brand-600 text-white shadow-sm dark:bg-brand-500'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
                    )}
                  >
                    <Icon size={15} strokeWidth={2} />
                    <span className="flex-1">{label}</span>
                    {badge && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-brand-100 text-brand-700">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200/70 dark:border-slate-700/70 p-3 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50/80 ring-1 ring-inset ring-slate-200/60 dark:bg-slate-800/80 dark:ring-slate-700/60">
          <div className="relative">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-400 text-white text-sm font-semibold shadow-sm">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{userEmail}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Consultor</p>
          </div>
        </div>
        <a
          href="https://github.com/anthropics/claude-code/issues"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <HelpCircle size={14} />
          <span>Ajuda & feedback</span>
        </a>
        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-500 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <LogOut size={14} />
            <span>Sair</span>
          </button>
        </form>
      </div>
    </aside>
  );
}

export function MobileTopBar({ userEmail, signOutAction }: Props) {
  return (
    <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/70 bg-white/80 backdrop-blur-md px-4 py-3 dark:border-slate-700/70 dark:bg-slate-900/80">
      <Logo />
      <form action={signOutAction}>
        <button
          type="submit"
          className="flex items-center gap-2 text-sm text-slate-500 px-2 py-1"
          title={`Sair (${userEmail})`}
        >
          <LogOut size={16} />
        </button>
      </form>
    </div>
  );
}
