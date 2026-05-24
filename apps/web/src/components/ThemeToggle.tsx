'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';

function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('theme') as Theme | null;
}

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(t: Theme) {
  document.documentElement.classList.toggle('dark', t === 'dark');
}

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const stored = getStoredTheme();
    const resolved = stored ?? getSystemTheme();
    setTheme(resolved);
    applyTheme(resolved);
  }, []);

  function toggle() {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    applyTheme(next);
    localStorage.setItem('theme', next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${className ?? ''}`}
      title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
    >
      {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
    </button>
  );
}
