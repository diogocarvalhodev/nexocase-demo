'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from './api';
import { User, LoginCredentials, AuthResponse, PasswordChangePayload } from '@/types';

const CSRF_COOKIE_NAMES = ['nexocase_csrf_token', 'cco_csrf_token'];

function getCsrfToken(): string | undefined {
  for (const cookieName of CSRF_COOKIE_NAMES) {
    const value = Cookies.get(cookieName);
    if (value) return value;
  }
  return undefined;
}

function clearCsrfCookies() {
  for (const cookieName of CSRF_COOKIE_NAMES) {
    Cookies.remove(cookieName);
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = Cookies.get('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        Cookies.remove('user');
        Cookies.remove('token');
        clearCsrfCookies();
      }
    }
    setLoading(false);
  }, []);

  const login = async (credentials: LoginCredentials): Promise<void> => {
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    const response = await api.post<AuthResponse>('/api/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token, user: userData, password_change_required } = response.data;

    Cookies.set('token', access_token, { expires: 1 });
    Cookies.set('user', JSON.stringify(userData), { expires: 1 });
    setUser(userData);

    if (password_change_required || userData.must_change_password) {
      router.push('/change-password');
      return;
    }

    if (userData.role === 'MASTER') {
      try {
        const onboardingRes = await api.get<{ onboarding_completed: boolean }>('/api/tenant/onboarding-status');
        if (!onboardingRes.data.onboarding_completed) {
          router.push('/onboarding');
          return;
        }
      } catch {
        // If status check fails, fallback to dashboard and let page-level checks handle it.
      }
    }

    router.push('/dashboard');
  };

  const changePassword = async (payload: PasswordChangePayload): Promise<void> => {
    const response = await api.post<User>('/api/auth/change-password', payload);
    const updatedUser = response.data;

    Cookies.set('user', JSON.stringify(updatedUser), { expires: 1 });
    setUser(updatedUser);
  };

  const logout = () => {
    const csrfToken = getCsrfToken();
    api.post('/api/auth/logout', {}, {
      headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
    }).catch(() => undefined);
    Cookies.remove('token');
    clearCsrfCookies();
    Cookies.remove('user');
    setUser(null);
    router.push('/login');
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'MASTER';

  return {
    user,
    loading,
    login,
    changePassword,
    logout,
    isAuthenticated,
    isAdmin,
  };
}
