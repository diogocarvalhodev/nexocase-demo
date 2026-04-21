import axios from 'axios';
import Cookies from 'js-cookie';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import type { RefreshResponse } from '@/types';

const API_URL = '/backend';
const DEFAULT_TENANT_SLUG = process.env.NEXT_PUBLIC_DEFAULT_TENANT || 'default';
const SHOWCASE_MODE = process.env.NEXT_PUBLIC_SHOWCASE_MODE === 'true';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const SHOWCASE_USER = {
  id: 1,
  username: 'admin',
  email: 'admin@nexocase.demo',
  full_name: 'Showcase Admin',
  is_active: true,
  is_admin: true,
  must_change_password: false,
  role: 'MASTER' as const,
  created_at: new Date().toISOString(),
};

const SHOWCASE_USERS = [
  SHOWCASE_USER,
  {
    id: 2,
    username: 'demo.operator',
    email: 'operator@nexocase.demo',
    full_name: 'SOC Operator',
    is_active: true,
    is_admin: false,
    must_change_password: false,
    role: 'OPERADOR' as const,
    created_at: new Date().toISOString(),
  },
];

const SHOWCASE_SCHOOLS = [
  { id: 1, name: 'North Campus', address: 'Austin, TX', phone: null, email: null, is_active: true },
  { id: 2, name: 'Operations Center', address: 'Austin, TX', phone: null, email: null, is_active: true },
  { id: 3, name: 'South Annex', address: 'Austin, TX', phone: null, email: null, is_active: true },
];

