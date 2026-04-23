'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import {
  Settings,
  Users,
  School,
  Tag,
  MapPin,
  AlertTriangle,
  Archive,
  Activity,
  FileText,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Download,
  Check,
  X,
  Search,
  LogOut
} from 'lucide-react';
import {
  User,
  School as SchoolType,
  Category,
  Location,
  ImpactLevel,
  ActivityLog,
  SystemConfig,
  AdminStats,
  Incident,
  AuditRetentionHealth,
  TenantProfile,
  TenantUIConfig
} from '@/types';
import { useTenantTerminology } from '@/lib/terminology';
import { persistTenantBusinessType } from '@/lib/terminology';

const API_URL = '/backend';
const SHOWCASE_MODE = process.env.NEXT_PUBLIC_SHOWCASE_MODE === 'true';

const showcaseNow = new Date().toISOString();
const SHOWCASE_ADMIN_USER: User = {
  id: 1,
  username: 'admin',
  email: 'admin@nexocase.demo',
  full_name: 'Administrador Demo',
  is_active: true,
  is_admin: true,
  must_change_password: false,
  role: 'MASTER',
  created_at: showcaseNow,
};
const SHOWCASE_ADMIN_SCHOOLS: SchoolType[] = [
  { id: 1, name: 'Unidade Norte', address: 'Sao Paulo, SP', phone: '(11) 4000-1001', email: 'norte@nexocase.demo', is_active: true },
  { id: 2, name: 'Centro Operacional', address: 'Sao Paulo, SP', phone: '(11) 4000-1002', email: 'operacao@nexocase.demo', is_active: true },
  { id: 3, name: 'Unidade Sul', address: 'Sao Paulo, SP', phone: '(11) 4000-1003', email: 'sul@nexocase.demo', is_active: false },
];
const SHOWCASE_ADMIN_CATEGORIES: Category[] = [
  { id: 1, name: 'Monitoramento', description: 'Eventos de monitoramento', color: '#3b82f6', is_active: true, created_at: showcaseNow, updated_at: showcaseNow },
  { id: 2, name: 'Infraestrutura', description: 'Eventos de infraestrutura e disponibilidade', color: '#f59e0b', is_active: true, created_at: showcaseNow, updated_at: showcaseNow },
  { id: 3, name: 'Controle de Acesso', description: 'Eventos de identidade e acesso', color: '#10b981', is_active: true, created_at: showcaseNow, updated_at: showcaseNow },
];
const SHOWCASE_ADMIN_LOCATIONS: Location[] = [
  { id: 1, name: 'Central de Monitoramento', description: 'Centro de monitoramento', is_active: true, created_at: showcaseNow, updated_at: showcaseNow },
  { id: 2, name: 'Nucleo de Infraestrutura', description: 'Datacenter e rede principal', is_active: true, created_at: showcaseNow, updated_at: showcaseNow },
  { id: 3, name: 'Portaria Principal', description: 'Acesso ao perimetro', is_active: false, created_at: showcaseNow, updated_at: showcaseNow },
];
const SHOWCASE_ADMIN_IMPACT_LEVELS: ImpactLevel[] = [
  { id: 1, name: 'Baixo', description: 'Impacto baixo', color: '#22c55e', severity: 1, is_active: true, created_at: showcaseNow, updated_at: showcaseNow },
  { id: 2, name: 'Medio', description: 'Impacto moderado', color: '#f59e0b', severity: 2, is_active: true, created_at: showcaseNow, updated_at: showcaseNow },
  { id: 3, name: 'Alto', description: 'Impacto alto', color: '#ef4444', severity: 3, is_active: true, created_at: showcaseNow, updated_at: showcaseNow },
];
const SHOWCASE_ADMIN_USERS: User[] = [
  SHOWCASE_ADMIN_USER,
  { id: 2, username: 'demo.operator', email: 'operator@nexocase.demo', full_name: 'Operador de Monitoramento', is_active: true, is_admin: false, must_change_password: false, role: 'OPERADOR', created_at: showcaseNow },
  { id: 3, username: 'demo.director', email: 'gestor@nexocase.demo', full_name: 'Gestor Operacional', is_active: true, is_admin: false, must_change_password: false, role: 'DIRETOR', escola_vinculada: 1, created_at: showcaseNow },
  { id: 4, username: 'demo.manager', email: 'responsavel@nexocase.demo', full_name: 'Responsavel de Area', is_active: false, is_admin: false, must_change_password: false, role: 'GESTOR_SETOR', setor_vinculado: 'Infraestrutura', created_at: showcaseNow },
];
const SHOWCASE_ADMIN_LOGS: ActivityLog[] = [
  { id: 1, user_id: 1, action: 'LOGIN', entity_type: 'auth', entity_id: null, description: 'Login realizado com sucesso', ip_address: '127.0.0.1', created_at: showcaseNow, user_name: 'Administrador Demo' },
  { id: 2, user_id: 1, action: 'UPDATE', entity_type: 'config', entity_id: 11, description: 'Intervalo de retencao atualizado', ip_address: '127.0.0.1', created_at: showcaseNow, user_name: 'Administrador Demo' },
  { id: 3, user_id: 2, action: 'CREATE', entity_type: 'incident', entity_id: 101, description: 'Ocorrencia NC/2026/00001 criada', ip_address: '127.0.0.1', created_at: showcaseNow, user_name: 'Operador de Monitoramento' },
  { id: 4, user_id: 3, action: 'APPROVE', entity_type: 'incident', entity_id: 102, description: 'Ocorrencia NC/2026/00002 aprovada', ip_address: '127.0.0.1', created_at: showcaseNow, user_name: 'Gestor Operacional' },
];
const SHOWCASE_ADMIN_CONFIGS: SystemConfig[] = [
  { id: 1, key: 'audit_retention_enabled', value: 'true', description: 'Habilitar rotina de retencao', updated_at: showcaseNow, updated_by: 1 },
  { id: 2, key: 'audit_retention_last_status', value: 'success', description: 'Last retention status', updated_at: showcaseNow, updated_by: 1 },
  { id: 3, key: 'audit_retention_last_trigger', value: 'schedule', description: 'Last trigger source', updated_at: showcaseNow, updated_by: 1 },
  { id: 4, key: 'audit_retention_last_run_at', value: showcaseNow, description: 'Last execution timestamp', updated_at: showcaseNow, updated_by: 1 },
  { id: 5, key: 'audit_retention_last_started_at', value: showcaseNow, description: 'Last start timestamp', updated_at: showcaseNow, updated_by: 1 },
  { id: 6, key: 'audit_retention_last_finished_at', value: showcaseNow, description: 'Last finish timestamp', updated_at: showcaseNow, updated_by: 1 },
  { id: 7, key: 'audit_retention_last_cutoff_utc', value: showcaseNow, description: 'Last retention cutoff', updated_at: showcaseNow, updated_by: 1 },
  { id: 8, key: 'audit_retention_last_anonymized_count', value: '18', description: 'Anonymized logs', updated_at: showcaseNow, updated_by: 1 },
  { id: 9, key: 'audit_retention_last_removed_refresh_count', value: '9', description: 'Removed refresh tokens', updated_at: showcaseNow, updated_by: 1 },
  { id: 10, key: 'oficio_header_1', value: 'NexoCase Gestao Operacional', description: 'Cabecalho linha 1', updated_at: showcaseNow, updated_by: 1 },
  { id: 11, key: 'oficio_header_2', value: 'Central Executiva de Resposta', description: 'Cabecalho linha 2', updated_at: showcaseNow, updated_by: 1 },
  { id: 12, key: 'oficio_footer', value: 'Documento gerado automaticamente pelo NexoCase', description: 'Texto do rodape', updated_at: showcaseNow, updated_by: 1 },
  { id: 13, key: 'smtp_host', value: 'smtp.demo.local', description: 'Servidor SMTP', updated_at: showcaseNow, updated_by: 1 },
  { id: 14, key: 'smtp_port', value: '587', description: 'Porta SMTP', updated_at: showcaseNow, updated_by: 1 },
  { id: 15, key: 'email_from', value: 'no-reply@nexocase.demo', description: 'E-mail remetente', updated_at: showcaseNow, updated_by: 1 },
];
const SHOWCASE_RETENTION_HEALTH: AuditRetentionHealth = {
  status: 'healthy',
  message: 'Retention job executed within expected interval.',
  schedule_enabled: true,
  interval_hours: 24,
  max_expected_delay_hours: 30,
  is_stale: false,
  last_run_at: showcaseNow,
  next_expected_run_at: showcaseNow,
  last_status: 'success',
  last_error: null,
};
const SHOWCASE_TENANT_PROFILE: TenantProfile = {
  id: 1,
  name: 'NexoCase Demonstracao',
  slug: 'default',
  is_active: true,
  business_type: 'education',
  onboarding_completed: true,
  onboarding_completed_at: showcaseNow,
  ui_config: {
    app_name: 'NexoCase Demonstracao',
    subtitle: 'Plataforma de Gestao Operacional',
    primary_color: '#0f766e',
    accent_color: '#f59e0b',
  },
};
const SHOWCASE_ACTIVE_INCIDENTS: Incident[] = [
  {
    id: 101,
    process_number: 'NC/2026/00001',
    school_id: 1,
    unidade_escolar: 'Unidade Norte',
    setor: 'Monitoramento',
    operator_id: 2,
    location: 'Central de Monitoramento',
    category: 'Monitoramento',
    impact_level: 'High',
    description: 'Pico de autenticacao fora do padrao detectado.',
    actions_taken: 'Faixa de IP suspeita bloqueada.',
    status: 'Aguardando Validação',
    pdf_path: null,
    incident_date: showcaseNow,
    created_at: showcaseNow,
    updated_at: showcaseNow,
    resolved_at: null,
    validated_by: null,
    validated_at: null,
    rejection_reason: null,
    validation_note: null,
    school: SHOWCASE_ADMIN_SCHOOLS[0],
    operator: SHOWCASE_ADMIN_USERS[1],
    validator: undefined,
  },
  {
    id: 102,
    process_number: 'NC/2026/00002',
    school_id: 2,
    unidade_escolar: 'Centro Operacional',
    setor: 'Infraestrutura',
    operator_id: 2,
    location: 'Nucleo de Infraestrutura',
    category: 'Infraestrutura',
    impact_level: 'Critical',
    description: 'Evento de failover em equipamento principal.',
    actions_taken: 'Trafego redirecionado e equipamento substituido.',
    status: 'Aprovada',
    pdf_path: '/tmp/showcase.pdf',
    incident_date: showcaseNow,
    created_at: showcaseNow,
    updated_at: showcaseNow,
    resolved_at: null,
    validated_by: 3,
    validated_at: showcaseNow,
    rejection_reason: null,
    validation_note: 'Risco controlado.',
    school: SHOWCASE_ADMIN_SCHOOLS[1],
    operator: SHOWCASE_ADMIN_USERS[1],
    validator: SHOWCASE_ADMIN_USERS[2],
  },
];
const SHOWCASE_ARCHIVED_INCIDENTS: Incident[] = [
  {
    ...SHOWCASE_ACTIVE_INCIDENTS[1],
    id: 88,
    process_number: 'NC/2025/00088',
    status: 'Fechado',
    resolved_at: showcaseNow,
  },
];
const SHOWCASE_ADMIN_STATS: AdminStats = {
  total_users: SHOWCASE_ADMIN_USERS.length,
  active_users: SHOWCASE_ADMIN_USERS.filter((item) => item.is_active).length,
  total_schools: SHOWCASE_ADMIN_SCHOOLS.length,
  active_schools: SHOWCASE_ADMIN_SCHOOLS.filter((item) => item.is_active).length,
  total_incidents: SHOWCASE_ACTIVE_INCIDENTS.length,
  archived_incidents: SHOWCASE_ARCHIVED_INCIDENTS.length,
  total_categories: SHOWCASE_ADMIN_CATEGORIES.length,
  total_locations: SHOWCASE_ADMIN_LOCATIONS.length,
  total_impact_levels: SHOWCASE_ADMIN_IMPACT_LEVELS.length,
};

