import { useEffect, useState } from 'react';

import api from '@/lib/api';

export type BusinessType = 'education' | 'condominium' | 'shopping';
const STORAGE_KEY = 'tenant_business_type';
let businessTypeCache: BusinessType | null = null;

export interface TenantTerminology {
  incidentSingular: string;
  incidentPlural: string;
  unitSingular: string;
  unitPlural: string;
  sectorSingular: string;
  sectorPlural: string;
  directorRoleLabel: string;
  sectorManagerRoleLabel: string;
}

const TERMINOLOGY_BY_BUSINESS: Record<BusinessType, TenantTerminology> = {
  education: {
    incidentSingular: 'Ocorrência',
    incidentPlural: 'Ocorrências',
    unitSingular: 'Unidade',
    unitPlural: 'Unidades',
    sectorSingular: 'Área',
    sectorPlural: 'Áreas',
    directorRoleLabel: 'Gestor',
    sectorManagerRoleLabel: 'Responsável de Área',
  },
  condominium: {
    incidentSingular: 'Registro',
    incidentPlural: 'Registros',
    unitSingular: 'Unidade',
    unitPlural: 'Unidades',
    sectorSingular: 'Área',
    sectorPlural: 'Áreas',
    directorRoleLabel: 'Síndico',
    sectorManagerRoleLabel: 'Gestor de Área',
  },
  shopping: {
    incidentSingular: 'Caso',
    incidentPlural: 'Casos',
    unitSingular: 'Unidade',
    unitPlural: 'Unidades',
    sectorSingular: 'Área',
    sectorPlural: 'Áreas',
    directorRoleLabel: 'Gestor',
    sectorManagerRoleLabel: 'Responsável de Área',
  },
};

function isBusinessType(value: unknown): value is BusinessType {
  return value === 'education' || value === 'condominium' || value === 'shopping';
}

function readBusinessTypeFromStorage(): BusinessType | null {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isBusinessType(stored) ? stored : null;
}

export function persistTenantBusinessType(businessType?: string | null) {
  if (!isBusinessType(businessType)) return;
  businessTypeCache = businessType;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, businessType);
  }
}

export function getInitialTenantBusinessType(): BusinessType | null {
  return businessTypeCache || readBusinessTypeFromStorage();
}

export function getTerminology(businessType?: string | null): TenantTerminology {
  if (businessType && businessType in TERMINOLOGY_BY_BUSINESS) {
    return TERMINOLOGY_BY_BUSINESS[businessType as BusinessType];
  }
  return TERMINOLOGY_BY_BUSINESS.condominium;
}

export function useTenantTerminology() {
  const [businessType, setBusinessType] = useState<BusinessType>(() => getInitialTenantBusinessType() || 'condominium');
  const [isReady, setIsReady] = useState<boolean>(() => Boolean(getInitialTenantBusinessType()));

  useEffect(() => {
    let mounted = true;

    api.get('/api/tenant/profile')
      .then((response: any) => {
        const nextType = response?.data?.business_type;
        if (!mounted) return;
        if (isBusinessType(nextType)) {
          persistTenantBusinessType(nextType);
          setBusinessType(nextType);
        }
        setIsReady(true);
      })
      .catch(() => {
        // Fallback keeps education terms.
        if (mounted) setIsReady(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return {
    businessType,
    terms: getTerminology(businessType),
    isReady,
  };
}
