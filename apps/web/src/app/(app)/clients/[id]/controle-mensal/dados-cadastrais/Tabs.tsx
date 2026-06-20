'use client';

import { useState, type ReactNode } from 'react';
import { BookOpen, Layers } from 'lucide-react';

export function DadosCadastraisTabs({
  planoDeContas,
  centros,
  defaultTab = 'plano',
}: {
  planoDeContas: ReactNode;
  centros: ReactNode;
  defaultTab?: 'plano' | 'centros';
}) {
  const [tab, setTab] = useState<'plano' | 'centros'>(defaultTab);
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-6">
          <TabButton active={tab === 'plano'} onClick={() => setTab('plano')} icon={<BookOpen size={14} />}>
            Plano de Contas
          </TabButton>
          <TabButton active={tab === 'centros'} onClick={() => setTab('centros')} icon={<Layers size={14} />}>
            Centros
          </TabButton>
        </nav>
      </div>

      <div>
        {tab === 'plano' && planoDeContas}
        {tab === 'centros' && centros}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-1 pb-3 border-b-2 text-sm font-medium transition-colors ${
        active
          ? 'border-brand-600 text-brand-700'
          : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
