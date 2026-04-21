export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  must_change_password: boolean;
  role: 'MASTER' | 'ADMIN' | 'CHEFIA' | 'GESTOR_SETOR' | 'DIRETOR' | 'OPERADOR';
  setor_vinculado?: string | null;
  escola_vinculada?: number | null;
  created_at: string;
}

export interface School {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  incident_count?: number;
}

export interface Incident {
  id: number;
  process_number: string;
  school_id: number;
  unidade_escolar?: string | null;
  setor?: string | null;
  operator_id: number;
  location: string;
  category?: string | null;
  impact_level: string;
  description: string;
  actions_taken: string | null;
  status: string;
  pdf_path: string | null;
  incident_date: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  validated_by?: number | null;
  validated_at?: string | null;
  rejection_reason?: string | null;
  validation_note?: string | null;
  school?: School;
  operator?: User;
  validator?: User;
}

export interface IncidentFormData {
  school_id: number;
  setor: string;
  location: string;
  incident_date?: string;
  impact_level: string;
  description: string;
  actions_taken?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  password_change_required: boolean;
  user: User;
}

export interface RefreshResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface PasswordChangePayload {
  current_password: string;
  new_password: string;
}

export interface DashboardStats {
  total_incidents: number;
  open_incidents: number;
  in_progress_incidents: number;
  resolved_incidents: number;
  rejected_incidents: number;
  monthly_incidents: number;
  high_impact_open: number;
}

export interface ChartData {
  setor?: string;
  school?: string;
  impact?: string;
  operator?: string;
  status?: string;
  location?: string;
  month?: string;
  region?: string;
  count: number;
}

export interface RecentIncident {
  id: number;
  process_number: string;
  school: string;
  setor: string;
  impact_level: string;
  status: string;
  operator: string;
  incident_date?: string;
  created_at: string;
}

export interface CriticalSchool {
  id: number;
  name: string;
  region: string;
  count: number;
}

export interface MonthlyTrend {
  month: string;
  count: number;
}

// Constantes
export const LOCATIONS = [] as const;

export const CATEGORIES = [] as const;

export const IMPACT_LEVELS = [] as const;

// Admin types
export interface Category {
  id: number;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ImpactLevel {
  id: number;
  name: string;
  description: string | null;
  color: string;
  severity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: number;
  user_id: number;
  action: string;
  entity_type: string;
  entity_id: number | null;
  description: string;
  ip_address: string | null;
  created_at: string;
  user_name: string | null;
}

export interface SystemConfig {
  id: number;
  key: string;
  value: string | null;
  description: string | null;
  updated_at: string;
  updated_by: number | null;
}

export interface AdminStats {
  total_users: number;
  active_users: number;
  total_schools: number;
  active_schools: number;
  total_incidents: number;
  archived_incidents: number;
  total_categories: number;
  total_locations: number;
  total_impact_levels: number;
}

export interface ArchiveRequest {
  incident_ids?: number[];
  start_date?: string;
  end_date?: string;
  archive_all?: boolean;
}

export interface AuditRetentionHealth {
  status: 'healthy' | 'warning' | 'critical' | 'info';
  message: string;
  schedule_enabled: boolean;
  interval_hours: number;
  max_expected_delay_hours: number;
  is_stale: boolean;
  last_run_at: string | null;
  next_expected_run_at: string | null;
  last_status: string | null;
  last_error: string | null;
}

export interface DashboardPreset {
  id: number;
  name: string;
  description?: string | null;
  config: Record<string, any>;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantUIConfig {
  app_name: string;
  subtitle: string;
  primary_color: string;
  accent_color: string;
}

export interface TenantProfile {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  business_type?: 'education' | 'condominium' | 'shopping' | null;
  onboarding_completed: boolean;
  onboarding_completed_at?: string | null;
  ui_config: TenantUIConfig;
}
