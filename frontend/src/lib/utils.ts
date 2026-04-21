import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { User } from '@/types';
import { getTerminology } from '@/lib/terminology';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function getImpactColor(impact: string): string {
  switch (impact) {
    case 'Baixo':
      return 'bg-green-100 text-green-800';
    case 'Médio':
      return 'bg-yellow-100 text-yellow-800';
    case 'Alto':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'Aguardando Validação':
      return 'bg-amber-100 text-amber-800';
    case 'Aprovada':
      return 'bg-sky-100 text-sky-800';
    case 'Rejeitada':
      return 'bg-rose-100 text-rose-800';
    case 'Fechado':
      return 'bg-slate-200 text-slate-700';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function formatUserRole(user?: User | null, businessType?: string | null): string {
  if (!user) return 'Perfil não informado';

  const terms = getTerminology(businessType);

  const roleLabelMap: Record<User['role'], string> = {
    MASTER: 'Master',
    ADMIN: 'Administrador',
    CHEFIA: 'Chefia',
    GESTOR_SETOR: terms.sectorManagerRoleLabel,
    DIRETOR: terms.directorRoleLabel,
    OPERADOR: 'Operador',
  };

  const roleLabel = roleLabelMap[user.role] || user.role;
  const details: string[] = [];

  if (user.setor_vinculado) {
    details.push(user.setor_vinculado);
  }

  if (user.role === 'DIRETOR' && user.escola_vinculada) {
    details.push(`${terms.unitSingular} ID ${user.escola_vinculada}`);
  }

  if (details.length === 0) {
    return roleLabel;
  }

  return `${roleLabel} • ${details.join(' • ')}`;
}
