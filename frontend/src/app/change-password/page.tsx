'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { useForm } from 'react-hook-form';
import { AlertCircle, CheckCircle } from 'lucide-react';

import { useAuth } from '@/lib/auth';

type ChangePasswordForm = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

export default function ChangePasswordPage() {
  const router = useRouter();
  const { changePassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ChangePasswordForm>();

  useEffect(() => {
    const token = Cookies.get('token');
    const userStr = Cookies.get('user');

    if (!token || !userStr) {
      router.push('/login');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      if (!user?.must_change_password) {
        router.push('/dashboard');
      }
    } catch {
      Cookies.remove('user');
      router.push('/login');
    }
  }, [router]);

  const onSubmit = async (data: ChangePasswordForm) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (data.new_password !== data.confirm_password) {
      setError('A confirmação da nova senha não confere.');
      setLoading(false);
      return;
    }

    try {
      await changePassword({
        current_password: data.current_password,
        new_password: data.new_password,
      });
      setSuccess('Senha alterada com sucesso. Redirecionando...');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1200);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Não foi possível alterar a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-secondary-950">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 -left-40 w-80 h-80 bg-primary-600 rounded-full mix-blend-screen filter blur-[120px] opacity-30 animate-blob" />
        <div className="absolute top-40 -right-40 w-80 h-80 bg-purple-600 rounded-full mix-blend-screen filter blur-[120px] opacity-25 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-20 left-1/2 w-80 h-80 bg-cyan-500 rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-blob animation-delay-4000" />
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/20 backdrop-blur-md border border-amber-400/20 mb-4">
            <AlertCircle className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Troca obrigatória de senha</h1>
          <p className="text-secondary-400 mt-2 text-sm">
            Por segurança, atualize sua senha antes de acessar o sistema.
          </p>
        </div>

        <div className="bg-white/[0.08] backdrop-blur-2xl rounded-2xl border border-white/[0.12] shadow-2xl shadow-black/20 p-8 animate-scale-in">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-3 animate-fade-in">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center space-x-3 animate-fade-in">
              <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
              <p className="text-sm text-green-300">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="w-full">
              <label htmlFor="current_password" className="block text-sm font-medium text-secondary-300 mb-1.5">Senha atual</label>
              <input
                id="current_password"
                type="password"
                placeholder="Digite a senha provisória"
                className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.12] rounded-xl text-white placeholder:text-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400/30 transition-all"
                {...register('current_password', { required: 'Senha atual é obrigatória' })}
              />
              {errors.current_password && <p className="mt-1.5 text-sm text-red-400">{errors.current_password.message}</p>}
            </div>

            <div className="w-full">
              <label htmlFor="new_password" className="block text-sm font-medium text-secondary-300 mb-1.5">Nova senha</label>
              <input
                id="new_password"
                type="password"
                placeholder="Mínimo de 8 caracteres"
                className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.12] rounded-xl text-white placeholder:text-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400/30 transition-all"
                {...register('new_password', {
                  required: 'Nova senha é obrigatória',
                  minLength: { value: 8, message: 'A senha deve ter no mínimo 8 caracteres' },
                })}
              />
              {errors.new_password && <p className="mt-1.5 text-sm text-red-400">{errors.new_password.message}</p>}
            </div>

            <div className="w-full">
              <label htmlFor="confirm_password" className="block text-sm font-medium text-secondary-300 mb-1.5">Confirmar nova senha</label>
              <input
                id="confirm_password"
                type="password"
                placeholder="Repita a nova senha"
                className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.12] rounded-xl text-white placeholder:text-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400/30 transition-all"
                {...register('confirm_password', {
                  required: 'Confirmação de senha é obrigatória',
                  validate: (value: string) =>
                    value === watch('new_password') || 'A confirmação deve ser igual à nova senha',
                })}
              />
              {errors.confirm_password && <p className="mt-1.5 text-sm text-red-400">{errors.confirm_password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 focus:ring-offset-secondary-950 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-600/25"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Atualizando...
                </span>
              ) : (
                'Atualizar senha'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