const SHOWCASE_INCIDENTS = [
  {
    id: 101,
    process_number: 'NC/2026/00001',
    school: 'North Campus',
    setor: 'Detection',
    impact_level: 'High',
    status: 'Fechado',
    operator: 'SOC Operator',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 102,
    process_number: 'NC/2026/00002',
    school: 'Operations Center',
    setor: 'Infrastructure',
    impact_level: 'Critical',
    status: 'Aprovada',
    operator: 'SOC Operator',
    created_at: new Date(Date.now() - 43200000).toISOString(),
  },
  {
    id: 103,
    process_number: 'NC/2026/00003',
    school: 'South Annex',
    setor: 'Access Control',
    impact_level: 'Medium',
    status: 'Aguardando Validação',
    operator: 'SOC Operator',
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
];

function buildShowcaseResponse(config: AxiosRequestConfig, data: any, status = 200): AxiosResponse {
  return {
    data,
    status,
    statusText: status === 200 ? 'OK' : 'ERROR',
    headers: {},
    config: config as any,
  };
}

function normalizePath(url?: string): string {
  if (!url) return '/';
  const withoutBase = url.replace(/^\/backend/, '');
  return withoutBase.startsWith('/') ? withoutBase : `/${withoutBase}`;
}

function showcaseAdapter(config: AxiosRequestConfig): Promise<AxiosResponse> {
  const method = (config.method || 'get').toLowerCase();
  const path = normalizePath(config.url);
  const pathOnly = path.split('?')[0];

  if (method === 'post' && pathOnly === '/api/auth/login') {
    const payload = config.data instanceof URLSearchParams ? config.data : new URLSearchParams(config.data || '');
    const username = payload.get('username') || '';
    const password = payload.get('password') || '';
    const allowed = [
      ['admin', 'admin'],
      ['demo.admin', 'DemoAdmin!234'],
      ['demo.operator', 'DemoOperator!234'],
      ['demo.director', 'DemoDirector!234'],
    ];
    const valid = allowed.some(([u, p]) => u === username && p === password);
    if (!valid) {
      return Promise.resolve(buildShowcaseResponse(config, { detail: 'Usuário ou senha incorretos' }, 401));
    }
    return Promise.resolve(buildShowcaseResponse(config, {
      access_token: 'showcase-token',
      token_type: 'bearer',
      password_change_required: false,
      user: username === 'demo.operator' ? SHOWCASE_USERS[1] : SHOWCASE_USER,
    }));
  }

  if (method === 'post' && pathOnly === '/api/auth/logout') {
    return Promise.resolve(buildShowcaseResponse(config, { ok: true }));
  }

  if (method === 'get' && pathOnly === '/api/tenant/onboarding-status') {
    return Promise.resolve(buildShowcaseResponse(config, { onboarding_completed: true, business_type: 'education' }));
  }

  if (method === 'get' && pathOnly === '/api/tenant/profile') {
    return Promise.resolve(buildShowcaseResponse(config, {
      id: 1,
      name: 'NexoCase Showcase Tenant',
      slug: 'default',
      is_active: true,
      business_type: 'education',
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
      ui_config: {
        app_name: 'NexoCase Showcase',
        subtitle: 'Incident Operations Demo',
        primary_color: '#0f766e',
        accent_color: '#f59e0b',
      },
    }));
  }

  if (method === 'get' && pathOnly === '/api/tenant/ui-config') {
    return Promise.resolve(buildShowcaseResponse(config, {
      app_name: 'NexoCase Showcase',
      subtitle: 'Incident Operations Demo',
      primary_color: '#0f766e',
      accent_color: '#f59e0b',
    }));
  }

  if (method === 'get' && pathOnly === '/api/options/impact-levels') {
    return Promise.resolve(buildShowcaseResponse(config, [
      { id: 1, name: 'Low', description: 'Low impact', color: '#22c55e', severity: 1, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 2, name: 'Medium', description: 'Moderate impact', color: '#f59e0b', severity: 2, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 3, name: 'High', description: 'High impact', color: '#ef4444', severity: 3, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 4, name: 'Critical', description: 'Critical impact', color: '#7f1d1d', severity: 4, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ]));
  }

  if (method === 'get' && pathOnly === '/api/options/regions') {
    return Promise.resolve(buildShowcaseResponse(config, ['North Zone', 'Central Zone', 'South Zone']));
  }

  if (method === 'get' && pathOnly === '/api/options/categories') {
    return Promise.resolve(buildShowcaseResponse(config, [
      { id: 1, name: 'Detection', description: 'Detection incidents', color: '#3b82f6', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 2, name: 'Infrastructure', description: 'Infrastructure incidents', color: '#f59e0b', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 3, name: 'Access Control', description: 'Identity and access', color: '#10b981', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ]));
  }

  if (method === 'get' && pathOnly === '/api/schools') {
    return Promise.resolve(buildShowcaseResponse(config, SHOWCASE_SCHOOLS));
  }

  if (method === 'get' && pathOnly === '/api/admin/users') {
    return Promise.resolve(buildShowcaseResponse(config, SHOWCASE_USERS));
  }

  if (method === 'get' && pathOnly === '/api/presets') {
    return Promise.resolve(buildShowcaseResponse(config, []));
  }

  if (method === 'post' && pathOnly === '/api/presets') {
    return Promise.resolve(buildShowcaseResponse(config, {
      id: Date.now(),
      name: 'Showcase Preset',
      config: {},
      is_favorite: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  }

  if (method === 'delete' && pathOnly.startsWith('/api/presets/')) {
    return Promise.resolve(buildShowcaseResponse(config, { ok: true }));
  }

  if (method === 'get' && pathOnly === '/api/dashboard/stats') {
    return Promise.resolve(buildShowcaseResponse(config, {
      total_incidents: 48,
      open_incidents: 7,
      in_progress_incidents: 13,
      resolved_incidents: 24,
      rejected_incidents: 4,
      monthly_incidents: 19,
      high_impact_open: 3,
    }));
  }

  if (method === 'get' && pathOnly === '/api/dashboard/incidents-by-category') {
    return Promise.resolve(buildShowcaseResponse(config, [
      { setor: 'Detection', count: 18 },
      { setor: 'Infrastructure', count: 14 },
      { setor: 'Access Control', count: 10 },
      { setor: 'Safety', count: 6 },
    ]));
  }

  if (method === 'get' && pathOnly === '/api/dashboard/incidents-by-school') {
    return Promise.resolve(buildShowcaseResponse(config, [
      { school: 'North Campus', count: 16 },
      { school: 'Operations Center', count: 19 },
      { school: 'South Annex', count: 13 },
    ]));
  }

  if (method === 'get' && pathOnly === '/api/dashboard/incidents-by-location') {
    return Promise.resolve(buildShowcaseResponse(config, [
      { location: 'SOC Console', count: 20 },
      { location: 'Core Network', count: 14 },
      { location: 'Main Gate', count: 9 },
      { location: 'Server Room', count: 5 },
    ]));
  }

  if (method === 'get' && pathOnly === '/api/dashboard/incidents-by-impact') {
    return Promise.resolve(buildShowcaseResponse(config, [
      { impact: 'Low', count: 12 },
      { impact: 'Medium', count: 17 },
      { impact: 'High', count: 14 },
      { impact: 'Critical', count: 5 },
    ]));
  }

  if (method === 'get' && pathOnly === '/api/dashboard/incidents-by-region') {
    return Promise.resolve(buildShowcaseResponse(config, [
      { region: 'North Zone', count: 17 },
      { region: 'Central Zone', count: 19 },
      { region: 'South Zone', count: 12 },
    ]));
  }

  if (method === 'get' && pathOnly === '/api/dashboard/monthly-trend') {
    return Promise.resolve(buildShowcaseResponse(config, [
      { month: 'Nov', count: 8 },
      { month: 'Dec', count: 11 },
      { month: 'Jan', count: 9 },
      { month: 'Feb', count: 13 },
      { month: 'Mar', count: 15 },
      { month: 'Apr', count: 19 },
    ]));
  }

  if (method === 'get' && pathOnly === '/api/dashboard/critical-schools') {
    return Promise.resolve(buildShowcaseResponse(config, [
      { id: 2, name: 'Operations Center', region: 'Central Zone', count: 6 },
      { id: 1, name: 'North Campus', region: 'North Zone', count: 4 },
      { id: 3, name: 'South Annex', region: 'South Zone', count: 3 },
    ]));
  }

  if (method === 'get' && pathOnly === '/api/dashboard/recent-incidents') {
    return Promise.resolve(buildShowcaseResponse(config, SHOWCASE_INCIDENTS));
  }

  if (method === 'get' && pathOnly === '/api/incidents') {
    return Promise.resolve(buildShowcaseResponse(config, SHOWCASE_INCIDENTS));
  }

  if (method === 'get' && pathOnly === '/api/reports/monthly') {
    return Promise.resolve(buildShowcaseResponse(config, 'Showcase report placeholder')); 
  }

  return Promise.resolve(buildShowcaseResponse(config, { detail: `Showcase route not mocked: ${method.toUpperCase()} ${pathOnly}` }, 404));
}

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

function getTenantSlug(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_TENANT_SLUG;
  }

  const hostname = window.location.hostname.toLowerCase();
  const hostParts = hostname.split('.');
  if (hostParts.length > 2 && hostname !== 'localhost' && hostname !== '127.0.0.1') {
    const subdomain = hostParts[0];
    if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
      return subdomain;
    }
  }

  const storedTenant = window.localStorage.getItem('tenant_slug');
  if (storedTenant && storedTenant.trim()) {
    return storedTenant.trim().toLowerCase();
  }

  return DEFAULT_TENANT_SLUG;
}

let isRefreshing = false;
let pendingRequests: Array<(token: string | null) => void> = [];

function resolvePendingRequests(token: string | null) {
  pendingRequests.forEach((callback) => callback(token));
  pendingRequests = [];
}

// Interceptor para adicionar token
api.interceptors.request.use((config) => {
  if (SHOWCASE_MODE) {
    config.adapter = showcaseAdapter;
  }

  const token = Cookies.get('token');
  config.headers = config.headers || {};
  config.headers['X-Tenant'] = getTenantSlug();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (SHOWCASE_MODE) {
      return Promise.reject(error);
    }

    const originalRequest = error.config || {};
    const detail = error.response?.data?.detail;
    const passwordChangeRequired =
      error.response?.status === 403 &&
      typeof detail === 'object' &&
      detail?.code === 'PASSWORD_CHANGE_REQUIRED';

    if (passwordChangeRequired) {
      if (typeof window !== 'undefined' && window.location.pathname !== '/change-password') {
        window.location.href = '/change-password';
      }
      return Promise.reject(error);
    }

    const isAuthRoute = String(originalRequest.url || '').includes('/api/auth/login')
      || String(originalRequest.url || '').includes('/api/auth/refresh')
      || String(originalRequest.url || '').includes('/api/auth/logout');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push((token) => {
            if (!token) {
              reject(error);
              return;
            }
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      const csrfToken = getCsrfToken();
      if (!csrfToken) {
        Cookies.remove('token');
        clearCsrfCookies();
        Cookies.remove('user');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      isRefreshing = true;
      try {
        const refreshResponse = await axios.post<RefreshResponse>(
          `${API_URL}/api/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrfToken,
              'X-Tenant': getTenantSlug(),
            },
          }
        );

        const { access_token, user } = refreshResponse.data;
        Cookies.set('token', access_token, { expires: 1 });
        Cookies.set('user', JSON.stringify(user), { expires: 1 });

        resolvePendingRequests(access_token);
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        resolvePendingRequests(null);
        Cookies.remove('token');
        clearCsrfCookies();
        Cookies.remove('user');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 401 && !isAuthRoute) {
      Cookies.remove('token');
      clearCsrfCookies();
      Cookies.remove('user');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
