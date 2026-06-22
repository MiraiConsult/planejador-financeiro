'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  CalendarRange,
  HelpCircle,
  Home,
  LayoutDashboard,
  LogOut,
  Settings2,
  UserCircle,
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
  /** true quando o usuário logado é o próprio cliente final (visão restrita). */
  clientMode?: boolean;
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
      { href: '/account', label: 'Minha conta', icon: UserCircle },
    ],
  },
];

const clientGlobalSection = {
  title: 'Conta',
  items: [{ href: '/account', label: 'Minha conta', icon: UserCircle }],
};

export function Sidebar({ userEmail, signOutAction, currentClient, clientMode = false }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab');
  const clientGroups = currentClient ? buildClientGroups(currentClient) : [];
  // Cliente final não vê o menu global de consultor (Visão geral, Clientes, Premissas)
  const sectionsToShow = clientMode ? [] : navSections;

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-slate-200/70 bg-white/70 backdrop-blur-sm sticky top-0 h-screen dark:border-slate-700/70 dark:bg-slate-900/70">
      <div className="px-6 py-5 flex items-center justify-between">
        <Logo />
        <ThemeToggle />
      </div>

      <div className="px-3 mb-3">
        <Link
          href={
            clientMode && currentClient
              ? `/clients/${currentClient.id}/inicio`
              : '/clients'
          }
          className="group flex items-center gap-2 rounded-xl bg-gradient-to-br from-brand-50 via-brand-50 to-sky-50 px-3 py-2.5 text-sm font-semibold text-brand-700 ring-1 ring-inset ring-brand-200/50 hover:ring-brand-300 transition-all dark:from-brand-900/30 dark:via-brand-900/20 dark:to-sky-900/20 dark:text-brand-200 dark:ring-brand-700/40"
        >
          <Home size={14} className="text-brand-600 dark:text-brand-300" />
          <span>Início</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-6 overflow-y-auto scrollbar-thin pb-4">
        {sectionsToShow.map((section) => (
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

        {currentClient && clientGroups.length > 0 && (
          <div className="space-y-5">
            <div>
              <div className="px-3 mb-2 flex items-center justify-between gap-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 truncate">
                  {clientMode ? 'Meu painel' : 'Cliente atual'}
                </p>
                {!clientMode && (
                  <Link
                    href="/clients"
                    className="text-[10px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 inline-flex items-center gap-0.5"
                    title="Voltar para lista de clientes"
                  >
                    <ArrowLeft size={10} />
                    lista
                  </Link>
                )}
              </div>
              <div className="px-3 text-sm font-semibold text-slate-900 dark:text-slate-100 truncate" title={currentClient.nome}>
                {currentClient.nome}
              </div>
            </div>

            {clientGroups.map((group) => {
              const headerActive =
                pathname === group.header.href ||
                (group.header.href && pathname.startsWith(group.header.href + '/')) ||
                group.children.some((c) => pathname === c.hrefPath);
              return (
                <div key={group.header.label} className="space-y-0.5">
                  {/* Header do grupo (principal) */}
                  <Link
                    href={group.header.href}
                    className={cn(
                      'relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all',
                      headerActive
                        ? 'bg-brand-600 text-white shadow-sm dark:bg-brand-500'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100',
                    )}
                  >
                    <group.header.icon size={16} strokeWidth={2.2} />
                    <span className="flex-1 truncate">{group.header.label}</span>
                    {group.header.badge && (
                      <span className={cn(
                        'text-[10px] font-semibold px-1.5 py-0.5 rounded-md',
                        headerActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700',
                      )}>
                        {group.header.badge}
                      </span>
                    )}
                  </Link>

                  {/* Filhos do grupo (indentados) */}
                  {group.children.length > 0 && (
                    <div className="ml-3 pl-4 border-l border-slate-200 dark:border-slate-700 space-y-0.5">
                      {group.children.map((child) => {
                        const onPath = pathname === child.hrefPath;
                        const active = child.tab
                          ? onPath && currentTab === child.tab
                          : onPath && !currentTab;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              'flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] transition-colors',
                              active
                                ? 'bg-slate-100 text-slate-900 font-medium dark:bg-slate-800 dark:text-slate-100'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100',
                            )}
                          >
                            <span className="h-1 w-1 rounded-full bg-current opacity-60" />
                            <span className="truncate">{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {clientMode && (
          <div>
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {clientGlobalSection.title}
            </p>
            <div className="space-y-0.5">
              {clientGlobalSection.items.map(({ href, label, icon: Icon }) => {
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
                    <span className="flex-1">{label}</span>
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
            <p className="text-[10px] text-slate-500 dark:text-slate-400">{clientMode ? 'Cliente' : 'Administrador'}</p>
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

interface ClientNavGroup {
  header: { href: string; label: string; icon: typeof Users; badge?: string };
  children: { href: string; hrefPath: string; tab?: string; label: string }[];
}

function buildClientGroups(c: CurrentClient): ClientNavGroup[] {
  const base = `/clients/${c.id}`;
  const groups: ClientNavGroup[] = [];

  if (c.tem_bp) {
    const bpReady = !c.bp_pendente;
    groups.push({
      header: {
        href: `${base}/balanco`,
        label: 'Balanço Patrimonial',
        icon: Wallet,
        badge: c.bp_pendente ? 'pendente' : undefined,
      },
      children: bpReady
        ? [
            { href: `${base}/balanco`, hrefPath: `${base}/balanco`, label: 'Dashboard' },
            { href: `${base}/perfil`, hrefPath: `${base}/perfil`, label: 'Perfil do cliente' },
            { href: `${base}/simulador`, hrefPath: `${base}/simulador`, label: 'Simulador interativo' },
            { href: `${base}/compare`, hrefPath: `${base}/compare`, label: 'Comparar cenários' },
            { href: `${base}/transcript`, hrefPath: `${base}/transcript`, label: 'Refinar transcrição' },
            { href: `${base}/edit`, hrefPath: `${base}/edit`, label: 'Editar dados' },
          ]
        : [
            { href: `${base}/perfil`, hrefPath: `${base}/perfil`, label: 'Perfil do cliente' },
          ],
    });
  }

  if (c.tem_cm) {
    const dados = `${base}/controle-mensal/dados-cadastrais`;
    groups.push({
      header: {
        href: `${base}/controle-mensal`,
        label: 'Controle Financeiro',
        icon: CalendarRange,
        badge: c.cm_pendente ? 'pendente' : undefined,
      },
      children: [
        { href: `${base}/controle-mensal`, hrefPath: `${base}/controle-mensal`, label: 'Dashboard' },
        { href: `${base}/controle-mensal/lancamentos`, hrefPath: `${base}/controle-mensal/lancamentos`, label: 'Lançamentos' },
        { href: `${dados}?tab=plano`, hrefPath: dados, tab: 'plano', label: 'Plano de contas' },
        { href: `${dados}?tab=centros`, hrefPath: dados, tab: 'centros', label: 'Centros' },
        { href: `${base}/controle-mensal/bancos`, hrefPath: `${base}/controle-mensal/bancos`, label: 'Bancos' },
      ],
    });
  }

  return groups;
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
