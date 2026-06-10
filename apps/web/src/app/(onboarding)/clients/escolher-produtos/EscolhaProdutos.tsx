'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Wallet,
  CalendarRange,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { criarClienteComProdutos } from './actions';

type Produto = 'balanco' | 'controle_mensal';

export function EscolhaProdutos() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [dataNasc, setDataNasc] = useState('');
  const [produtos, setProdutos] = useState<Set<Produto>>(new Set());
  const [pending, start] = useTransition();

  function toggleProduto(p: Produto) {
    setProdutos((s) => {
      const n = new Set(s);
      if (n.has(p)) n.delete(p);
      else n.add(p);
      return n;
    });
  }

  function handleContinuar() {
    if (!nome.trim()) {
      toast.error('Informe o nome do cliente');
      return;
    }
    if (!dataNasc) {
      toast.error('Informe a data de nascimento');
      return;
    }
    if (produtos.size === 0) {
      toast.error('Selecione ao menos um produto');
      return;
    }

    start(async () => {
      const res = await criarClienteComProdutos({
        nome_completo: nome,
        data_nascimento: dataNasc,
        tem_balanco_patrimonial: produtos.has('balanco'),
        tem_controle_mensal: produtos.has('controle_mensal'),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.push(res.first_onboarding_url);
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo />
          <Link href="/clients">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={14} />
              Cancelar
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
            Novo cliente
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            Quem é o cliente e o que ele contratou?
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Você pode adicionar mais produtos depois. Cada um tem seu próprio onboarding.
          </p>
        </div>

        {/* Identificação */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Identificação
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="space-y-1.5 block">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Nome completo
              </span>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Maria Silva"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              />
            </label>
            <label className="space-y-1.5 block">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Data de nascimento
              </span>
              <input
                type="date"
                value={dataNasc}
                onChange={(e) => setDataNasc(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              />
            </label>
          </div>
        </section>

        {/* Produtos */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Produtos contratados
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <ProdutoCard
              titulo="Balanço Patrimonial"
              descricao="Planejamento de longo prazo: ativos, despesas, eventos, projeção de vida toda."
              icon={<Wallet size={20} />}
              ativo={produtos.has('balanco')}
              onClick={() => toggleProduto('balanco')}
            />
            <ProdutoCard
              titulo="Controle Mensal"
              descricao="Gestão do realizado mês a mês: lançamentos, categorias, centros, importação de extratos."
              icon={<CalendarRange size={20} />}
              ativo={produtos.has('controle_mensal')}
              onClick={() => toggleProduto('controle_mensal')}
            />
          </div>
        </section>

        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {produtos.size === 0
              ? 'Selecione ao menos um produto'
              : produtos.size === 1
                ? '1 produto selecionado — você fará o onboarding desse produto agora'
                : '2 produtos selecionados — você fará os onboardings em sequência, começando pelo Balanço'}
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={handleContinuar}
            disabled={pending || !nome.trim() || !dataNasc || produtos.size === 0}
          >
            {pending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <>
                Continuar
                <ArrowRight size={14} />
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}

function ProdutoCard({
  titulo,
  descricao,
  icon,
  ativo,
  onClick,
}: {
  titulo: string;
  descricao: string;
  icon: React.ReactNode;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-4 rounded-2xl border-2 transition-all ${
        ativo
          ? 'border-brand-500 bg-brand-50/40 dark:bg-brand-950/30'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
            ativo
              ? 'bg-brand-500 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
          }`}
        >
          {icon}
        </div>
        {ativo && (
          <div className="h-6 w-6 rounded-full bg-brand-500 text-white flex items-center justify-center">
            <Check size={13} strokeWidth={3} />
          </div>
        )}
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
        {titulo}
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
        {descricao}
      </p>
    </button>
  );
}
