import { TrendingUp, ShieldCheck, LineChart, Sparkles } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { signIn, signUp } from '../(auth)/actions';

type SearchParams = Promise<{ error?: string; mode?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { error, mode } = await searchParams;
  const isSignup = mode === 'signup';

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-white">
      {/* Hero side */}
      <div className="hidden lg:flex relative overflow-hidden p-12 flex-col justify-between text-white bg-slate-950">
        {/* Mesh background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.4),transparent_50%),radial-gradient(circle_at_80%_30%,rgba(139,92,246,0.3),transparent_50%),radial-gradient(circle_at_50%_90%,rgba(59,130,246,0.2),transparent_50%)]" />
          <div className="absolute inset-0 bg-grid opacity-[0.04]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-brand-500/10 blur-3xl" />
        </div>

        <div className="relative">
          <Logo href="" className="[&_span:first-child]:text-white [&_span:last-child]:text-slate-400" />
        </div>

        <div className="relative space-y-8 max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300 ring-1 ring-inset ring-white/10 backdrop-blur">
            <Sparkles size={12} className="text-brand-400" />
            <span>Beta — versão 0.1</span>
          </div>
          <h1 className="text-display-lg font-bold leading-[1.05] tracking-tight text-balance">
            Planejamento financeiro de longo prazo,
            <span className="block bg-gradient-to-r from-brand-300 via-brand-400 to-sky-400 bg-clip-text text-transparent">
              sem planilha.
            </span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed text-pretty">
            Cadastre clientes, projete fluxo de caixa até a aposentadoria, compare cenários
            e visualize o impacto de cada decisão.
          </p>

          <div className="space-y-3 pt-2">
            {[
              { icon: TrendingUp, text: 'Simulação ano-a-ano automatizada' },
              { icon: LineChart, text: 'Múltiplos cenários e sensibilidade' },
              { icon: ShieldCheck, text: 'Dados isolados por consultor (RLS)' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm">
                <div className="h-9 w-9 rounded-lg bg-white/5 ring-1 ring-inset ring-white/10 flex items-center justify-center backdrop-blur">
                  <Icon size={15} className="text-brand-300" />
                </div>
                <span className="text-slate-300">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-slate-500">
          © {new Date().getFullYear()} MC Castro Consultoria Financeira
        </p>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center p-6 lg:p-12 bg-gradient-to-b from-slate-50/50 to-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-10 flex justify-center">
            <Logo href="" />
          </div>

          <div className="space-y-2 mb-8">
            <h2 className="text-display-sm font-bold text-slate-900 tracking-tight">
              {isSignup ? 'Crie sua conta' : 'Bem-vindo de volta'}
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              {isSignup
                ? 'Cadastre-se como consultor para começar a planejar.'
                : 'Acesse seu painel de clientes.'}
            </p>
          </div>

          <form action={isSignup ? signUp : signIn} className="space-y-4">
            {isSignup && (
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Nome completo</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Diego Castro"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="seu@email.com"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                {!isSignup && (
                  <span className="text-[10px] text-slate-400">mínimo 6 caracteres</span>
                )}
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-xs text-red-700 bg-red-50 border border-red-200/80 rounded-lg px-3 py-2.5 leading-relaxed">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full mt-6">
              {isSignup ? 'Criar conta' : 'Entrar'}
            </Button>

            <p className="text-center text-xs text-slate-500 pt-2">
              {isSignup ? 'Já tem conta? ' : 'Ainda não tem conta? '}
              <a
                href={isSignup ? '/login' : '/login?mode=signup'}
                className="font-medium text-slate-900 hover:text-brand-700 underline-offset-4 hover:underline"
              >
                {isSignup ? 'Entrar' : 'Criar agora'}
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