type TabType = 'overview' | 'schools' | 'categories' | 'locations' | 'impact-levels' | 'users' | 'archive' | 'logs' | 'config';

const PRESET_LABELS: Record<'education' | 'condominium' | 'shopping', string> = {
  education: 'Educação',
  condominium: 'Condomínio',
  shopping: 'Shopping',
};

export default function AdminPage() {
  const router = useRouter();
  const { terms, isReady } = useTenantTerminology();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  
  // Data states
  const [schools, setSchools] = useState<SchoolType[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [impactLevels, setImpactLevels] = useState<ImpactLevel[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [activeIncidents, setActiveIncidents] = useState<Incident[]>([]);
  const [archivedIncidents, setArchivedIncidents] = useState<Incident[]>([]);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [refreshingRetentionStatus, setRefreshingRetentionStatus] = useState(false);
  const [retentionHealth, setRetentionHealth] = useState<AuditRetentionHealth | null>(null);
  const [tenantProfile, setTenantProfile] = useState<TenantProfile | null>(null);
  const [tenantConfig, setTenantConfig] = useState<TenantUIConfig | null>(null);
  const [savingTenantConfig, setSavingTenantConfig] = useState(false);
  const [applyingPreset, setApplyingPreset] = useState(false);
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<string>('');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [schoolSearch, setSchoolSearch] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<number[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [selectedActiveIncidentIds, setSelectedActiveIncidentIds] = useState<number[]>([]);
  const [selectedArchivedIds, setSelectedArchivedIds] = useState<number[]>([]);
  const [schoolPage, setSchoolPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const [logPage, setLogPage] = useState(1);
  const [activeArchivePage, setActiveArchivePage] = useState(1);
  const [archivePage, setArchivePage] = useState(1);
  
  // Include inactive toggle
  const [includeInactive, setIncludeInactive] = useState(false);
  const SCHOOL_PAGE_SIZE = 10;
  const USER_PAGE_SIZE = 10;
  const LOG_PAGE_SIZE = 20;
  const ACTIVE_ARCHIVE_PAGE_SIZE = 10;
  const ARCHIVE_PAGE_SIZE = 10;

  useEffect(() => {
    const token = Cookies.get('token');
    const userStr = Cookies.get('user');
    
    if (!token || !userStr) {
      router.push('/login');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      if (user.role !== 'MASTER') {
        router.push('/dashboard');
        return;
      }
      setCurrentUser(user);
      loadStats();
    } catch (error) {
      console.error('Erro ao parsear usuário:', error);
      router.push('/login');
      return;
    }
    
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedState = window.localStorage.getItem('adminPanelState');
    if (!savedState) return;
    try {
      const parsed = JSON.parse(savedState);
      if (parsed.activeTab) setActiveTab(parsed.activeTab);
      if (typeof parsed.includeInactive === 'boolean') setIncludeInactive(parsed.includeInactive);
      if (typeof parsed.globalSearch === 'string') setGlobalSearch(parsed.globalSearch);
    } catch {
      // ignore invalid storage
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('adminPanelState', JSON.stringify({
      activeTab,
      includeInactive,
      globalSearch,
    }));
  }, [activeTab, includeInactive, globalSearch]);

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${Cookies.get('token')}`,
    'Content-Type': 'application/json'
  });

  const loadStats = async () => {
    if (SHOWCASE_MODE) {
      setStats(SHOWCASE_ADMIN_STATS);
      setRecentLogs(SHOWCASE_ADMIN_LOGS.slice(0, 5));
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/admin/stats`, { headers: getAuthHeaders() });
      if (res.ok) {
        setStats(await res.json());
      }
      const logsRes = await fetch(`${API_URL}/api/admin/activity-logs?limit=5`, { headers: getAuthHeaders() });
      if (logsRes.ok) {
        setRecentLogs(await logsRes.json());
      }
      // Carregar logo atual (com timestamp para evitar cache)
      const logoRes = await fetch(`${API_URL}/api/admin/logo-base64?t=${Date.now()}`, { headers: getAuthHeaders() });
      if (logoRes.ok) {
        const data = await logoRes.json();
        if (data.logo_base64) {
          setLogoPreview(data.logo_base64);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmText = 'CONFIRMAR';
    if (!confirm('Tem certeza que deseja atualizar a logo?')) return;
    const typed = prompt(`Digite ${confirmText} para confirmar:`);
    if (typed !== confirmText) return;

    // Preview local
    const reader = new FileReader();
    reader.onload = (e) => setLogoPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload para servidor
    if (SHOWCASE_MODE) {
      alert('Logo atualizada (simulação showcase).');
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch(`${API_URL}/api/admin/upload-logo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Cookies.get('token')}`
        },
        body: formData
      });

      if (res.ok) {
        alert('Logo atualizada com sucesso!');
      } else {
        const error = await res.json();
        alert(error.detail || 'Erro ao atualizar logo');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao enviar logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleConfigUpdate = async (key: string, value: string | null | undefined) => {
    const confirmText = 'SALVAR';
    if (!confirm('Tem certeza que deseja salvar esta configuração?')) return;
    const typed = prompt(`Digite ${confirmText} para confirmar:`);
    if (typed !== confirmText) return;
    if (SHOWCASE_MODE) {
      setConfigs((prev) => prev.map((config) => config.key === key ? { ...config, value: value ?? null, updated_at: new Date().toISOString() } : config));
    } else {
      await fetch(`${API_URL}/api/admin/config/${key}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ value })
      });
    }
    alert('Configuração salva!');
  };

  const handleSaveTenantConfig = async () => {
    if (!tenantConfig) return;
    if (SHOWCASE_MODE) {
      setTenantProfile((prev) => prev ? ({ ...prev, ui_config: tenantConfig }) : prev);
      alert('Configuração visual atualizada (simulação showcase).');
      return;
    }

    setSavingTenantConfig(true);
    try {
      const res = await fetch(`${API_URL}/api/tenant/ui-config`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(tenantConfig),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Erro ao salvar configuração visual do tenant');
      }
      alert('Configuração visual atualizada com sucesso.');
    } catch (error: any) {
      alert(error.message || 'Não foi possível salvar a configuração visual.');
    } finally {
      setSavingTenantConfig(false);
    }
  };

  const handleApplyTenantPreset = async (preset: 'education' | 'condominium' | 'shopping') => {
    if (!confirm(`Aplicar preset ${preset}? Isso substitui categorias, localizações e níveis de impacto ativos.`)) {
      return;
    }

    if (SHOWCASE_MODE) {
      const updatedTenant = {
        ...SHOWCASE_TENANT_PROFILE,
        business_type: preset,
      };
      setTenantProfile(updatedTenant);
      setTenantConfig(updatedTenant.ui_config);
      persistTenantBusinessType(updatedTenant.business_type || preset);
      alert('Preset aplicado com sucesso (simulação showcase).');
      return;
    }

    setApplyingPreset(true);
    try {
      const res = await fetch(`${API_URL}/api/tenant/apply-preset`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ preset }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Erro ao aplicar preset');
      }
      const updatedTenant = await res.json();
      setTenantProfile(updatedTenant);
      setTenantConfig(updatedTenant.ui_config);
      persistTenantBusinessType(updatedTenant?.business_type || preset);
      alert('Preset aplicado com sucesso. Atualize as telas de cadastro/listagem para recarregar as opções.');
    } catch (error: any) {
      alert(error.message || 'Falha ao aplicar preset.');
    } finally {
      setApplyingPreset(false);
    }
  };

  const loadData = async (tab: TabType) => {
    if (SHOWCASE_MODE) {
      switch (tab) {
        case 'schools':
          setSchools(SHOWCASE_ADMIN_SCHOOLS);
          break;
        case 'categories':
          setCategories(SHOWCASE_ADMIN_CATEGORIES);
          break;
        case 'locations':
          setLocations(SHOWCASE_ADMIN_LOCATIONS);
          break;
        case 'impact-levels':
          setImpactLevels(SHOWCASE_ADMIN_IMPACT_LEVELS);
          break;
        case 'users':
          setUsers(SHOWCASE_ADMIN_USERS);
          break;
        case 'logs':
          setActivityLogs(SHOWCASE_ADMIN_LOGS);
          break;
        case 'config':
          setConfigs(SHOWCASE_ADMIN_CONFIGS);
          setRetentionHealth(SHOWCASE_RETENTION_HEALTH);
          setTenantProfile(SHOWCASE_TENANT_PROFILE);
          setTenantConfig(SHOWCASE_TENANT_PROFILE.ui_config);
          break;
        case 'archive':
          setActiveIncidents(SHOWCASE_ACTIVE_INCIDENTS);
          setArchivedIncidents(SHOWCASE_ARCHIVED_INCIDENTS);
          break;
        default:
          break;
      }
      return;
    }

    const headers = getAuthHeaders();
    try {
      switch (tab) {
        case 'schools':
          const schoolsRes = await fetch(`${API_URL}/api/admin/schools?include_inactive=${includeInactive}`, { headers });
          if (schoolsRes.ok) setSchools(await schoolsRes.json());
          break;
        case 'categories':
          const catRes = await fetch(`${API_URL}/api/admin/categories?include_inactive=${includeInactive}`, { headers });
          if (catRes.ok) setCategories(await catRes.json());
          break;
        case 'locations':
          const locRes = await fetch(`${API_URL}/api/admin/locations?include_inactive=${includeInactive}`, { headers });
          if (locRes.ok) setLocations(await locRes.json());
          break;
        case 'impact-levels':
          const impRes = await fetch(`${API_URL}/api/admin/impact-levels?include_inactive=${includeInactive}`, { headers });
          if (impRes.ok) setImpactLevels(await impRes.json());
          break;
        case 'users':
          const usersRes = await fetch(`${API_URL}/api/admin/users?include_inactive=${includeInactive}`, { headers });
          if (usersRes.ok) setUsers(await usersRes.json());
          break;
        case 'logs':
          const logsRes = await fetch(`${API_URL}/api/admin/activity-logs?limit=100`, { headers });
          if (logsRes.ok) setActivityLogs(await logsRes.json());
          break;
        case 'config':
          const [configRes, healthRes, tenantRes] = await Promise.all([
            fetch(`${API_URL}/api/admin/config`, { headers }),
            fetch(`${API_URL}/api/admin/maintenance/health-retention`, { headers }),
            fetch(`${API_URL}/api/tenant/profile`, { headers }),
          ]);
          if (configRes.ok) setConfigs(await configRes.json());
          if (healthRes.ok) setRetentionHealth(await healthRes.json());
          if (tenantRes.ok) {
            const tenantData = await tenantRes.json();
            setTenantProfile(tenantData);
            setTenantConfig(tenantData.ui_config);
          }
          break;
        case 'archive':
          const [activeRes, archRes] = await Promise.all([
            fetch(`${API_URL}/api/incidents?archived=false&limit=1000`, { headers }),
            fetch(`${API_URL}/api/incidents?archived=true&limit=1000`, { headers }),
          ]);
          if (activeRes.ok) setActiveIncidents(await activeRes.json());
          if (archRes.ok) setArchivedIncidents(await archRes.json());
          break;
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const refreshRetentionStatus = async () => {
    if (SHOWCASE_MODE) {
      setConfigs(SHOWCASE_ADMIN_CONFIGS);
      setRetentionHealth(SHOWCASE_RETENTION_HEALTH);
      return;
    }

    setRefreshingRetentionStatus(true);
    try {
      const headers = getAuthHeaders();
      const [configRes, healthRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/config`, { headers }),
        fetch(`${API_URL}/api/admin/maintenance/health-retention`, { headers }),
      ]);
      if (configRes.ok) {
        setConfigs(await configRes.json());
      }
      if (healthRes.ok) {
        setRetentionHealth(await healthRes.json());
      }
    } catch (error) {
      console.error('Erro ao atualizar status de retenção:', error);
    } finally {
      setRefreshingRetentionStatus(false);
    }
  };

  const ensureSchoolsLoaded = async () => {
    if (SHOWCASE_MODE) {
      if (schools.length === 0) setSchools(SHOWCASE_ADMIN_SCHOOLS);
      return;
    }

    if (schools.length > 0) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/schools?include_inactive=false`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setSchools(await res.json());
      }
    } catch (error) {
      console.error('Erro ao carregar escolas:', error);
    }
  };

  const ensureCategoriesLoaded = async () => {
    if (SHOWCASE_MODE) {
      if (categories.length === 0) setCategories(SHOWCASE_ADMIN_CATEGORIES);
      return;
    }

    if (categories.length > 0) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/categories?include_inactive=false`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setCategories(await res.json());
      }
    } catch (error) {
      console.error('Erro ao carregar setores:', error);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadData(activeTab);
    }
  }, [activeTab, includeInactive, currentUser]);

  const handleCreate = async (type: string) => {
    setModalType(type);
    setEditingItem(null);
    setFormData(getDefaultFormData(type));
    if (type === 'user') {
      setSchoolSearch('');
      await Promise.all([ensureSchoolsLoaded(), ensureCategoriesLoaded()]);
    }
    setShowModal(true);
  };

  const handleEdit = async (type: string, item: any) => {
    setModalType(type);
    setEditingItem(item);
    setFormData({ ...item });
    if (type === 'user') {
      setSchoolSearch('');
      await Promise.all([ensureSchoolsLoaded(), ensureCategoriesLoaded()]);
    }
    setShowModal(true);
  };

  const handleDelete = async (type: string, id: number) => {
    if (!confirm('Tem certeza que deseja desativar este item?')) return;
    
    const endpoints: Record<string, string> = {
      school: 'schools',
      category: 'categories',
      location: 'locations',
      'impact-level': 'impact-levels',
      user: 'users'
    };

    try {
      const res = await fetch(`${API_URL}/api/admin/${endpoints[type]}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (res.ok) {
        loadData(activeTab);
        loadStats();
      } else {
        const error = await res.json();
        alert(error.detail || 'Erro ao desativar');
      }
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const handleSave = async () => {
    const endpoints: Record<string, string> = {
      school: 'schools',
      category: 'categories',
      location: 'locations',
      'impact-level': 'impact-levels',
      user: 'users',
      config: 'config'
    };

    const endpoint = endpoints[modalType];
    const method = editingItem ? 'PUT' : 'POST';
    const url = editingItem 
      ? `${API_URL}/api/admin/${endpoint}/${editingItem.id || editingItem.key}`
      : `${API_URL}/api/admin/${endpoint}`;

    const payload = { ...formData };
    if (modalType === 'user') {
      if (payload.role === 'DIRETOR' && !payload.escola_vinculada) {
        alert(`Selecione uma ${terms.unitSingular.toLowerCase()} para ${terms.directorRoleLabel.toLowerCase()}.`);
        return;
      }
      if (payload.role === 'GESTOR_SETOR' && !payload.setor_vinculado) {
        alert(`Selecione ${terms.sectorSingular.toLowerCase()} para ${terms.sectorManagerRoleLabel.toLowerCase()}.`);
        return;
      }
      if (payload.role !== 'DIRETOR') {
        payload.escola_vinculada = null;
      }
      if (payload.role !== 'GESTOR_SETOR') {
        payload.setor_vinculado = null;
      }
    }

    try {
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowModal(false);
        loadData(activeTab);
        loadStats();
      } else {
        const error = await res.json();
        alert(error.detail || 'Erro ao salvar');
      }
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const handleArchiveAll = async () => {
    const confirmText = 'ARQUIVAR';
    if (!confirm(`Tem certeza que deseja arquivar TODAS as ${terms.incidentPlural.toLowerCase()}? Esta ação pode ser revertida.`)) return;
    const typed = prompt(`Digite ${confirmText} para confirmar:`);
    if (typed !== confirmText) return;
    
    try {
      const res = await fetch(`${API_URL}/api/admin/incidents/archive`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ archive_all: true })
      });

      if (res.ok) {
        const result = await res.json();
        alert(result.message);
        loadStats();
      }
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const handleArchiveSelected = async () => {
    if (selectedActiveIncidentIds.length === 0) return;
    if (!confirm(`Deseja arquivar ${selectedActiveIncidentIds.length} ${terms.incidentSingular.toLowerCase()}(s)?`)) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/incidents/archive`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ incident_ids: selectedActiveIncidentIds })
      });

      if (res.ok) {
        const result = await res.json();
        alert(result.message);
        setSelectedActiveIncidentIds([]);
        loadData('archive');
        loadStats();
      } else {
        const error = await res.json();
        alert(error.detail || `Erro ao arquivar ${terms.incidentPlural.toLowerCase()} selecionadas`);
      }
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/export/incidents?include_archived=true`, {
        headers: getAuthHeaders()
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `incidentes_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
      }
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const handleExportUsersCSV = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/export/users`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `usuarios_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
      }
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const handleExportSchoolsCSV = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/export/schools`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${terms.unitPlural.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
      }
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const handleExportLogsCSV = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/export/logs`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
      }
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const handleBulkSchoolUpdate = async (isActive: boolean) => {
    if (selectedSchoolIds.length === 0) return;
    if (!confirm(`Deseja ${isActive ? 'ativar' : 'desativar'} ${selectedSchoolIds.length} ${terms.unitSingular.toLowerCase()}(s)?`)) return;
    try {
      await Promise.all(selectedSchoolIds.map((schoolId) =>
        fetch(`${API_URL}/api/admin/schools/${schoolId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ is_active: isActive })
        })
      ));
      setSelectedSchoolIds([]);
      loadData('schools');
      loadStats();
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const handleBulkUserUpdate = async (isActive: boolean) => {
    const targetIds = selectedUserIds.filter((id) => id !== currentUser?.id);
    if (targetIds.length === 0) return;
    if (!confirm(`Deseja ${isActive ? 'ativar' : 'desativar'} ${targetIds.length} usuário(s)?`)) return;
    try {
      await Promise.all(targetIds.map((userId) =>
        fetch(`${API_URL}/api/admin/users/${userId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ is_active: isActive })
        })
      ));
      setSelectedUserIds([]);
      loadData('users');
      loadStats();
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const handlePermanentDeleteUsers = async () => {
    const targetIds = selectedUserIds.filter((id) => id !== currentUser?.id);
    const confirmText = 'EXCLUIR';
    if (targetIds.length === 0) return;
    if (!confirm(`Deseja excluir permanentemente ${targetIds.length} usuário(s)?`)) return;
    const typed = prompt(`Digite ${confirmText} para confirmar:`);
    if (typed !== confirmText) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/users/permanent`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify(targetIds)
      });

      if (res.ok) {
        setSelectedUserIds([]);
        loadData('users');
        loadStats();
      } else {
        const error = await res.json();
        alert(error.detail || 'Erro ao excluir usuários');
      }
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const handleUnarchiveSelected = async () => {
    if (selectedArchivedIds.length === 0) return;
    if (!confirm(`Deseja restaurar ${selectedArchivedIds.length} ${terms.incidentSingular.toLowerCase()}(s)?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/incidents/unarchive`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(selectedArchivedIds)
      });
      if (res.ok) {
        setSelectedArchivedIds([]);
        loadData('archive');
        loadStats();
      }
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const handlePermanentDeleteSelected = async () => {
    const confirmText = 'EXCLUIR';
    if (selectedArchivedIds.length === 0) return;
    if (!confirm(`Deseja excluir permanentemente ${selectedArchivedIds.length} ${terms.incidentSingular.toLowerCase()}(s)?`)) return;
    const typed = prompt(`Digite ${confirmText} para confirmar:`);
    if (typed !== confirmText) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/incidents/permanent`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify(selectedArchivedIds)
      });
      if (res.ok) {
        setSelectedArchivedIds([]);
        loadData('archive');
        loadStats();
      }
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const getDefaultFormData = (type: string) => {
    switch (type) {
      case 'school':
        return { name: '', address: '', phone: '', email: '' };
      case 'category':
        return { name: '', description: '', color: '#3B82F6' };
      case 'location':
        return { name: '', description: '' };
      case 'impact-level':
        return { name: '', description: '', color: '#6B7280', severity: 1 };
      case 'user':
        return {
          username: '',
          email: '',
          full_name: '',
          password: '',
          role: 'DIRETOR',
          escola_vinculada: null,
          setor_vinculado: null,
        };
      default:
        return {};
    }
  };

  const handleLogout = async () => {
    const token = Cookies.get('token');
    const csrfToken = Cookies.get('nexocase_csrf_token') || Cookies.get('cco_csrf_token');

    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        body: JSON.stringify({}),
      });
    } catch {
      // noop
    }

    Cookies.remove('token');
    Cookies.remove('nexocase_csrf_token');
    Cookies.remove('cco_csrf_token');
    Cookies.remove('user');
    router.push('/login');
  };

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: Settings },
    { id: 'schools', label: terms.unitPlural, icon: School },
    { id: 'categories', label: terms.sectorPlural, icon: Tag },
    { id: 'locations', label: 'Localizações', icon: MapPin },
    { id: 'impact-levels', label: 'Níveis de Impacto', icon: AlertTriangle },
    { id: 'users', label: 'Usuários', icon: Users },
    { id: 'archive', label: 'Arquivamento', icon: Archive },
    { id: 'logs', label: 'Logs', icon: Activity },
    { id: 'config', label: 'Configurações', icon: FileText },
  ];

  const filteredSchoolOptions = schools.filter((school) => {
    if (!schoolSearch.trim()) return true;
    const needle = schoolSearch.trim().toLowerCase();
    return school.name.toLowerCase().includes(needle);
  });

  const normalizedSearch = globalSearch.trim().toLowerCase();
  const matchesSearch = (value?: string | number | null) => {
    if (!normalizedSearch) return true;
    const text = String(value ?? '').toLowerCase();
    return text.includes(normalizedSearch);
  };

  const filteredSchoolsList = schools.filter((school) => (
    matchesSearch(school.name) ||
    matchesSearch(school.address) ||
    matchesSearch(school.email) ||
    matchesSearch(school.phone)
  ));
  const filteredUsersList = users.filter((user) => (
    matchesSearch(user.full_name) ||
    matchesSearch(user.username) ||
    matchesSearch(user.email) ||
    matchesSearch(user.role)
  ));
  const filteredCategoriesList = categories.filter((cat) => (
    matchesSearch(cat.name) || matchesSearch(cat.description)
  ));
  const filteredLocationsList = locations.filter((loc) => (
    matchesSearch(loc.name) || matchesSearch(loc.description)
  ));
  const filteredImpactLevelsList = impactLevels.filter((level) => (
    matchesSearch(level.name) || matchesSearch(level.description)
  ));
  const filteredLogsList = activityLogs.filter((log) => (
    matchesSearch(log.user_name) ||
    matchesSearch(log.description) ||
    matchesSearch(log.action) ||
    matchesSearch(log.entity_type) ||
    matchesSearch(log.ip_address)
  ));
  const filteredActiveArchiveList = activeIncidents.filter((incident) => (
    matchesSearch(incident.process_number) ||
    matchesSearch(incident.school?.name) ||
    matchesSearch(incident.unidade_escolar) ||
    matchesSearch(incident.impact_level) ||
    matchesSearch(incident.status)
  ));
  const filteredArchivedList = archivedIncidents.filter((incident) => (
    matchesSearch(incident.process_number) ||
    matchesSearch(incident.school?.name) ||
    matchesSearch(incident.unidade_escolar) ||
    matchesSearch(incident.impact_level) ||
    matchesSearch(incident.status)
  ));

  const paginate = <T,>(items: T[], page: number, pageSize: number) => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  };

  const schoolTotalPages = Math.max(1, Math.ceil(filteredSchoolsList.length / SCHOOL_PAGE_SIZE));
  const userTotalPages = Math.max(1, Math.ceil(filteredUsersList.length / USER_PAGE_SIZE));
  const logTotalPages = Math.max(1, Math.ceil(filteredLogsList.length / LOG_PAGE_SIZE));
  const activeArchiveTotalPages = Math.max(1, Math.ceil(filteredActiveArchiveList.length / ACTIVE_ARCHIVE_PAGE_SIZE));
  const archiveTotalPages = Math.max(1, Math.ceil(filteredArchivedList.length / ARCHIVE_PAGE_SIZE));

  const paginatedSchools = paginate(filteredSchoolsList, schoolPage, SCHOOL_PAGE_SIZE);
  const paginatedUsers = paginate(filteredUsersList, userPage, USER_PAGE_SIZE);
  const paginatedLogs = paginate(filteredLogsList, logPage, LOG_PAGE_SIZE);
  const paginatedActiveArchive = paginate(filteredActiveArchiveList, activeArchivePage, ACTIVE_ARCHIVE_PAGE_SIZE);
  const paginatedArchived = paginate(filteredArchivedList, archivePage, ARCHIVE_PAGE_SIZE);

  const getConfigValue = (key: string) => configs.find((config) => config.key === key)?.value ?? null;
  const getConfigValueAny = (keys: string[]) => {
    for (const key of keys) {
      const value = getConfigValue(key);
      if (value !== null && value !== '') return value;
    }
    return null;
  };
  const parseConfigCount = (value: string | null) => {
    const parsed = Number(value ?? '0');
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const formatConfigDate = (value: string | null) => {
    if (!value) return '-';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('pt-BR');
  };

  const retentionStatus = getConfigValue('audit_retention_last_status');
  const retentionTrigger = getConfigValue('audit_retention_last_trigger');
  const retentionRunAt = getConfigValue('audit_retention_last_run_at');
  const retentionStartedAt = getConfigValue('audit_retention_last_started_at');
  const retentionFinishedAt = getConfigValue('audit_retention_last_finished_at');
  const retentionCutoffDate = getConfigValueAny(['audit_retention_last_cutoff_utc', 'audit_retention_last_cutoff_date']);
  const retentionAnonymized = parseConfigCount(getConfigValue('audit_retention_last_anonymized_count'));
  const retentionRemovedRefresh = parseConfigCount(getConfigValueAny(['audit_retention_last_removed_refresh_count', 'audit_retention_last_deleted_count']));
  const retentionError = getConfigValue('audit_retention_last_error');
  const retentionHealthStatus = retentionHealth?.status || 'info';
  const retentionHealthStyle =
    retentionHealthStatus === 'healthy'
      ? 'bg-green-100 text-green-700'
      : retentionHealthStatus === 'warning'
      ? 'bg-yellow-100 text-yellow-700'
      : retentionHealthStatus === 'critical'
      ? 'bg-red-100 text-red-700'
      : 'bg-blue-100 text-primary-700';
  const retentionHealthLabel =
    retentionHealthStatus === 'healthy'
      ? 'Saudável'
      : retentionHealthStatus === 'warning'
      ? 'Atenção'
      : retentionHealthStatus === 'critical'
      ? 'Crítico'
      : 'Informativo';

  const allSchoolsSelected = paginatedSchools.length > 0 && paginatedSchools.every((school) => selectedSchoolIds.includes(school.id));
  const allUsersSelected = paginatedUsers.length > 0 && paginatedUsers.every((user) => selectedUserIds.includes(user.id));
  const allActiveArchiveSelected = paginatedActiveArchive.length > 0 && paginatedActiveArchive.every((incident) => selectedActiveIncidentIds.includes(incident.id));
  const allArchivedSelected = paginatedArchived.length > 0 && paginatedArchived.every((incident) => selectedArchivedIds.includes(incident.id));

  const selectedSchool = schools.find((school) => school.id === formData.escola_vinculada);
  const isEditingMasterUser = modalType === 'user' && editingItem?.role === 'MASTER';

  useEffect(() => {
    setSchoolPage(1);
    setUserPage(1);
    setLogPage(1);
    setActiveArchivePage(1);
    setArchivePage(1);
  }, [globalSearch, includeInactive]);

  useEffect(() => {
    setSelectedSchoolIds([]);
    setSelectedUserIds([]);
    setSelectedActiveIncidentIds([]);
    setSelectedArchivedIds([]);
  }, [activeTab]);

  if (loading || !isReady) {
    return <div className="min-h-screen bg-secondary-50" />;
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-secondary-900 via-secondary-800 to-secondary-900 shadow-lg sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-white/10 backdrop-blur rounded-xl ring-1 ring-white/20">
              <Settings className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Painel Administrativo</h1>
              <p className="text-sm text-secondary-400">NexoCase - Gestão do Sistema</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-sm text-secondary-300 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
            >
              ← Painel
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0">
            <nav className="bg-gradient-to-b from-secondary-900 via-secondary-850 to-secondary-900 rounded-2xl shadow-lg p-3 sticky top-24 ring-1 ring-secondary-700/50">
              <div className="px-3 py-2 mb-2">
                <p className="text-xs font-semibold text-secondary-500 uppercase tracking-wider">Menu</p>
              </div>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 mb-0.5 ${
                    activeTab === tab.id
                      ? 'bg-primary-600/20 text-primary-400 shadow-sm border-l-[3px] border-primary-400'
                      : 'text-secondary-400 hover:bg-white/5 hover:text-secondary-200 hover:translate-x-0.5'
                  }`}
                >
                  <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-primary-400' : ''}`} />
                  <span className="font-medium text-sm">{tab.label}</span>
                  {activeTab === tab.id && <ChevronRight className="w-4 h-4 ml-auto text-primary-400" />}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <div className="mb-5 bg-white rounded-2xl shadow-sm border border-secondary-200/60 p-4 flex items-center gap-3">
              <div className="p-2 bg-secondary-100 rounded-xl">
                <Search className="w-4 h-4 text-secondary-500" />
              </div>
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder={`Buscar em ${terms.unitPlural.toLowerCase()}, usuarios, ${terms.sectorPlural.toLowerCase()}, logs...`}
                className="flex-1 px-3 py-2.5 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 hover:border-secondary-400 transition-colors bg-secondary-50/50 text-sm"
              />
              {globalSearch ? (
                <button
                  onClick={() => setGlobalSearch('')}
                  className="px-3 py-1.5 text-sm text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 rounded-xl transition-colors"
                >
                  Limpar
                </button>
              ) : null}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && stats && (
              <div className="space-y-6 animate-fade-in">
                {/* Hero Banner */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 p-8 text-white">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
                  <div className="relative z-10">
                    <h2 className="text-2xl font-bold tracking-tight">Visão Geral do Sistema</h2>
                    <p className="text-primary-200 mt-1">Monitore e gerencie todos os recursos da plataforma</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-5">
                  <div className="group bg-white p-6 rounded-2xl shadow-sm border border-secondary-200/60 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                        <Users className="w-6 h-6 text-primary-600" />
                      </div>
                      <div>
                        <p className="text-sm text-secondary-500 font-medium">Usuários Ativos</p>
                        <p className="text-3xl font-bold text-secondary-900 tracking-tight">{stats.active_users}<span className="text-lg text-secondary-400 font-normal">/{stats.total_users}</span></p>
                      </div>
                    </div>
                    <div className="mt-4 h-1.5 bg-secondary-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full transition-all duration-500" style={{ width: `${stats.total_users > 0 ? (stats.active_users / stats.total_users) * 100 : 0}%` }} />
                    </div>
                  </div>
                  
                  <div className="group bg-white p-6 rounded-2xl shadow-sm border border-secondary-200/60 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-100 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                        <School className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-secondary-500 font-medium">{terms.unitPlural} Ativas</p>
                        <p className="text-3xl font-bold text-secondary-900 tracking-tight">{stats.active_schools}<span className="text-lg text-secondary-400 font-normal">/{stats.total_schools}</span></p>
                      </div>
                    </div>
                    <div className="mt-4 h-1.5 bg-secondary-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${stats.total_schools > 0 ? (stats.active_schools / stats.total_schools) * 100 : 0}%` }} />
                    </div>
                  </div>
                  
                  <div className="group bg-white p-6 rounded-2xl shadow-sm border border-secondary-200/60 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-orange-100 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                        <FileText className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm text-secondary-500 font-medium">{terms.incidentPlural}</p>
                        <p className="text-3xl font-bold text-secondary-900 tracking-tight">{stats.total_incidents}</p>
                        <p className="text-xs text-secondary-400 mt-0.5">{stats.archived_incidents} arquivadas</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-5">
                  <div className="group bg-white p-6 rounded-2xl shadow-sm border border-secondary-200/60 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-100 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                        <Tag className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-secondary-500 font-medium">{terms.sectorPlural}</p>
                        <p className="text-3xl font-bold text-secondary-900 tracking-tight">{stats.total_categories}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="group bg-white p-6 rounded-2xl shadow-sm border border-secondary-200/60 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-cyan-100 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                        <MapPin className="w-6 h-6 text-cyan-600" />
                      </div>
                      <div>
                        <p className="text-sm text-secondary-500 font-medium">Localizações</p>
                        <p className="text-3xl font-bold text-secondary-900 tracking-tight">{stats.total_locations}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="group bg-white p-6 rounded-2xl shadow-sm border border-secondary-200/60 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-red-100 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm text-secondary-500 font-medium">Níveis de Impacto</p>
                        <p className="text-3xl font-bold text-secondary-900 tracking-tight">{stats.total_impact_levels}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-200/60">
                  <h3 className="text-lg font-semibold text-secondary-900 mb-4">Ações Rápidas</h3>
                  <div className="flex gap-3">
                    <button
                      onClick={handleExportCSV}
                      className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-200 hover:shadow-md active:scale-[0.98]"
                    >
                      <Download className="w-4 h-4" />
                      Exportar Dados (CSV)
                    </button>
                    <button
                      onClick={handleArchiveAll}
                      className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all duration-200 hover:shadow-md active:scale-[0.98]"
                    >
                      <Archive className="w-4 h-4" />
                      Arquivar Todas as {terms.incidentPlural}
                    </button>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-200/60">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-semibold text-secondary-900">Últimas ações administrativas</h3>
                    <button
                      onClick={() => setActiveTab('logs')}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Ver log completo →
                    </button>
                  </div>
                  {recentLogs.length > 0 ? (
                    <div className="space-y-2">
                      {recentLogs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between text-sm p-3 rounded-xl hover:bg-secondary-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              log.action === 'CREATE' ? 'bg-green-500' :
                              log.action === 'UPDATE' ? 'bg-blue-500' :
                              log.action === 'DELETE' ? 'bg-red-500' :
                              'bg-secondary-400'
                            }`} />
                            <div>
                              <p className="text-secondary-900 font-medium">{log.description}</p>
                              <p className="text-secondary-500 text-xs">{log.user_name || '-'} • {new Date(log.created_at).toLocaleString('pt-BR')}</p>
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                            log.action === 'CREATE' ? 'bg-green-100 text-green-700' :
                            log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                            log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                            'bg-secondary-100 text-secondary-700'
                          }`}>
                            {log.action}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="w-8 h-8 text-secondary-300 mx-auto mb-2" />
                      <p className="text-sm text-secondary-500">Nenhuma atividade recente.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Schools Tab */}
            {activeTab === 'schools' && (
              <div className="space-y-5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-secondary-900 tracking-tight">{terms.unitPlural}</h2>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={includeInactive}
                        onChange={(e) => setIncludeInactive(e.target.checked)}
                        className="rounded"
                      />
                      Mostrar inativas
                    </label>
                    <button
                      onClick={handleExportSchoolsCSV}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700"
                    >
                      <Download className="w-4 h-4" />
                      Exportar CSV
                    </button>
                    <button
                      onClick={() => handleBulkSchoolUpdate(true)}
                      disabled={selectedSchoolIds.length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Check className="w-4 h-4" />
                      Ativar Selecionadas
                    </button>
                    <button
                      onClick={() => handleBulkSchoolUpdate(false)}
                      disabled={selectedSchoolIds.length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <X className="w-4 h-4" />
                      Desativar Selecionadas
                    </button>
                    <button
                      onClick={() => handleCreate('school')}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700"
                    >
                      <Plus className="w-4 h-4" />
                      Nova {terms.unitSingular}
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-secondary-200/60 overflow-hidden">
                  <table className="w-full table-striped">
                    <thead className="bg-secondary-50/80">
                      <tr>
                        <th className="px-4 py-3 text-center text-sm font-medium text-secondary-600">
                          <input
                            type="checkbox"
                            checked={allSchoolsSelected}
                            onChange={() => {
                              if (allSchoolsSelected) {
                                setSelectedSchoolIds((prev) => prev.filter((id) => !paginatedSchools.some((school) => school.id === id)));
                              } else {
                                setSelectedSchoolIds((prev) => Array.from(new Set([...prev, ...paginatedSchools.map((school) => school.id)])));
                              }
                            }}
                            className="rounded"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-secondary-600">Nome</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-secondary-600">Endereço</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-secondary-600">{terms.incidentPlural}</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-secondary-600">Status</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-secondary-600">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-100">
                      {paginatedSchools.map((school) => (
                        <tr key={school.id} className={!school.is_active ? 'bg-secondary-50 opacity-60' : ''}>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedSchoolIds.includes(school.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedSchoolIds((prev) => [...prev, school.id]);
                                } else {
                                  setSelectedSchoolIds((prev) => prev.filter((id) => id !== school.id));
                                }
                              }}
                              className="rounded"
                            />
                          </td>
                          <td className="px-4 py-3 font-medium text-secondary-900">{school.name}</td>
                          <td className="px-4 py-3 text-secondary-600 text-sm">{school.address || '-'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-1 bg-blue-100 text-primary-700 rounded text-sm">
                              {school.incident_count || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {school.is_active ? (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Ativa</span>
                            ) : (
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Inativa</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEdit('school', school)}
                                className="p-1 text-primary-600 hover:bg-primary-50 rounded-xl transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              {school.is_active && (
                                <button
                                  onClick={() => handleDelete('school', school.id)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex items-center justify-between px-5 py-3 border-t border-secondary-100 bg-secondary-50/50">
                    <span className="text-sm text-secondary-500">
                      Página {schoolPage} de {schoolTotalPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSchoolPage((prev) => Math.max(1, prev - 1))}
                        disabled={schoolPage === 1}
                        className="px-3 py-1.5 text-sm rounded-xl border border-secondary-200 bg-white hover:bg-secondary-50 disabled:opacity-50 transition-colors"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => setSchoolPage((prev) => Math.min(schoolTotalPages, prev + 1))}
                        disabled={schoolPage === schoolTotalPages}
                        className="px-3 py-1.5 text-sm rounded-xl border border-secondary-200 bg-white hover:bg-secondary-50 disabled:opacity-50 transition-colors"
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Categories Tab */}
            {activeTab === 'categories' && (
              <div className="space-y-5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-secondary-900 tracking-tight">{terms.sectorPlural}</h2>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={includeInactive}
                        onChange={(e) => setIncludeInactive(e.target.checked)}
                        className="rounded"
                      />
                      Mostrar inativas
                    </label>
                    <button
                      onClick={() => handleCreate('category')}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700"
                    >
                      <Plus className="w-4 h-4" />
                      Novo {terms.sectorSingular}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  {filteredCategoriesList.map((cat) => (
                    <div
                      key={cat.id}
                      className={`bg-white p-5 rounded-2xl shadow-sm border border-secondary-200/60 border-l-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${!cat.is_active ? 'opacity-60' : ''}`}
                      style={{ borderLeftColor: cat.color }}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-secondary-900">{cat.name}</h3>
                          <p className="text-sm text-secondary-500 mt-1">{cat.description || 'Sem descrição'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit('category', cat)}
                            className="p-1 text-primary-600 hover:bg-primary-50 rounded-xl transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {cat.is_active && (
                            <button
                              onClick={() => handleDelete('category', cat.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-xs text-secondary-400">{cat.color}</span>
                        {!cat.is_active && (
                          <span className="ml-auto px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Inativa</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Locations Tab */}
            {activeTab === 'locations' && (
              <div className="space-y-5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-secondary-900 tracking-tight">Localizações</h2>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={includeInactive}
                        onChange={(e) => setIncludeInactive(e.target.checked)}
                        className="rounded"
                      />
                      Mostrar inativas
                    </label>
                    <button
                      onClick={() => handleCreate('location')}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700"
                    >
                      <Plus className="w-4 h-4" />
                      Nova Localização
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-5">
                  {filteredLocationsList.map((loc) => (
                    <div
                      key={loc.id}
                      className={`bg-white p-5 rounded-2xl shadow-sm border border-secondary-200/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${!loc.is_active ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-cyan-100 rounded-xl">
                            <MapPin className="w-5 h-5 text-cyan-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-secondary-900">{loc.name}</h3>
                            <p className="text-sm text-secondary-500">{loc.description || '-'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit('location', loc)}
                            className="p-1 text-primary-600 hover:bg-primary-50 rounded-xl transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {loc.is_active && (
                            <button
                              onClick={() => handleDelete('location', loc.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      {!loc.is_active && (
                        <span className="mt-2 inline-block px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Inativa</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Impact Levels Tab */}
            {activeTab === 'impact-levels' && (
              <div className="space-y-5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-secondary-900 tracking-tight">Níveis de Impacto</h2>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={includeInactive}
                        onChange={(e) => setIncludeInactive(e.target.checked)}
                        className="rounded"
                      />
                      Mostrar inativos
                    </label>
                    <button
                      onClick={() => handleCreate('impact-level')}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700"
                    >
                      <Plus className="w-4 h-4" />
                      Novo Nível
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  {filteredImpactLevelsList.map((level) => (
                    <div
                      key={level.id}
                      className={`bg-white p-5 rounded-2xl shadow-sm border border-secondary-200/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${!level.is_active ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="p-3 rounded-xl"
                            style={{ backgroundColor: `${level.color}20` }}
                          >
                            <AlertTriangle className="w-6 h-6" style={{ color: level.color }} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-secondary-900">{level.name}</h3>
                            <p className="text-sm text-secondary-500">{level.description || '-'}</p>
                            <p className="text-xs text-secondary-400 mt-1">Severidade: {level.severity}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit('impact-level', level)}
                            className="p-1 text-primary-600 hover:bg-primary-50 rounded-xl transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {level.is_active && (
                            <button
                              onClick={() => handleDelete('impact-level', level.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-secondary-900 tracking-tight">Usuários</h2>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={includeInactive}
                        onChange={(e) => setIncludeInactive(e.target.checked)}
                        className="rounded"
                      />
                      Mostrar inativos
                    </label>
                    <button
                      onClick={handleExportUsersCSV}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700"
                    >
                      <Download className="w-4 h-4" />
                      Exportar CSV
                    </button>
                    <button
                      onClick={() => handleBulkUserUpdate(true)}
                      disabled={selectedUserIds.length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Check className="w-4 h-4" />
                      Ativar Selecionados
                    </button>
                    <button
                      onClick={() => handleBulkUserUpdate(false)}
                      disabled={selectedUserIds.length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <X className="w-4 h-4" />
                      Desativar Selecionados
                    </button>
                    <button
                      onClick={handlePermanentDeleteUsers}
                      disabled={selectedUserIds.length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-rose-700 text-white rounded-xl hover:bg-rose-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir Permanente
                    </button>
                    <button
                      onClick={() => handleCreate('user')}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700"
                    >
                      <Plus className="w-4 h-4" />
                      Novo Usuário
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-secondary-200/60 overflow-hidden">
                  <table className="w-full table-striped">
                    <thead className="bg-secondary-50/80">
                      <tr>
                        <th className="px-4 py-3 text-center text-sm font-medium text-secondary-600">
                          <input
                            type="checkbox"
                            checked={allUsersSelected}
                            onChange={() => {
                              if (allUsersSelected) {
                                setSelectedUserIds((prev) => prev.filter((id) => !paginatedUsers.some((user) => user.id === id)));
                              } else {
                                setSelectedUserIds((prev) => Array.from(new Set([...prev, ...paginatedUsers.map((user) => user.id)])));
                              }
                            }}
                            className="rounded"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-secondary-600">Nome</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-secondary-600">Usuário</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-secondary-600">E-mail</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-secondary-600">Tipo</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-secondary-600">Status</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-secondary-600">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-100">
                      {paginatedUsers.map((user) => (
                        <tr key={user.id} className={!user.is_active ? 'bg-secondary-50 opacity-60' : ''}>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedUserIds.includes(user.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUserIds((prev) => [...prev, user.id]);
                                } else {
                                  setSelectedUserIds((prev) => prev.filter((id) => id !== user.id));
                                }
                              }}
                              disabled={user.id === currentUser?.id}
                              className="rounded"
                            />
                          </td>
                          <td className="px-4 py-3 font-medium text-secondary-900">{user.full_name}</td>
                          <td className="px-4 py-3 text-secondary-600">{user.username}</td>
                          <td className="px-4 py-3 text-secondary-600 text-sm">{user.email}</td>
                          <td className="px-4 py-3 text-center">
                            {user.role === 'MASTER' && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">Master</span>
                            )}
                            {user.role === 'CHEFIA' && (
                              <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs">Chefia</span>
                            )}
                            {user.role === 'GESTOR_SETOR' && (
                              <span className="px-2 py-1 bg-sky-100 text-sky-800 rounded text-xs">{terms.sectorManagerRoleLabel}</span>
                            )}
                            {user.role === 'DIRETOR' && (
                              <span className="px-2 py-1 bg-secondary-100 text-secondary-700 rounded text-xs">{terms.directorRoleLabel}</span>
                            )}
                            {user.role === 'OPERADOR' && (
                              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs">Operador</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {user.is_active ? (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Ativo</span>
                            ) : (
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Inativo</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEdit('user', user)}
                                className="p-1 text-primary-600 hover:bg-primary-50 rounded-xl transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              {user.is_active && user.id !== currentUser?.id && (
                                <button
                                  onClick={() => handleDelete('user', user.id)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex items-center justify-between px-5 py-3 border-t border-secondary-100 bg-secondary-50/50">
                    <span className="text-sm text-secondary-500">
                      Página {userPage} de {userTotalPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setUserPage((prev) => Math.max(1, prev - 1))}
                        disabled={userPage === 1}
                        className="px-3 py-1.5 text-sm rounded-xl border border-secondary-200 bg-white hover:bg-secondary-50 disabled:opacity-50 transition-colors"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => setUserPage((prev) => Math.min(userTotalPages, prev + 1))}
                        disabled={userPage === userTotalPages}
                        className="px-3 py-1.5 text-sm rounded-xl border border-secondary-200 bg-white hover:bg-secondary-50 disabled:opacity-50 transition-colors"
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Archive Tab */}
            {activeTab === 'archive' && (
              <div className="space-y-5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-secondary-900 tracking-tight">Arquivamento de {terms.incidentPlural}</h2>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-200/60">
                  <h3 className="text-lg font-semibold text-secondary-900 mb-4">Ações de Arquivamento</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-yellow-800">Atenção</h4>
                          <p className="text-sm text-yellow-700 mt-1">
                            {terms.incidentPlural} arquivadas não aparecem nos relatórios e dashboard, mas podem ser restauradas.
                            A exclusão permanente só pode ser feita em {terms.incidentPlural.toLowerCase()} já arquivadas.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={handleArchiveSelected}
                        disabled={selectedActiveIncidentIds.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Archive className="w-4 h-4" />
                        Arquivar Selecionadas
                      </button>
                      <button
                        onClick={handleArchiveAll}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700"
                      >
                        <Archive className="w-4 h-4" />
                        Arquivar Todas as {terms.incidentPlural}
                      </button>
                      <button
                        onClick={handleUnarchiveSelected}
                        disabled={selectedArchivedIds.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Check className="w-4 h-4" />
                        Restaurar Selecionadas
                      </button>
                      <button
                        onClick={handlePermanentDeleteSelected}
                        disabled={selectedArchivedIds.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                        Excluir Permanente
                      </button>
                      <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700"
                      >
                        <Download className="w-4 h-4" />
                        Exportar para CSV
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-200/60">
                  <h3 className="text-lg font-semibold text-secondary-900 mb-4">
                    Estatísticas
                  </h3>
                  <div className="grid grid-cols-2 gap-5">
                    <div className="p-4 bg-primary-50 rounded-xl">
                      <p className="text-sm text-primary-600">{terms.incidentPlural} Ativas</p>
                      <p className="text-3xl font-bold text-primary-700">{stats?.total_incidents || 0}</p>
                    </div>
                    <div className="p-4 bg-secondary-50 rounded-xl">
                      <p className="text-sm text-secondary-600">{terms.incidentPlural} Arquivadas</p>
                      <p className="text-3xl font-bold text-secondary-700">{stats?.archived_incidents || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-secondary-200/60 overflow-hidden">
                  <div className="px-4 py-3 border-b bg-secondary-50">
                    <h3 className="text-sm font-semibold text-secondary-700">{terms.incidentPlural} Ativas (para arquivar)</h3>
                  </div>
                  <table className="w-full table-striped">
                    <thead className="bg-secondary-50/80">
                      <tr>
                        <th className="px-4 py-3 text-center text-sm font-medium text-secondary-600">
                          <input
                            type="checkbox"
                            checked={allActiveArchiveSelected}
                            onChange={() => {
                              if (allActiveArchiveSelected) {
                                setSelectedActiveIncidentIds((prev) => prev.filter((id) => !paginatedActiveArchive.some((incident) => incident.id === id)));
                              } else {
                                setSelectedActiveIncidentIds((prev) => Array.from(new Set([...prev, ...paginatedActiveArchive.map((incident) => incident.id)])));
                              }
                            }}
                            className="rounded"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-secondary-600">Processo</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-secondary-600">{terms.unitSingular}</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-secondary-600">Impacto</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-secondary-600">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-secondary-600">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-100">
                      {paginatedActiveArchive.map((incident) => (
                        <tr key={incident.id}>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedActiveIncidentIds.includes(incident.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedActiveIncidentIds((prev) => [...prev, incident.id]);
                                } else {
                                  setSelectedActiveIncidentIds((prev) => prev.filter((id) => id !== incident.id));
                                }
                              }}
                              className="rounded"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-secondary-700">{incident.process_number}</td>
                          <td className="px-4 py-3 text-sm text-secondary-700">
                            {incident.school?.name || incident.unidade_escolar || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-secondary-700">{incident.impact_level}</td>
                          <td className="px-4 py-3 text-sm text-secondary-700">{incident.status}</td>
                          <td className="px-4 py-3 text-sm text-secondary-500">
                            {incident.incident_date ? new Date(incident.incident_date).toLocaleDateString('pt-BR') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex items-center justify-between px-5 py-3 border-t border-secondary-100 bg-secondary-50/50">
                    <span className="text-sm text-secondary-500">
                      Página {activeArchivePage} de {activeArchiveTotalPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setActiveArchivePage((prev) => Math.max(1, prev - 1))}
                        disabled={activeArchivePage === 1}
                        className="px-3 py-1.5 text-sm rounded-xl border border-secondary-200 bg-white hover:bg-secondary-50 disabled:opacity-50 transition-colors"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => setActiveArchivePage((prev) => Math.min(activeArchiveTotalPages, prev + 1))}
                        disabled={activeArchivePage === activeArchiveTotalPages}
                        className="px-3 py-1.5 text-sm rounded-xl border border-secondary-200 bg-white hover:bg-secondary-50 disabled:opacity-50 transition-colors"
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-secondary-200/60 overflow-hidden">
                  <div className="px-4 py-3 border-b bg-secondary-50">
                    <h3 className="text-sm font-semibold text-secondary-700">{terms.incidentPlural} Arquivadas</h3>
                  </div>
                  <table className="w-full table-striped">
                    <thead className="bg-secondary-50/80">
                      <tr>
                        <th className="px-4 py-3 text-center text-sm font-medium text-secondary-600">
                          <input
                            type="checkbox"
                            checked={allArchivedSelected}
                            onChange={() => {
                              if (allArchivedSelected) {
                                setSelectedArchivedIds((prev) => prev.filter((id) => !paginatedArchived.some((incident) => incident.id === id)));
                              } else {
                                setSelectedArchivedIds((prev) => Array.from(new Set([...prev, ...paginatedArchived.map((incident) => incident.id)])));
                              }
                            }}
                            className="rounded"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-secondary-600">Processo</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-secondary-600">{terms.unitSingular}</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-secondary-600">Impacto</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-secondary-600">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-secondary-600">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-100">
                      {paginatedArchived.map((incident) => (
                        <tr key={incident.id}>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedArchivedIds.includes(incident.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedArchivedIds((prev) => [...prev, incident.id]);
                                } else {
                                  setSelectedArchivedIds((prev) => prev.filter((id) => id !== incident.id));
                                }
                              }}
                              className="rounded"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-secondary-700">{incident.process_number}</td>
                          <td className="px-4 py-3 text-sm text-secondary-700">
                            {incident.school?.name || incident.unidade_escolar || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-secondary-700">{incident.impact_level}</td>
                          <td className="px-4 py-3 text-sm text-secondary-700">{incident.status}</td>
                          <td className="px-4 py-3 text-sm text-secondary-500">
                            {incident.incident_date ? new Date(incident.incident_date).toLocaleDateString('pt-BR') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex items-center justify-between px-5 py-3 border-t border-secondary-100 bg-secondary-50/50">
                    <span className="text-sm text-secondary-500">
                      Página {archivePage} de {archiveTotalPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setArchivePage((prev) => Math.max(1, prev - 1))}
                        disabled={archivePage === 1}
                        className="px-3 py-1.5 text-sm rounded-xl border border-secondary-200 bg-white hover:bg-secondary-50 disabled:opacity-50 transition-colors"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => setArchivePage((prev) => Math.min(archiveTotalPages, prev + 1))}
                        disabled={archivePage === archiveTotalPages}
                        className="px-3 py-1.5 text-sm rounded-xl border border-secondary-200 bg-white hover:bg-secondary-50 disabled:opacity-50 transition-colors"
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Logs Tab */}
            {activeTab === 'logs' && (
              <div className="space-y-5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-secondary-900 tracking-tight">Log de Atividades</h2>
                    <p className="text-sm text-secondary-500 mt-1">Acompanhe todas as ações realizadas no sistema</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleExportLogsCSV}
                      className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all hover:shadow-md active:scale-[0.98]"
                    >
                      <Download className="w-4 h-4" />
                      Exportar CSV
                    </button>
                    <button
                      onClick={() => loadData('logs')}
                      className="flex items-center gap-2 px-4 py-2.5 bg-secondary-100 text-secondary-700 rounded-xl hover:bg-secondary-200 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Atualizar
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-secondary-200/60 overflow-hidden">
                  <table className="w-full table-striped">
                    <thead className="bg-secondary-50/80">
                      <tr>
                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">Data/Hora</th>
                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">Usuário</th>
                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">Ação</th>
                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">Descrição</th>
                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">IP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-100">
                      {paginatedLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-secondary-50/50 transition-colors">
                          <td className="px-5 py-3.5 text-sm text-secondary-600 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700">
                                {(log.user_name || '-').charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-sm text-secondary-900">{log.user_name || '-'}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                              log.action === 'CREATE' ? 'bg-green-100 text-green-700' :
                              log.action === 'UPDATE' ? 'bg-blue-100 text-primary-700' :
                              log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                              log.action === 'ARCHIVE' ? 'bg-orange-100 text-orange-700' :
                              'bg-secondary-100 text-secondary-700'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                log.action === 'CREATE' ? 'bg-green-500' :
                                log.action === 'UPDATE' ? 'bg-blue-500' :
                                log.action === 'DELETE' ? 'bg-red-500' :
                                log.action === 'ARCHIVE' ? 'bg-orange-500' :
                                'bg-secondary-500'
                              }`} />
                              {log.action}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-secondary-600 max-w-xs truncate">{log.description}</td>
                          <td className="px-5 py-3.5 text-sm text-secondary-400 font-mono text-xs">{log.ip_address || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex items-center justify-between px-5 py-3 border-t border-secondary-100 bg-secondary-50/50">
                    <span className="text-sm text-secondary-500">
                      Página {logPage} de {logTotalPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setLogPage((prev) => Math.max(1, prev - 1))}
                        disabled={logPage === 1}
                        className="px-3 py-1.5 text-sm rounded-xl border border-secondary-200 bg-white hover:bg-secondary-50 disabled:opacity-50 transition-colors"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => setLogPage((prev) => Math.min(logTotalPages, prev + 1))}
                        disabled={logPage === logTotalPages}
                        className="px-3 py-1.5 text-sm rounded-xl border border-secondary-200 bg-white hover:bg-secondary-50 disabled:opacity-50 transition-colors"
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Config Tab */}
            {activeTab === 'config' && (
              <div className="space-y-5 animate-fade-in">
                <h2 className="text-2xl font-bold text-secondary-900 tracking-tight">Configurações do Sistema</h2>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-200/60">
                  <h3 className="text-lg font-semibold text-secondary-900 mb-1">Tenant e Presets</h3>
                  <p className="text-sm text-secondary-600 mb-4">
                    Ajuste identidade visual e aplique presets de operação para acelerar o onboarding.
                  </p>

                  {tenantProfile && tenantConfig ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 mb-1">Nome do App</label>
                          <input
                            type="text"
                            value={tenantConfig.app_name}
                            onChange={(e) => setTenantConfig({ ...tenantConfig, app_name: e.target.value })}
                            className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500/30"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 mb-1">Subtítulo</label>
                          <input
                            type="text"
                            value={tenantConfig.subtitle}
                            onChange={(e) => setTenantConfig({ ...tenantConfig, subtitle: e.target.value })}
                            className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500/30"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 mb-1">Cor Primária</label>
                          <input
                            type="color"
                            value={tenantConfig.primary_color}
                            onChange={(e) => setTenantConfig({ ...tenantConfig, primary_color: e.target.value })}
                            className="w-full h-10 border rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 mb-1">Cor de Destaque</label>
                          <input
                            type="color"
                            value={tenantConfig.accent_color}
                            onChange={(e) => setTenantConfig({ ...tenantConfig, accent_color: e.target.value })}
                            className="w-full h-10 border rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={handleSaveTenantConfig}
                          disabled={savingTenantConfig}
                          className="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-60"
                        >
                          {savingTenantConfig ? 'Salvando...' : 'Salvar visual do tenant'}
                        </button>
                        <button
                          onClick={() => handleApplyTenantPreset('education')}
                          disabled={applyingPreset}
                          className={`px-3 py-2 text-white rounded-xl disabled:opacity-60 ${tenantProfile.business_type === 'education' ? 'bg-teal-800 ring-2 ring-teal-300' : 'bg-teal-600 hover:bg-teal-700'}`}
                        >
                          Preset Educação
                        </button>
                        <button
                          onClick={() => handleApplyTenantPreset('condominium')}
                          disabled={applyingPreset}
                          className={`px-3 py-2 text-white rounded-xl disabled:opacity-60 ${tenantProfile.business_type === 'condominium' ? 'bg-indigo-800 ring-2 ring-indigo-300' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                        >
                          Preset Condomínio
                        </button>
                        <button
                          onClick={() => handleApplyTenantPreset('shopping')}
                          disabled={applyingPreset}
                          className={`px-3 py-2 text-white rounded-xl disabled:opacity-60 ${tenantProfile.business_type === 'shopping' ? 'bg-amber-800 ring-2 ring-amber-300' : 'bg-amber-600 hover:bg-amber-700'}`}
                        >
                          Preset Shopping
                        </button>
                      </div>

                      <p className="text-xs text-secondary-500">
                        Tenant atual: <strong>{tenantProfile.name}</strong> ({tenantProfile.slug})
                      </p>
                      <p className="text-xs text-secondary-500">
                        Preset ativo: <strong>{tenantProfile.business_type ? PRESET_LABELS[tenantProfile.business_type as keyof typeof PRESET_LABELS] : 'Não definido'}</strong>
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-secondary-500">Carregando configurações do tenant...</p>
                  )}
                </div>

                {/* Logo Upload */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-200/60">
                  <h3 className="text-lg font-semibold text-secondary-900 mb-4">Logo Institucional</h3>
                  <div className="flex items-start gap-6">
                    <div className="flex-shrink-0">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Logo atual"
                          className="w-24 h-24 object-contain border rounded-xl bg-secondary-50 p-2"
                        />
                      ) : (
                        <div className="w-24 h-24 border-2 border-dashed border-secondary-300 rounded-xl flex items-center justify-center bg-secondary-50">
                          <span className="text-secondary-400 text-sm text-center">Sem logo</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-secondary-600 mb-3">
                        A logo será exibida no cabeçalho dos ofícios gerados pelo sistema.
                        Recomendamos uma imagem PNG com fundo transparente.
                      </p>
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 cursor-pointer">
                        {uploadingLogo ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Enviando...
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Selecionar Logo
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          disabled={uploadingLogo}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-200/60">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-secondary-900">Monitoramento da Retenção de Logs</h3>
                      <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${retentionHealthStyle}`}>
                        {retentionHealthLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-secondary-500">
                        Atualizado em: {formatConfigDate(retentionRunAt)}
                      </span>
                      <button
                        onClick={refreshRetentionStatus}
                        disabled={refreshingRetentionStatus}
                        className="flex items-center gap-2 px-3 py-2 bg-secondary-100 text-secondary-700 rounded-xl hover:bg-secondary-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCw className={`w-4 h-4 ${refreshingRetentionStatus ? 'animate-spin' : ''}`} />
                        Atualizar status
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-secondary-600 mb-4">{retentionHealth?.message || 'Sem diagnóstico de saúde disponível.'}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-secondary-200 bg-secondary-50">
                      <p className="text-sm text-secondary-600">Status da última execução</p>
                      <div className="mt-2">
                        <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                          retentionStatus === 'success'
                            ? 'bg-green-100 text-green-700'
                            : retentionStatus === 'error'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-secondary-100 text-secondary-700'
                        }`}>
                          {retentionStatus || '-'}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl border border-secondary-200 bg-secondary-50">
                      <p className="text-sm text-secondary-600">Disparo</p>
                      <p className="mt-2 text-sm font-medium text-secondary-900">{retentionTrigger || '-'}</p>
                    </div>
                    <div className="p-4 rounded-xl border border-secondary-200 bg-secondary-50">
                      <p className="text-sm text-secondary-600">Última execução</p>
                      <p className="mt-2 text-sm font-medium text-secondary-900">{formatConfigDate(retentionRunAt)}</p>
                    </div>
                    <div className="p-4 rounded-xl border border-secondary-200 bg-secondary-50">
                      <p className="text-sm text-secondary-600">Data de corte aplicada</p>
                      <p className="mt-2 text-sm font-medium text-secondary-900">{retentionCutoffDate || '-'}</p>
                    </div>
                    <div className="p-4 rounded-xl border border-secondary-200 bg-secondary-50">
                      <p className="text-sm text-secondary-600">Início / fim</p>
                      <p className="mt-2 text-sm font-medium text-secondary-900">
                        {formatConfigDate(retentionStartedAt)} / {formatConfigDate(retentionFinishedAt)}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl border border-secondary-200 bg-secondary-50">
                      <p className="text-sm text-secondary-600">Registros processados</p>
                      <p className="mt-2 text-sm font-medium text-secondary-900">
                        Anonimizados: {retentionAnonymized} · Refresh removidos: {retentionRemovedRefresh}
                      </p>
                    </div>
                  </div>
                  {retentionError && (
                    <div className="mt-4 p-4 rounded-xl border border-red-200 bg-red-50">
                      <p className="text-sm font-medium text-red-700">Erro da última execução</p>
                      <p className="text-sm text-red-700 mt-1 break-words">{retentionError}</p>
                    </div>
                  )}
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-200/60">
                  <h3 className="text-lg font-semibold text-secondary-900 mb-4">Cabeçalho do Ofício</h3>
                  <div className="space-y-4">
                    {configs.filter(c => c.key.startsWith('oficio_header')).map((config) => (
                      <div key={config.id} className="flex items-center gap-4">
                        <label className="w-48 text-sm font-medium text-secondary-600">{config.description}</label>
                        <input
                          type="text"
                          value={config.value || ''}
                          onChange={(e) => {
                            setConfigs(configs.map(c => 
                              c.key === config.key ? { ...c, value: e.target.value } : c
                            ));
                          }}
                          className="flex-1 px-3 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                        />
                        <button
                          onClick={() => handleConfigUpdate(config.key, config.value)}
                          className="px-3 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700"
                        >
                          Salvar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-200/60">
                  <h3 className="text-lg font-semibold text-secondary-900 mb-4">Rodapé do Ofício</h3>
                  {configs.filter(c => c.key === 'oficio_footer').map((config) => (
                    <div key={config.id} className="flex items-center gap-4">
                      <input
                        type="text"
                        value={config.value || ''}
                        onChange={(e) => {
                          setConfigs(configs.map(c => 
                            c.key === config.key ? { ...c, value: e.target.value } : c
                          ));
                        }}
                        className="flex-1 px-3 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                      />
                      <button
                        onClick={() => handleConfigUpdate(config.key, config.value)}
                        className="px-3 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700"
                      >
                        Salvar
                      </button>
                    </div>
                  ))}
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-200/60">
                  <h3 className="text-lg font-semibold text-secondary-900 mb-4">Outras Configurações</h3>
                  {configs.filter(
                    c => !c.key.startsWith('oficio') && !c.key.startsWith('audit_retention_last_')
                  ).map((config) => (
                    <div key={config.id} className="flex items-center gap-4 mb-4">
                      <label className="w-48 text-sm font-medium text-secondary-600">{config.description}</label>
                      <input
                        type="text"
                        value={config.value || ''}
                        onChange={(e) => {
                          setConfigs(configs.map(c => 
                            c.key === config.key ? { ...c, value: e.target.value } : c
                          ));
                        }}
                        className="flex-1 px-3 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                      />
                      <button
                        onClick={() => handleConfigUpdate(config.key, config.value)}
                        className="px-3 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700"
                      >
                        Salvar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-0 mx-4 animate-scale-in overflow-hidden">
            <div className="px-6 py-5 border-b border-secondary-100 bg-secondary-50/50">
              <h3 className="text-lg font-semibold text-secondary-900">
                {editingItem ? 'Editar' : 'Novo'} {
                  modalType === 'school' ? terms.unitSingular :
                  modalType === 'category' ? terms.sectorSingular :
                  modalType === 'location' ? 'Localização' :
                  modalType === 'impact-level' ? 'Nível de Impacto' :
                  modalType === 'user' ? 'Usuário' : 'Item'
                }
              </h3>
            </div>

            <div className="px-6 py-5 max-h-[60vh] overflow-y-auto space-y-4">
              {/* School Form */}
              {modalType === 'school' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Nome *</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Endereço</label>
                    <input
                      type="text"
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Telefone</label>
                    <input
                      type="text"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">E-mail</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500/30"
                    />
                  </div>
                  {editingItem && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active ?? true}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="rounded"
                      />
                      <label className="text-sm text-secondary-700">{terms.unitSingular} ativa</label>
                    </div>
                  )}
                </>
              )}

              {/* Category Form */}
              {modalType === 'category' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Nome *</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Descrição</label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500/30"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Cor</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.color || '#3B82F6'}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-12 h-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.color || '#3B82F6'}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="flex-1 px-3 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500/30"
                      />
                    </div>
                  </div>
                  {editingItem && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active ?? true}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="rounded"
                      />
                      <label className="text-sm text-secondary-700">{terms.sectorSingular} ativo</label>
                    </div>
                  )}
                </>
              )}

              {/* Location Form */}
              {modalType === 'location' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Nome *</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Descrição</label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500/30"
                      rows={3}
                    />
                  </div>
                  {editingItem && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active ?? true}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="rounded"
                      />
                      <label className="text-sm text-secondary-700">Localização ativa</label>
                    </div>
                  )}
                </>
              )}

              {/* Impact Level Form */}
              {modalType === 'impact-level' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Nome *</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Descrição</label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500/30"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Severidade (1-4)</label>
                    <input
                      type="number"
                      min="1"
                      max="4"
                      value={formData.severity || 1}
                      onChange={(e) => setFormData({ ...formData, severity: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Cor</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.color || '#6B7280'}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-12 h-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.color || '#6B7280'}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="flex-1 px-3 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500/30"
                      />
                    </div>
                  </div>
                  {editingItem && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active ?? true}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="rounded"
                      />
                      <label className="text-sm text-secondary-700">Nível ativo</label>
                    </div>
                  )}
                </>
              )}

              {/* User Form */}
              {modalType === 'user' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      value={formData.full_name || ''}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Usuário *</label>
                    <input
                      type="text"
                      value={formData.username || ''}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">E-mail *</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      {editingItem ? 'Nova Senha (deixe vazio para manter)' : 'Senha *'}
                    </label>
                    <input
                      type="password"
                      value={formData.password || ''}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Perfil</label>
                    {isEditingMasterUser ? (
                      <input
                        type="text"
                        value="Master"
                        disabled
                        className="w-full px-3 py-2 border rounded-xl bg-secondary-100 text-secondary-600"
                      />
                    ) : (
                      <select
                        value={formData.role || 'DIRETOR'}
                        onChange={(e) => {
                          const nextRole = e.target.value;
                          setFormData({
                            ...formData,
                            role: nextRole,
                            escola_vinculada: nextRole === 'DIRETOR' ? formData.escola_vinculada : null,
                            setor_vinculado: nextRole === 'GESTOR_SETOR' ? formData.setor_vinculado : null,
                          });
                          if (nextRole === 'DIRETOR') {
                            ensureSchoolsLoaded();
                          }
                          if (nextRole === 'GESTOR_SETOR') {
                            ensureCategoriesLoaded();
                          }
                        }}
                        className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500/30"
                      >
                        <option value="DIRETOR">{terms.directorRoleLabel}</option>
                        <option value="GESTOR_SETOR">{terms.sectorManagerRoleLabel}</option>
                        <option value="CHEFIA">Chefia</option>
                        <option value="OPERADOR">Operador</option>
                      </select>
                    )}
                  </div>
                  {formData.role === 'GESTOR_SETOR' && (
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">{terms.sectorSingular} *</label>
                      <select
                        value={formData.setor_vinculado || ''}
                        onChange={(e) => setFormData({ ...formData, setor_vinculado: e.target.value || null })}
                        className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500/30"
                      >
                        <option value="">Selecione {terms.sectorSingular.toLowerCase()}</option>
                        {categories
                          .filter((cat) => cat.is_active)
                          .map((cat) => (
                            <option key={cat.id} value={cat.name}>
                              {cat.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                  {formData.role === 'DIRETOR' && (
                    <div className="border rounded-xl p-3 bg-secondary-50">
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        {terms.unitSingular}
                      </label>
                      <input
                        type="text"
                        value={schoolSearch}
                        onChange={(e) => setSchoolSearch(e.target.value)}
                        placeholder={`Buscar ${terms.unitSingular.toLowerCase()}...`}
                        className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500/30"
                      />
                      {selectedSchool && (
                        <p className="text-xs text-secondary-600 mt-2">
                          Selecionada: <span className="font-medium">{selectedSchool.name}</span>
                        </p>
                      )}
                      <div className="mt-3 max-h-48 overflow-y-auto space-y-2">
                        {filteredSchoolOptions.map((school) => (
                          <button
                            key={school.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, escola_vinculada: school.id })}
                            className={`w-full text-left px-3 py-2 rounded-xl border transition-colors ${
                              formData.escola_vinculada === school.id
                                ? 'border-primary-500 bg-primary-50 text-primary-700'
                                : 'border-secondary-200 hover:bg-white'
                            }`}
                          >
                            <p className="text-sm font-medium">{school.name}</p>
                            {school.address && (
                              <p className="text-xs text-secondary-500">{school.address}</p>
                            )}
                          </button>
                        ))}
                        {filteredSchoolOptions.length === 0 && (
                          <p className="text-sm text-secondary-500">Nenhuma unidade encontrada.</p>
                        )}
                      </div>
                    </div>
                  )}
                  {editingItem && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active ?? true}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="rounded"
                      />
                      <label className="text-sm text-secondary-700">Ativo</label>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-secondary-100 bg-secondary-50/30 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 text-secondary-700 hover:bg-secondary-100 rounded-xl transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all duration-200 hover:shadow-md active:scale-[0.98] font-medium"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
