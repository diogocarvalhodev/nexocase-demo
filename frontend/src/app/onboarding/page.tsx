'use client';

import { useEffect, useState, type FormEvent, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

import api from '@/lib/api';
import type { TenantProfile, User } from '@/types';
import { persistTenantBusinessType } from '@/lib/terminology';

type BusinessType = 'education' | 'condominium' | 'shopping';

const PRESET_LABELS: Record<BusinessType, { title: string; description: string }> = {
  education: {
    title: 'Educação',
    description: 'Preset com setores e locais focados em unidades escolares.',
  },
  condominium: {
    title: 'Condomínio',
    description: 'Preset com fluxo de portaria, manutenção e convivência.',
  },
  shopping: {
    title: 'Shopping',
    description: 'Preset para operação comercial, segurança e atendimento.',
  },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tenantProfile, setTenantProfile] = useState<TenantProfile | null>(null);
  const [displayName, setDisplayName] = useState('NexoCase');
  const [businessType, setBusinessType] = useState<BusinessType>('education');
  const [appName, setAppName] = useState('NexoCase');
  const [subtitle, setSubtitle] = useState('Gestão de Casos');
  const [primaryColor, setPrimaryColor] = useState('#0f766e');
  const [accentColor, setAccentColor] = useState('#f59e0b');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userStr = Cookies.get('user');
    const token = Cookies.get('token');

    if (!token || !userStr) {
      router.push('/login');
      return;
    }

    try {
      const user = JSON.parse(userStr) as User;
      if (user.role !== 'MASTER') {
        router.push('/dashboard');
        return;
      }
      setCurrentUser(user);
    } catch {
      router.push('/login');
      return;
    }

    const load = async () => {
      try {
        const [statusRes, profileRes] = await Promise.all([
          api.get<{ onboarding_completed: boolean }>('/api/tenant/onboarding-status'),
          api.get<TenantProfile>('/api/tenant/profile'),
        ]);

        if (statusRes.data.onboarding_completed) {
          router.push('/dashboard');
          return;
        }

        const profile = profileRes.data;
        setTenantProfile(profile);
        setDisplayName(profile.name || 'NexoCase');
        setAppName(profile.ui_config.app_name || 'NexoCase');
        setSubtitle(profile.ui_config.subtitle || 'Gestão de Casos');
        setPrimaryColor(profile.ui_config.primary_color || '#0f766e');
        setAccentColor(profile.ui_config.accent_color || '#f59e0b');
        if (profile.business_type && ['education', 'condominium', 'shopping'].includes(profile.business_type)) {
          setBusinessType(profile.business_type as BusinessType);
        }
      } catch {
        setError('Não foi possível carregar os dados do onboarding.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      await api.post('/api/tenant/complete-onboarding', {
        display_name: displayName,
        business_type: businessType,
        ui_config: {
          app_name: appName,
          subtitle,
          primary_color: primaryColor,
          accent_color: accentColor,
        },
      });

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('tenant_slug', tenantProfile?.slug || 'default');
      }
      persistTenantBusinessType(businessType);

      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Falha ao concluir onboarding.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-amber-50 py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="px-8 py-6 bg-teal-800 text-white">
          <h1 className="text-2xl font-bold">Onboarding do Tenant</h1>
          <p className="text-teal-100 mt-1">Configure sua operação inicial e aplique um preset de negócio.</p>
          {currentUser && (
            <p className="text-xs text-teal-200 mt-2">Conectado como {currentUser.full_name}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
              {error}
            </div>
          )}

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">1. Identidade</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome operacional</label>
                <input
                  value={displayName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de operação</label>
                <select
                  value={businessType}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setBusinessType(e.target.value as BusinessType)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="education">Educação</option>
                  <option value="condominium">Condomínio</option>
                  <option value="shopping">Shopping</option>
                </select>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">{PRESET_LABELS[businessType].description}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">2. Interface</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do app</label>
                <input
                  value={appName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setAppName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subtítulo</label>
                <input
                  value={subtitle}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSubtitle(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cor primária</label>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setPrimaryColor(e.target.value)}
                  className="w-full h-10 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cor de destaque</label>
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setAccentColor(e.target.value)}
                  className="w-full h-10 border rounded-lg"
                />
              </div>
            </div>
          </section>

          <section className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">3. Confirmação</h2>
            <p className="text-sm text-gray-600">
              Ao concluir, o sistema aplicará o preset de {PRESET_LABELS[businessType].title.toLowerCase()} e marcará o onboarding como finalizado.
            </p>
          </section>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-50"
            >
              {saving ? 'Finalizando...' : 'Concluir onboarding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
