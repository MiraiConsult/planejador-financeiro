'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  Building2,
  CalendarRange,
  Edit3,
  GitCompare,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings2,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { cn } from '@/lib/cn';

export interface CurrentClient {
  id: string;
  nome: string;
  tem_bp: boolean;
  tem_cm: boolean;
  bp_pendente: boolean;
  cm_pendente: boolean;
}

interface Props {
  userEmail: string;
  signOutAction: () => void;
  currentClient?: CurrentClient | null;
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

export function Sidebar({ userEmail, signOutAction, currentClient }: Props) {
  const pathname = usePathname();
  const clientItems = currentClient ? buildClientItems(currentClient) : [];

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

      <nav className="flex-1 px-3 space-y-6 overflow-y-auto scrollbar-thin pb-4">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon, disabled, badge }) => {
                const active =
                  // "Clientes" não fica ativo quando estamos dentro de um cliente
                  // (a seção "Cliente atual" assume o destaque)
                  href === '/clients' && currentClient
                    ? false
                    : pathname === href || pathname.startsWith(href + '/');
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

        {currentClient && clientItems.length > 0 && (
          <div>
            <div className="px-3 mb-2 flex items-center justify-between gap-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 truncate">
                Cliente atual
              </p>
              <Link
                href="/clients"
                className="text-[10px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 inline-flex items-center gap-0.5"
                title="Voltar para lista de clientes"
              >
                <ArrowLeft size={10} />
                lista
              </Link>
            </div>
            <div className="px-3 mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100 truncate" title={currentClient.nome}>
              {currentClient.nome}
            </div>
            <div className="space-y-0.5">
              {clientItems.map(({ href, label, icon: Icon, badge }) => {
                const active = pathname === href || pathname.startsWith(href + '/');
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
                    <span className="flex-1 truncate">{label}</span>
                    {badge && (
                      <span className={cn(
                        'text-[10px] font-semibold px-1.5 py-0.5 rounded-md',
                        active ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700',
                      )}>
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
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

interface ClientNavItem {
  href: string;
  label: string;
  icon: typeof Users;
  badge?: string;
}

function buildClientItems(c: CurrentClient): ClientNavItem[] {
  const base = `/clients/${c.id}`;
  const items: ClientNavItem[] = [];
  if (c.tem_bp) {
    items.push({
      href: `${base}/balanco`,
      label: 'Balanço Patrimonial',
      icon: Wallet,
      badge: c.bp_pendente ? 'pendente' : undefined,
    });
  }
  if (c.tem_cm) {
    items.push({
      href: `${base}/controle-mensal`,
      label: 'Controle Mensal',
      icon: CalendarRange,
      badge: c.cm_pendente ? 'pendente' : undefined,
    });
    items.push({
      href: `${base}/controle-mensal/dados-cadastrais`,
      label: 'Dados Cadastrais',
      icon: BookOpen,
    });
    items.push({
      href: `${base}/controle-mensal/bancos`,
      label: 'Bancos',
      icon: Building2,
    });
  }
  if (c.tem_bp && !c.bp_pendente) {
    items.push({
      href: `${base}/compare`,
      label: 'Comparar cenários',
      icon: GitCompare,
    });
    items.push({
      href: `${base}/transcript`,
      label: 'Refinar transcrição',
      icon: MessageSquare,
    });
    items.push({
      href: `${base}/edit`,
      label: 'Editar dados',
      icon: Edit3,
    });
  }
  return items;
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
