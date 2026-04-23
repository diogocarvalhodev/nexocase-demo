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

const SHOWCASE_LOCATIONS = [
  { id: 1, name: 'SOC Console', description: 'Primary monitoring room', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 2, name: 'Core Network', description: 'Datacenter and network backbone', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 3, name: 'Main Gate', description: 'Physical perimeter access', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
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

let showcaseSchools = [...SHOWCASE_SCHOOLS];
let showcaseUsers = [...SHOWCASE_USERS];
let showcaseIncidents = [...SHOWCASE_INCIDENTS];
let showcaseOficioText = 'Comunicamos que o incidente foi devidamente registrado e tratado conforme o protocolo interno.';

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

  if (method === 'post' && pathOnly === '/api/auth/change-password') {
    return Promise.resolve(buildShowcaseResponse(config, {
      ...SHOWCASE_USER,
      must_change_password: false,
    }));
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

  if (method === 'get' && pathOnly === '/api/options/locations') {
    return Promise.resolve(buildShowcaseResponse(config, SHOWCASE_LOCATIONS));
  }

  if (method === 'get' && pathOnly === '/api/schools') {
    return Promise.resolve(buildShowcaseResponse(config, showcaseSchools));
  }

  if (method === 'post' && pathOnly === '/api/schools') {
    const payload = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
    const created = {
      id: Date.now(),
      name: payload.name || 'New Showcase Unit',
      address: payload.address || null,
      phone: payload.phone || null,
      email: payload.email || null,
      is_active: true,
    };
    showcaseSchools = [created, ...showcaseSchools];
    return Promise.resolve(buildShowcaseResponse(config, created, 201));
  }

  if (method === 'put' && /^\/api\/schools\/\d+$/.test(pathOnly)) {
    const id = Number(pathOnly.split('/').pop());
    const payload = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
    showcaseSchools = showcaseSchools.map((school) => school.id === id ? { ...school, ...payload } : school);
    const updated = showcaseSchools.find((school) => school.id === id);
    return Promise.resolve(buildShowcaseResponse(config, updated || payload));
  }

  if (method === 'delete' && /^\/api\/schools\/\d+$/.test(pathOnly)) {
    const id = Number(pathOnly.split('/').pop());
    showcaseSchools = showcaseSchools.filter((school) => school.id !== id);
    return Promise.resolve(buildShowcaseResponse(config, { ok: true }));
  }

  if (method === 'get' && pathOnly === '/api/admin/users') {
    return Promise.resolve(buildShowcaseResponse(config, showcaseUsers));
  }

  if (method === 'get' && pathOnly === '/api/auth/users') {
    return Promise.resolve(buildShowcaseResponse(config, showcaseUsers));
  }

  if (method === 'post' && pathOnly === '/api/auth/register') {
    const payload = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
    const created = {
      id: Date.now(),
      username: payload.username || 'new.user',
      email: payload.email || 'new.user@nexocase.demo',
      full_name: payload.full_name || 'New User',
      is_active: true,
      is_admin: false,
      must_change_password: false,
      role: payload.role || 'OPERADOR',
      escola_vinculada: payload.escola_vinculada ?? null,
      setor_vinculado: payload.setor_vinculado ?? null,
      created_at: new Date().toISOString(),
    };
    showcaseUsers = [created, ...showcaseUsers];
    return Promise.resolve(buildShowcaseResponse(config, created, 201));
  }

  if (method === 'put' && /^\/api\/auth\/users\/\d+\/toggle-active$/.test(pathOnly)) {
    const id = Number(pathOnly.split('/')[4]);
    showcaseUsers = showcaseUsers.map((user) => user.id === id ? { ...user, is_active: !user.is_active } : user);
    const updated = showcaseUsers.find((user) => user.id === id);
    return Promise.resolve(buildShowcaseResponse(config, updated || { ok: true }));
  }

  if (method === 'get' && pathOnly === '/api/admin/schools') {
    return Promise.resolve(buildShowcaseResponse(config, SHOWCASE_SCHOOLS));
  }

  if (method === 'get' && pathOnly.startsWith('/api/admin/schools')) {
    return Promise.resolve(buildShowcaseResponse(config, SHOWCASE_SCHOOLS));
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
    const blob = new Blob(['Showcase monthly report'], { type: 'text/plain' });
    return Promise.resolve(buildShowcaseResponse(config, blob));
  }

  if (method === 'get' && pathOnly === '/api/reports/oficio-text') {
    return Promise.resolve(buildShowcaseResponse(config, { texto_oficio: showcaseOficioText }));
  }

  if (method === 'put' && pathOnly === '/api/reports/oficio-text') {
    const payload = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
    showcaseOficioText = payload.texto_oficio || showcaseOficioText;
    return Promise.resolve(buildShowcaseResponse(config, { texto_oficio: showcaseOficioText }));
  }

  if (method === 'post' && pathOnly === '/api/tenant/complete-onboarding') {
    return Promise.resolve(buildShowcaseResponse(config, {
      ok: true,
      onboarding_completed: true,
    }));
  }

  if (method === 'post' && pathOnly === '/api/incidents') {
    const payload = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
    const school = showcaseSchools.find((item) => item.id === Number(payload.school_id));
    const created = {
      id: Date.now(),
      process_number: `NC/2026/${String(showcaseIncidents.length + 1).padStart(5, '0')}`,
      school_id: Number(payload.school_id) || 1,
      unidade_escolar: school?.name || 'North Campus',
      setor: payload.setor || payload.category || 'Detection',
      operator_id: SHOWCASE_USER.id,
      location: payload.location || 'SOC Console',
      category: payload.category || payload.setor || 'Detection',
      impact_level: payload.impact_level || 'Medium',
      description: payload.description || 'Showcase generated incident',
      actions_taken: payload.actions_taken || null,
      status: 'Aguardando Validação',
      pdf_path: null,
      incident_date: payload.incident_date || new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      resolved_at: null,
      validated_by: null,
      validated_at: null,
      rejection_reason: null,
      validation_note: null,
      school,
      operator: SHOWCASE_USER,
      validator: null,
    };
    showcaseIncidents = [created as any, ...showcaseIncidents];
    return Promise.resolve(buildShowcaseResponse(config, created, 201));
  }

  if (method === 'get' && /^\/api\/incidents\/\d+$/.test(pathOnly)) {
    const id = Number(pathOnly.split('/').pop());
    const incident = showcaseIncidents.find((item: any) => item.id === id) || showcaseIncidents[0];
    const normalized = {
      ...incident,
      school_id: incident.school_id || 1,
      operator_id: incident.operator_id || SHOWCASE_USER.id,
      location: incident.location || 'SOC Console',
      description: incident.description || 'Showcase incident detail',
      actions_taken: incident.actions_taken ?? null,
      pdf_path: incident.pdf_path ?? null,
      updated_at: incident.updated_at || new Date().toISOString(),
      resolved_at: incident.resolved_at ?? null,
      school: incident.school || showcaseSchools[0],
      operator: incident.operator || SHOWCASE_USER,
      validator: incident.validator || null,
    };
    return Promise.resolve(buildShowcaseResponse(config, normalized));
  }

  if (method === 'get' && /^\/api\/incidents\/\d+\/pdf$/.test(pathOnly)) {
    const blob = new Blob(['%PDF-1.4\n% Showcase PDF placeholder\n'], { type: 'application/pdf' });
    return Promise.resolve(buildShowcaseResponse(config, blob));
  }

  if (method === 'post' && /^\/api\/incidents\/\d+\/regenerate-pdf$/.test(pathOnly)) {
    return Promise.resolve(buildShowcaseResponse(config, { ok: true }));
  }

  if (method === 'post' && /^\/api\/incidents\/\d+\/approve$/.test(pathOnly)) {
    const id = Number(pathOnly.split('/')[3]);
    showcaseIncidents = showcaseIncidents.map((incident: any) => incident.id === id ? { ...incident, status: 'Aprovada', validated_at: new Date().toISOString() } : incident);
    const updated = showcaseIncidents.find((incident: any) => incident.id === id);
    return Promise.resolve(buildShowcaseResponse(config, updated || showcaseIncidents[0]));
  }

  if (method === 'post' && /^\/api\/incidents\/\d+\/reject$/.test(pathOnly)) {
    const id = Number(pathOnly.split('/')[3]);
    showcaseIncidents = showcaseIncidents.map((incident: any) => incident.id === id ? { ...incident, status: 'Rejeitada', validated_at: new Date().toISOString() } : incident);
    const updated = showcaseIncidents.find((incident: any) => incident.id === id);
    return Promise.resolve(buildShowcaseResponse(config, updated || showcaseIncidents[0]));
  }

  if (method === 'post' && /^\/api\/incidents\/\d+\/pdf-edit$/.test(pathOnly)) {
    const blob = new Blob(['%PDF-1.4\n% Showcase edited PDF placeholder\n'], { type: 'application/pdf' });
    return Promise.resolve(buildShowcaseResponse(config, blob));
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
