'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/lib/auth';
import NexoCaseLogo from '@/components/NexoCaseLogo';
import { APP_CONFIG, DEMO_ACCOUNTS, DEMO_MODE } from '@/config/branding';
import { LoginCredentials } from '@/types';
import { AlertCircle, ShieldCheck, Building2, Activity, CheckCircle } from 'lucide-react';

const API_URL = '/backend';
const SHOWCASE_MODE = process.env.NEXT_PUBLIC_SHOWCASE_MODE === 'true';

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (SHOWCASE_MODE) {
      return;
    }

    // Carregar logo do sistema
    fetch(`${API_URL}/api/admin/logo-base64`)
      .then(res => res.json())
      .then(data => {
        if (data.logo_base64) {
          setLogoUrl(data.logo_base64);
        }
      })
      .catch(() => {});
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginCredentials>();

  const fillDemoCredentials = (username: string, password: string) => {
    setValue('username', username, { shouldDirty: true });
    setValue('password', password, { shouldDirty: true });
  };

  const onSubmit = async (data: LoginCredentials) => {
    setError(null);
    setLoading(true);

    try {
      await login(data);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 'Erro ao fazer login. Verifique suas credenciais.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 sm:py-10 relative overflow-hidden bg-secondary-950">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 -left-40 w-80 h-80 bg-primary-600 rounded-full mix-blend-screen filter blur-[120px] opacity-30 animate-blob" />
        <div className="absolute top-40 -right-40 w-80 h-80 bg-purple-600 rounded-full mix-blend-screen filter blur-[120px] opacity-25 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-20 left-1/2 w-80 h-80 bg-cyan-500 rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-blob animation-delay-4000" />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8 animate-fade-in">
          {logoUrl ? (
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 mb-4 p-3 shadow-2xl">
              <img src={logoUrl} alt={APP_CONFIG.logoAlt} className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 mb-4 p-3 shadow-2xl">
              <NexoCaseLogo size={52} />
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {APP_CONFIG.name}
          </h1>
          <p className="text-secondary-400 mt-2 text-sm">
            {APP_CONFIG.subtitle}
          </p>
          <p className="mt-4 text-sm font-medium text-secondary-200">
            {APP_CONFIG.commercialHeadline}
          </p>
          <p className="mx-auto mt-2 max-w-sm text-xs text-secondary-400">
            {APP_CONFIG.commercialSubheadline}
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-secondary-200">
              <Building2 className="h-3.5 w-3.5" /> Multiunidade
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-secondary-200">
              <Activity className="h-3.5 w-3.5" /> Auditoria completa
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-secondary-200">
              <CheckCircle className="h-3.5 w-3.5" /> Pronto para implantação
            </span>
          </div>
        </div>

        {/* Login Card - Glassmorphism */}
        <div className="bg-white/[0.08] backdrop-blur-2xl rounded-2xl border border-white/[0.12] shadow-2xl shadow-black/20 p-5 sm:p-8 animate-scale-in">
          <h2 className="text-lg font-semibold text-white mb-5 sm:mb-6 text-center">
            Acesso ao Sistema
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-3 animate-fade-in">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
            <div className="w-full">
              <label htmlFor="username" className="block text-sm font-medium text-secondary-300 mb-1.5">
                Usuário
              </label>
              <input
                id="username"
                placeholder="Digite seu usuário"
                className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.12] rounded-xl text-white placeholder:text-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400/30 transition-all"
                {...register('username', { required: 'Usuário é obrigatório' })}
              />
              {errors.username && <p className="mt-1.5 text-sm text-red-400">{errors.username.message}</p>}
            </div>

            <div className="w-full">
              <label htmlFor="password" className="block text-sm font-medium text-secondary-300 mb-1.5">
                Senha
              </label>
              <input
                id="password"
                type="password"
                placeholder="Digite sua senha"
                className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.12] rounded-xl text-white placeholder:text-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400/30 transition-all"
                {...register('password', { required: 'Senha é obrigatória' })}
              />
              {errors.password && <p className="mt-1.5 text-sm text-red-400">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 focus:ring-offset-secondary-950 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-600/25 hover:shadow-primary-500/30"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Entrando...
                </span>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/[0.08]">
            <div className="space-y-2 text-center">
              <p className="text-xs text-secondary-500">
                Em caso de problemas de acesso, entre em contato com o administrador do sistema.
              </p>
              <a
                href={`mailto:${APP_CONFIG.contactEmail}?subject=Interesse%20Comercial%20-%20NexoCase`}
                className="inline-flex items-center rounded-full border border-primary-400/30 bg-primary-500/10 px-3 py-1 text-[11px] font-semibold text-primary-200 hover:bg-primary-500/20"
              >
                Falar com vendas: {APP_CONFIG.contactEmail}
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-secondary-600 text-sm mt-6 sm:mt-8">
          {APP_CONFIG.footer}
        </p>

        {DEMO_MODE && (
          <div className="mt-6 rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-xl p-5 shadow-xl shadow-black/10 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-emerald-500/15 p-2 text-emerald-300">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Contas da Demonstração</h3>
                <p className="mt-1 text-sm text-secondary-300">
                  Demo de produto com dados sintéticos, fluxos de operação e perfis de acesso para apresentação comercial.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.username}
                  type="button"
                  onClick={() => fillDemoCredentials(account.username, account.password)}
                  className="w-full rounded-xl border border-white/[0.1] bg-black/10 px-4 py-3 text-left transition-colors hover:bg-white/[0.06]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">{account.label}</p>
                      <p className="mt-1 text-xs text-secondary-400">{account.description}</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-secondary-300">
                      Preencher
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-secondary-400">
                    {account.username} / {account.password}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
