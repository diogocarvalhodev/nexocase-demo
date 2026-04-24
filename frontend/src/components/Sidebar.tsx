'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  School,
  Users,
  LogOut,
  Menu,
  X,
  Settings,
  Clock,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import NexoCaseLogo from '@/components/NexoCaseLogo';
import { APP_CONFIG } from '@/config/branding';
import api from '@/lib/api';
import type { User, TenantUIConfig } from '@/types';
import { useTenantTerminology } from '@/lib/terminology';

const API_URL = '/backend';
const SHOWCASE_MODE = process.env.NEXT_PUBLIC_SHOWCASE_MODE === 'true';

type NavigationItem = {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
  roles?: User['role'][];
};

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();
  const { terms } = useTenantTerminology();
    const navigation: NavigationItem[] = [
      { name: 'Painel', href: '/dashboard', icon: LayoutDashboard },
      { name: terms.incidentPlural, href: '/incidents', icon: FileText },
      { name: `Nova ${terms.incidentSingular}`, href: '/incidents/new', icon: PlusCircle },
      {
        name: 'Pendentes',
        href: '/incidents?status=Aguardando%20Valida%C3%A7%C3%A3o',
        icon: Clock,
        roles: ['OPERADOR'],
      },
      { name: terms.unitPlural, href: '/schools', icon: School, adminOnly: true },
      { name: 'Usuários', href: '/users', icon: Users, adminOnly: true },
      { name: 'Administração', href: '/admin', icon: Settings, adminOnly: true },
    ];

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [tenantUiConfig, setTenantUiConfig] = useState<TenantUIConfig | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!SHOWCASE_MODE) {
    // Carregar logo do sistema
      fetch(`${API_URL}/api/admin/logo-base64?t=${Date.now()}`)
        .then(res => res.json())
        .then(data => {
          if (data.logo_base64) {
            setLogoUrl(data.logo_base64);
          }
        })
        .catch(() => {});
    }

    api.get<TenantUIConfig>('/api/tenant/ui-config')
      .then((response) => {
        setTenantUiConfig(response.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.role !== 'OPERADOR') {
      setPendingCount(0);
      return;
    }

    const loadPendingCount = async () => {
      try {
        const response = await api.get('/api/incidents?status_filter=Aguardando%20Valida%C3%A7%C3%A3o');
        if (Array.isArray(response.data)) {
          setPendingCount(response.data.length);
        }
      } catch {
        setPendingCount(0);
      }
    };

    loadPendingCount();
  }, [user?.role]);

  const filteredNavigation = navigation.filter((item) => {
    if (item.roles) {
      return !!user && item.roles.includes(user.role);
    }
    if (item.adminOnly) {
      return isAdmin;
    }
    return true;
  });

  const roleLabel = user?.role === 'MASTER'
    ? 'Master'
    : user?.role === 'ADMIN'
      ? 'Administrador'
      : user?.role === 'CHEFIA'
        ? 'Chefia'
        : user?.role === 'GESTOR_SETOR'
          ? terms.sectorManagerRoleLabel
          : user?.role === 'DIRETOR'
            ? terms.directorRoleLabel
            : user?.role === 'OPERADOR'
              ? 'Operador'
              : 'Operador';

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-3 left-3 z-50 p-2.5 rounded-xl bg-secondary-900 shadow-lg shadow-secondary-900/20"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? (
          <X className="h-5 w-5 text-white" />
        ) : (
          <Menu className="h-5 w-5 text-white" />
        )}
      </button>

      {/* Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-secondary-950 via-secondary-900 to-secondary-950 transform transition-transform duration-300 ease-in-out lg:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 py-6 border-b border-white/10">
            <div className="flex items-center space-x-3">
              {logoUrl ? (
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center p-1.5">
                  <img
                    src={logoUrl}
                    alt={APP_CONFIG.logoAlt}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <NexoCaseLogo size={40} />
              )}
              <div>
                <h1 className="text-base font-bold text-white tracking-tight">{tenantUiConfig?.app_name || APP_CONFIG.name}</h1>
                <p className="text-[11px] text-secondary-400">{tenantUiConfig?.subtitle || APP_CONFIG.subtitle}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              const showBadge = item.name === 'Pendentes' && pendingCount > 0;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'group flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary-600/20 text-white border-l-[3px] border-primary-400 ml-0 pl-[9px]'
                      : 'text-secondary-400 hover:bg-white/5 hover:text-white hover:translate-x-0.5'
                  )}
                >
                  <Icon className={cn('h-[18px] w-[18px] mr-3 transition-colors', isActive ? 'text-primary-400' : 'text-secondary-500 group-hover:text-secondary-300')} />
                  <span className="flex-1">{item.name}</span>
                  {showBadge && (
                    <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400 ring-1 ring-amber-500/30">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="px-3 py-4 border-t border-white/10">
            <div className="flex items-center space-x-3 mb-3 px-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center ring-2 ring-primary-400/30">
                <span className="text-white font-semibold text-sm">
                  {user?.full_name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.full_name || 'Usuário'}
                </p>
                <p className="text-xs text-secondary-400 truncate">
                  {roleLabel}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-secondary-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
            >
              <LogOut className="h-4 w-4 mr-3" />
              Sair
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
