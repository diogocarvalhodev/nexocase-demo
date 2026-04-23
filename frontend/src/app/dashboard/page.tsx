'use client';

import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import { Sidebar, Card, CardContent, CardHeader, CardTitle, Button, SkeletonDashboard } from '@/components';
import { DashboardStats, ChartData, RecentIncident, CriticalSchool, MonthlyTrend, Category, User, ImpactLevel, School, DashboardPreset, TenantProfile } from '@/types';
import { formatDateTime, getImpactColor } from '@/lib/utils';
import { getInitialTenantBusinessType, persistTenantBusinessType } from '@/lib/terminology';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from 'recharts';
import {
  AlertTriangle,
  CheckCircle,
  FileText,
  TrendingUp,
  XCircle,
  MapPin,
  Calendar,
  Download,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const REGION_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6'];

type BusinessType = 'education' | 'condominium' | 'shopping';

const DASHBOARD_TERMS: Record<BusinessType, {
  incidentSingular: string;
  incidentPlural: string;
  sector: string;
  unit: string;
  criticalUnits: string;
}> = {
  education: {
    incidentSingular: 'Ocorrência',
    incidentPlural: 'Ocorrências',
    sector: 'Área',
    unit: 'Unidade',
    criticalUnits: 'Unidades Críticas',
  },
  condominium: {
    incidentSingular: 'Registro',
    incidentPlural: 'Registros',
    sector: 'Área',
    unit: 'Unidade',
    criticalUnits: 'Unidades Críticas',
  },
  shopping: {
    incidentSingular: 'Caso',
    incidentPlural: 'Casos',
    sector: 'Área',
    unit: 'Unidade',
    criticalUnits: 'Unidades Críticas',
  },
};

export default function DashboardPage() {
  const router = useRouter();
  const initialBusinessType = getInitialTenantBusinessType();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [bySetor, setBySetor] = useState<ChartData[]>([]);
  const [bySchool, setBySchool] = useState<ChartData[]>([]);
  const [byLocation, setByLocation] = useState<ChartData[]>([]);
  const [byImpact, setByImpact] = useState<ChartData[]>([]);
  const [byRegion, setByRegion] = useState<ChartData[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([]);
  const [criticalSchools, setCriticalSchools] = useState<CriticalSchool[]>([]);
  const [recentIncidents, setRecentIncidents] = useState<RecentIncident[]>([]);
  const [setores, setSetores] = useState<Category[]>([]);
  const [impactLevels, setImpactLevels] = useState<ImpactLevel[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [operators, setOperators] = useState<User[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [period, setPeriod] = useState<'all' | 'day' | 'week' | 'month' | 'year' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [setorFilter, setSetorFilter] = useState('');
  const [impactFilter, setImpactFilter] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [presets, setPresets] = useState<DashboardPreset[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [presetName, setPresetName] = useState('');
  const [savingPreset, setSavingPreset] = useState(false);
  const [businessType, setBusinessType] = useState<BusinessType>(initialBusinessType || 'education');
  const [isBusinessTypeReady, setIsBusinessTypeReady] = useState<boolean>(Boolean(initialBusinessType));
  const isAdmin = currentUser?.role === 'MASTER';
  const showMasterDashboard = currentUser?.role === 'MASTER';
  const showDirectorDashboard = currentUser?.role === 'DIRETOR';
  const showManagerDashboard = currentUser?.role === 'GESTOR_SETOR';
  const showChiefDashboard = currentUser?.role === 'CHEFIA';
  const showOperatorDashboard = currentUser?.role === 'OPERADOR';
  const terms = DASHBOARD_TERMS[businessType];

  useEffect(() => {
    const token = Cookies.get('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const userStr = Cookies.get('user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch {
        Cookies.remove('user');
      }
    }

    const bootstrap = async () => {
      if (userStr) {
        try {
          const parsedUser = JSON.parse(userStr) as User;
          if (parsedUser.role === 'MASTER') {
            const statusRes = await api.get<{ onboarding_completed: boolean }>('/api/tenant/onboarding-status');
            if (!statusRes.data.onboarding_completed) {
              router.push('/onboarding');
              return;
            }
          }
        } catch {
          // Keep dashboard fallback if onboarding status fails.
        }
      }

      fetchDashboardData();
    };

    bootstrap();
  }, [router]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const fetchFilterOptions = async () => {
      try {
        const [impactRes, regionsRes, tenantRes] = await Promise.all([
          api.get('/api/options/impact-levels'),
          api.get('/api/options/regions'),
          api.get<TenantProfile>('/api/tenant/profile'),
        ]);
        setImpactLevels(impactRes.data);
        setRegions(regionsRes.data);
        if (tenantRes.data?.business_type && ['education', 'condominium', 'shopping'].includes(tenantRes.data.business_type)) {
          const nextType = tenantRes.data.business_type as BusinessType;
          setBusinessType(nextType);
          persistTenantBusinessType(nextType);
        }
        setIsBusinessTypeReady(true);

        if (isAdmin) {
          const [sectorsRes, schoolsRes, usersRes] = await Promise.all([
            api.get('/api/options/categories'),
            api.get('/api/schools'),
            api.get('/api/admin/users'),
          ]);
          setSetores(sectorsRes.data);
          setSchools(schoolsRes.data);
          setOperators(usersRes.data);
        }
      } catch (error) {
        console.error('Erro ao carregar filtros do dashboard:', error);
        setIsBusinessTypeReady(true);
      }
    };

    fetchFilterOptions();
    loadPresets();
  }, [currentUser, isAdmin]);

  const loadPresets = async () => {
    try {
      const response = await api.get<DashboardPreset[]>('/api/presets');
      setPresets(response.data);
    } catch (error) {
      console.error('Erro ao carregar presets:', error);
    }
  };

  const getCurrentFilterConfig = () => ({
    period,
    startDate,
    endDate,
    setorFilter,
    impactFilter,
    schoolFilter,
    operatorFilter,
    regionFilter,
  });

  const applyFilterConfig = (config: Record<string, any>) => {
    if (config.period) setPeriod(config.period);
    setStartDate(config.startDate || '');
    setEndDate(config.endDate || '');
    setSetorFilter(config.setorFilter || '');
    setImpactFilter(config.impactFilter || '');
    setSchoolFilter(config.schoolFilter || '');
    setOperatorFilter(config.operatorFilter || '');
    setRegionFilter(config.regionFilter || '');
  };

  const handleSavePreset = async () => {
    const cleanedName = presetName.trim();
    if (!cleanedName) {
      alert('Informe um nome para o preset.');
      return;
    }

    setSavingPreset(true);
    try {
      await api.post('/api/presets', {
        name: cleanedName,
        config: getCurrentFilterConfig(),
      });
      setPresetName('');
      await loadPresets();
    } catch (error) {
      console.error('Erro ao salvar preset:', error);
      alert('Não foi possível salvar o preset.');
    } finally {
      setSavingPreset(false);
    }
  };

  const handleDeletePreset = async () => {
    if (!selectedPresetId) {
      return;
    }
    if (!confirm('Deseja remover o preset selecionado?')) {
      return;
    }

    try {
      await api.delete(`/api/presets/${selectedPresetId}`);
      setSelectedPresetId('');
      await loadPresets();
    } catch (error) {
      console.error('Erro ao remover preset:', error);
      alert('Não foi possível remover o preset.');
    }
  };

  const handleApplyPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = presets.find((item) => String(item.id) === presetId);
    if (!preset) {
      return;
    }
    applyFilterConfig(preset.config || {});
  };

  const fetchDashboardData = async () => {
    try {
      const paramsBase = new URLSearchParams({ period });
      if (period === 'custom') {
        if (startDate) paramsBase.set('start_date', startDate);
        if (endDate) paramsBase.set('end_date', endDate);
      }

      if (impactFilter) {
        paramsBase.set('impact_level', impactFilter);
      }

      if (regionFilter) {
        paramsBase.set('region', regionFilter);
      }

      if (isAdmin && setorFilter) {
        paramsBase.set('setor', setorFilter);
      }

      if (isAdmin && schoolFilter) {
        paramsBase.set('school_id', schoolFilter);
      }

      if (isAdmin && operatorFilter) {
        paramsBase.set('operator_id', operatorFilter);
      }

      const buildParams = (extra: Record<string, string> = {}) => {
        const params = new URLSearchParams(paramsBase);
        Object.entries(extra).forEach(([key, value]) => params.set(key, value));
        return params.toString();
      };

      const [
        statsRes,
        setorRes,
        schoolRes,
        locationRes,
        impactRes,
        regionRes,
        trendRes,
        criticalRes,
        recentRes,
      ] = await Promise.all([
        api.get(`/api/dashboard/stats?${buildParams()}`),
        api.get(`/api/dashboard/incidents-by-category?${buildParams()}`),
        api.get(`/api/dashboard/incidents-by-school?${buildParams({ limit: '8' })}`),
        api.get(`/api/dashboard/incidents-by-location?${buildParams()}`),
        api.get(`/api/dashboard/incidents-by-impact?${buildParams()}`),
        api.get(`/api/dashboard/incidents-by-region?${buildParams()}`),
        api.get(`/api/dashboard/monthly-trend?${buildParams({ months: '6' })}`),
        api.get(`/api/dashboard/critical-schools?${buildParams({ limit: '5', days: '30' })}`),
        api.get(`/api/dashboard/recent-incidents?${buildParams({ limit: '5' })}`),
      ]);

      setStats(statsRes.data);
      setBySetor(setorRes.data);
      setBySchool(schoolRes.data);
      setByLocation(locationRes.data);
      setByImpact(impactRes.data);
      setByRegion(regionRes.data);
      setMonthlyTrend(trendRes.data);
      setCriticalSchools(criticalRes.data);
      setRecentIncidents(recentRes.data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchDashboardData();
    }
  }, [period, startDate, endDate, setorFilter, impactFilter, schoolFilter, operatorFilter, regionFilter, currentUser]);

  const handleDownloadReport = async () => {
    setDownloadingReport(true);
    try {
      const params = new URLSearchParams();
      params.set('period', period);
      if (period === 'custom') {
        if (startDate) params.set('start_date', startDate);
        if (endDate) params.set('end_date', endDate);
      }
      if (impactFilter) params.set('impact_level', impactFilter);
      if (regionFilter) params.set('region', regionFilter);
      if (isAdmin && setorFilter) params.set('setor', setorFilter);
      if (isAdmin && schoolFilter) params.set('school_id', schoolFilter);
      if (isAdmin && operatorFilter) params.set('operator_id', operatorFilter);

      const response = await api.get(`/api/reports/monthly?${params.toString()}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const now = new Date();
      link.setAttribute('download', `relatorio_${now.toISOString().slice(0, 10)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Erro ao baixar relatório:', error);
      alert('Erro ao gerar o relatório. Tente novamente.');
    } finally {
      setDownloadingReport(false);
    }
  };

  const normalizeSetorLabel = (value?: string) => (value ?? '').trim();
  const mapSetorLabel = (value?: string) => {
    const rawLabel = normalizeSetorLabel(value);
    if (!rawLabel) {
      return '';
    }

    if (businessType !== 'education') {
      return rawLabel;
    }

    const key = rawLabel
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    if (key.includes('pedagogic')) {
      return 'Pedagógico';
    }

    if (key.includes('seguranca')) {
      return 'Segurança';
    }

    if (key.includes('gabinete') || key.includes('supervisao')) {
      return 'Gabinete';
    }

    if (key.includes('alimentacao')) {
      return 'Alimentação Escolar (PNAE)';
    }

    if (key.includes('infraestrutura') || key.includes('obras') || key.includes('logistica')) {
      return 'Obras e Logística';
    }

    return rawLabel;
  };
  const normalizeSetorKey = (value?: string) => normalizeSetorLabel(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const setorChartData = bySetor.reduce<ChartData[]>((acc, item) => {
    const rawLabel = mapSetorLabel(item.setor);
    if (!rawLabel) {
      return acc;
    }
    const key = normalizeSetorKey(rawLabel);
    const existing = acc.find((entry) => normalizeSetorKey(entry.setor) === key);
    if (existing) {
      existing.count += item.count;
    } else {
      acc.push({ setor: rawLabel, count: item.count });
    }
    return acc;
  }, []);

  const renderSetorLegend = () => (
    <div className="mt-3 overflow-x-auto">
      <ul className="flex flex-nowrap justify-center gap-x-4 text-xs text-secondary-600 whitespace-nowrap">
        {setorChartData.map((entry, index) => (
          <li key={`${entry.setor}-${index}`} className="flex items-center">
            <span
              className="inline-block w-3 h-3 mr-2 rounded-sm"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span>{entry.setor}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  const renderSetorSliceLabel = ({ value }: { value?: number }) => {
    const total = setorChartData.reduce((sum, item) => sum + item.count, 0);
    if (!value || total === 0) {
      return '';
    }

    return String(value);
  };

  if (loading || !isBusinessTypeReady) {
    return (
      <div className="min-h-screen bg-secondary-50">
        <Sidebar />
        <main className="lg:ml-64 p-6 lg:p-8">
          <div className="mb-8">
            <div className="h-8 w-40 skeleton rounded-lg mb-2" />
            <div className="h-4 w-64 skeleton rounded-lg" />
          </div>
          <SkeletonDashboard />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      <Sidebar />

      <main className="lg:ml-64 p-6 lg:p-8">
        {/* Hero Header */}
        <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 p-6 lg:p-8 shadow-lg shadow-primary-600/10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-primary-200 text-sm font-medium mb-1">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                Olá, {currentUser?.full_name?.split(' ')[0] || 'Usuário'} 👋
              </h1>
              <p className="text-primary-200 mt-1 text-sm">
                Visão geral das {terms.incidentPlural.toLowerCase()}
              </p>
            </div>
            <Button
              onClick={handleDownloadReport}
              disabled={downloadingReport}
              className="bg-white/15 hover:bg-white/25 border border-white/20 text-white backdrop-blur-sm shadow-none"
            >
              <Download className={`h-4 w-4 mr-2 ${downloadingReport ? 'animate-spin' : ''}`} />
              {downloadingReport ? 'Gerando...' : 'Relatório'}
            </Button>
          </div>
        </div>

        {/* Collapsible Filters */}
        <Card className="mb-6">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-secondary-50/50 transition-colors rounded-xl"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-secondary-500" />
              <span className="text-sm font-medium text-secondary-700">Filtros</span>
              {(period !== 'all' || impactFilter || setorFilter || schoolFilter || operatorFilter || regionFilter) && (
                <span className="px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold">
                  {[period !== 'all', impactFilter, setorFilter, schoolFilter, operatorFilter, regionFilter].filter(Boolean).length}
                </span>
              )}
            </div>
            {filtersOpen ? <ChevronUp className="h-4 w-4 text-secondary-400" /> : <ChevronDown className="h-4 w-4 text-secondary-400" />}
          </button>
          {filtersOpen && (
            <CardContent className="p-4 pt-0 border-t border-secondary-100 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Período
                </label>
                <select
                  value={period}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setPeriod(e.target.value as typeof period)}
                  className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">Todos</option>
                  <option value="day">Dia</option>
                  <option value="week">Semana</option>
                  <option value="month">Mês</option>
                  <option value="year">Ano</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>

              {period === 'custom' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Data Início
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Data Fim
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </>
              ) : null}

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Impacto
                </label>
                <select
                  value={impactFilter}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setImpactFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Todos</option>
                  {impactLevels.map((level) => (
                    <option key={level.id} value={level.name}>
                      {level.name}
                    </option>
                  ))}
                </select>
              </div>

              {currentUser && isAdmin ? (
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    {terms.sector}
                  </label>
                  <select
                    value={setorFilter}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setSetorFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Todos</option>
                    {setores.map((setor) => (
                      <option key={setor.id} value={setor.name}>
                        {setor.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Região
                </label>
                <select
                  value={regionFilter}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setRegionFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Todas</option>
                  {regions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </div>

              {currentUser && isAdmin ? (
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    {terms.unit}
                  </label>
                  <select
                    value={schoolFilter}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setSchoolFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Todas</option>
                    {schools.map((school) => (
                      <option key={school.id} value={String(school.id)}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {currentUser && isAdmin ? (
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Operador
                  </label>
                  <select
                    value={operatorFilter}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setOperatorFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Todos</option>
                    {operators.map((operator) => (
                      <option key={operator.id} value={String(operator.id)}>
                        {operator.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            <div className="mt-4 pt-4 border-t border-secondary-200 grid grid-cols-1 lg:grid-cols-4 gap-3 items-end">
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-secondary-700 mb-1">Presets salvos</label>
                <select
                  value={selectedPresetId}
                  onChange={(e) => handleApplyPreset(e.target.value)}
                  className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Selecione...</option>
                  {presets.map((preset) => (
                    <option key={preset.id} value={String(preset.id)}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Novo preset</label>
                <input
                  value={presetName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setPresetName(e.target.value)}
                  placeholder="Ex.: Filtro semanal"
                  className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex gap-2">
                <Button className="w-full" onClick={handleSavePreset} disabled={savingPreset}>
                  {savingPreset ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleDeletePreset}
                  disabled={!selectedPresetId}
                >
                  Excluir
                </Button>
              </div>
            </div>
          </CardContent>
          )}
        </Card>

        {showMasterDashboard ? (
          <>
            {/* Master Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">Total de {terms.incidentPlural}</p>
                      <p className="text-3xl font-bold text-white">
                        {stats?.total_incidents || 0}
                      </p>
                    </div>
                    <FileText className="h-10 w-10 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500 to-amber-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-100 text-sm">Aguardando Validação</p>
                      <p className="text-3xl font-bold text-white">
                        {stats?.open_incidents || 0}
                      </p>
                    </div>
                    <AlertTriangle className="h-10 w-10 text-amber-100" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-sky-500 to-sky-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sky-100 text-sm">Aprovadas</p>
                      <p className="text-3xl font-bold text-white">
                        {stats?.in_progress_incidents || 0}
                      </p>
                    </div>
                    <CheckCircle className="h-10 w-10 text-sky-100" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-rose-500 to-rose-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-rose-100 text-sm">Rejeitadas</p>
                      <p className="text-3xl font-bold text-white">
                        {stats?.rejected_incidents || 0}
                      </p>
                    </div>
                    <XCircle className="h-10 w-10 text-rose-100" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-500 to-red-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-100 text-sm">Alto Impacto</p>
                      <p className="text-3xl font-bold text-white">
                        {stats?.high_impact_open || 0}
                      </p>
                    </div>
                    <TrendingUp className="h-10 w-10 text-red-100" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Critical Schools and Impact */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center text-red-600">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    {terms.criticalUnits} (Período selecionado)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-secondary-200">
                    {criticalSchools.length > 0 ? criticalSchools.map((school, index) => (
                      <div
                        key={school.id}
                        className="px-6 py-4 hover:bg-secondary-50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-secondary-900 flex items-center">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-2 ${
                              index === 0 ? 'bg-red-100 text-red-700' :
                              index === 1 ? 'bg-orange-100 text-orange-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {index + 1}
                            </span>
                            <span className="truncate max-w-[180px]">{school.name}</span>
                          </span>
                          <span className="text-lg font-bold text-red-600">
                            {school.count}
                          </span>
                        </div>
                        <p className="text-xs text-secondary-500 ml-8">
                          {school.region}
                        </p>
                      </div>
                    )) : (
                      <div className="px-6 py-8 text-center text-secondary-500">
                        Nenhuma {terms.incidentSingular.toLowerCase()} no período selecionado
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Por Nível de Impacto</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {byImpact.length > 0 ? byImpact.map((item) => {
                      const total = byImpact.reduce((sum, i) => sum + i.count, 0);
                      const percentage = total > 0 ? (item.count / total) * 100 : 0;
                      const colors: Record<string, { bg: string; bar: string }> = {
                        Baixo: { bg: 'bg-green-100', bar: 'bg-green-500' },
                        Médio: { bg: 'bg-yellow-100', bar: 'bg-yellow-500' },
                        Alto: { bg: 'bg-red-100', bar: 'bg-red-500' },
                      };
                      const color = colors[item.impact || ''] || {
                        bg: 'bg-gray-100',
                        bar: 'bg-gray-500',
                      };

                      return (
                        <div key={item.impact}>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-secondary-700">
                              {item.impact}
                            </span>
                            <span className="text-sm text-secondary-500">
                              {item.count} ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                          <div className={`h-3 rounded-full ${color.bg}`}>
                            <div
                              className={`h-3 rounded-full ${color.bar}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="text-center text-secondary-500 py-4">
                        Nenhuma {terms.incidentSingular.toLowerCase()} registrada
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{terms.incidentPlural} Recentes</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-secondary-200 max-h-[320px] overflow-y-auto">
                    {recentIncidents.length > 0 ? recentIncidents.map((incident) => (
                      <div
                        key={incident.id}
                        className="px-6 py-4 hover:bg-secondary-50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/incidents/${incident.id}`)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-secondary-900">
                            {incident.process_number}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${getImpactColor(
                              incident.impact_level
                            )}`}
                          >
                            {incident.impact_level}
                          </span>
                        </div>
                        <p className="text-sm text-secondary-600 truncate">
                          {incident.school}
                        </p>
                        <p className="text-xs text-secondary-400 mt-1">
                          {formatDateTime(incident.incident_date || incident.created_at)}
                        </p>
                      </div>
                    )) : (
                      <div className="px-6 py-8 text-center text-secondary-500">
                        Nenhuma {terms.incidentSingular.toLowerCase()} registrada
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Region and Sector Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-primary-600" />
                    {terms.incidentPlural} por Região
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    {byRegion.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={byRegion} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis
                            dataKey="region"
                            type="category"
                            width={140}
                            tick={{ fontSize: 11 }}
                          />
                          <Tooltip />
                          <Bar dataKey="count" name={terms.incidentPlural} radius={[0, 4, 4, 0]}>
                            {byRegion.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={REGION_COLORS[index % REGION_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-secondary-500">
                        Nenhuma {terms.incidentSingular.toLowerCase()} registrada
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por {terms.sector}</CardTitle>
                </CardHeader>
                <CardContent>
                  {setorChartData.length > 0 ? (
                    <>
                      <div className="w-full max-w-[360px] aspect-square mx-auto">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={setorChartData}
                              dataKey="count"
                              nameKey="setor"
                              cx="50%"
                              cy="50%"
                              outerRadius="70%"
                              labelLine={false}
                              label={renderSetorSliceLabel}
                            >
                              {setorChartData.map((_, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS[index % COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      {renderSetorLegend()}
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center text-secondary-500">
                      Nenhuma {terms.incidentSingular.toLowerCase()} registrada
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Monthly Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-primary-600" />
                  Tendência Mensal de {terms.incidentPlural}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrend}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorCount)"
                        name={terms.incidentPlural}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </>
        ) : showDirectorDashboard ? (
          <>
            {/* Director Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">Total no Período</p>
                      <p className="text-3xl font-bold text-white">
                        {stats?.monthly_incidents || 0}
                      </p>
                    </div>
                    <FileText className="h-10 w-10 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500 to-amber-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-100 text-sm">Aguardando Validação</p>
                      <p className="text-3xl font-bold text-white">
                        {stats?.open_incidents || 0}
                      </p>
                    </div>
                    <AlertTriangle className="h-10 w-10 text-amber-100" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-sky-500 to-sky-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sky-100 text-sm">Aprovadas</p>
                      <p className="text-3xl font-bold text-white">
                        {stats?.in_progress_incidents || 0}
                      </p>
                    </div>
                    <CheckCircle className="h-10 w-10 text-sky-100" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-rose-500 to-rose-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-rose-100 text-sm">Rejeitadas</p>
                      <p className="text-3xl font-bold text-white">
                        {stats?.rejected_incidents || 0}
                      </p>
                    </div>
                    <XCircle className="h-10 w-10 text-rose-100" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-500 to-red-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-100 text-sm">Alto Impacto</p>
                      <p className="text-3xl font-bold text-white">
                        {stats?.high_impact_open || 0}
                      </p>
                    </div>
                    <TrendingUp className="h-10 w-10 text-red-100" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Location and Sector Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-primary-600" />
                    {terms.incidentPlural} por Localização
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    {byLocation.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={byLocation} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis
                            dataKey="location"
                            type="category"
                            width={140}
                            tick={{ fontSize: 11 }}
                          />
                          <Tooltip />
                          <Bar dataKey="count" name={terms.incidentPlural} fill="#3b82f6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-secondary-500">
                        Nenhuma {terms.incidentSingular.toLowerCase()} registrada
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por {terms.sector}</CardTitle>
                </CardHeader>
                <CardContent>
                  {setorChartData.length > 0 ? (
                    <>
                      <div className="w-full max-w-[360px] aspect-square mx-auto">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={setorChartData}
                              dataKey="count"
                              nameKey="setor"
                              cx="50%"
                              cy="50%"
                              outerRadius="70%"
                              labelLine={false}
                              label={renderSetorSliceLabel}
                            >
                              {setorChartData.map((_, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS[index % COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      {renderSetorLegend()}
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center text-secondary-500">
                      Nenhuma {terms.incidentSingular.toLowerCase()} registrada
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Incidents */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>{terms.incidentPlural} Recentes</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-secondary-200 max-h-[360px] overflow-y-auto">
                  {recentIncidents.length > 0 ? recentIncidents.map((incident) => (
                    <div
                      key={incident.id}
                      className="px-6 py-4 hover:bg-secondary-50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/incidents/${incident.id}`)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-secondary-900">
                          {incident.process_number}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${getImpactColor(
                            incident.impact_level
                          )}`}
                        >
                          {incident.impact_level}
                        </span>
                      </div>
                      <p className="text-sm text-secondary-600 truncate">
                        {incident.school}
                      </p>
                      <p className="text-xs text-secondary-400 mt-1">
                        {formatDateTime(incident.incident_date || incident.created_at)}
                      </p>
                    </div>
                  )) : (
                    <div className="px-6 py-8 text-center text-secondary-500">
                      Nenhuma {terms.incidentSingular.toLowerCase()} registrada
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Monthly Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-primary-600" />
                  Tendência Mensal de {terms.incidentPlural}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrend}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorCount)"
                        name={terms.incidentPlural}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </>
        ) : showManagerDashboard ? (
          <>
            {/* Manager Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">Total no Período</p>
                      <p className="text-3xl font-bold text-white">
                        {stats?.monthly_incidents || 0}
                      </p>
                    </div>
                    <FileText className="h-10 w-10 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500 to-amber-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-100 text-sm">Aguardando Validação</p>
                      <p className="text-3xl font-bold text-white">
                        {stats?.open_incidents || 0}
                      </p>
                    </div>
                    <AlertTriangle className="h-10 w-10 text-amber-100" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-sky-500 to-sky-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sky-100 text-sm">Aprovadas</p>
                      <p className="text-3xl font-bold text-white">
                        {stats?.in_progress_incidents || 0}
                      </p>
                    </div>
                    <CheckCircle className="h-10 w-10 text-sky-100" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-rose-500 to-rose-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-rose-100 text-sm">Rejeitadas</p>
                      <p className="text-3xl font-bold text-white">
                        {stats?.rejected_incidents || 0}
                      </p>
                    </div>
                    <XCircle className="h-10 w-10 text-rose-100" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-500 to-red-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-100 text-sm">Alto Impacto</p>
                      <p className="text-3xl font-bold text-white">
                        {stats?.high_impact_open || 0}
                      </p>
                    </div>
                    <TrendingUp className="h-10 w-10 text-red-100" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Critical Schools and Impact */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Critical Schools */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center text-red-600">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    {terms.criticalUnits} (Período selecionado)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-secondary-200">
                    {criticalSchools.length > 0 ? criticalSchools.map((school, index) => (
                      <div
                        key={school.id}
                        className="px-6 py-4 hover:bg-secondary-50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-secondary-900 flex items-center">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-2 ${
                              index === 0 ? 'bg-red-100 text-red-700' :
                              index === 1 ? 'bg-orange-100 text-orange-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {index + 1}
                            </span>
                            <span className="truncate max-w-[180px]">{school.name}</span>
                          </span>
                          <span className="text-lg font-bold text-red-600">
                            {school.count}
                          </span>
                        </div>
                        <p className="text-xs text-secondary-500 ml-8">
                          {school.region}
                        </p>
                      </div>
                    )) : (
                      <div className="px-6 py-8 text-center text-secondary-500">
                        Nenhuma {terms.incidentSingular.toLowerCase()} no período selecionado
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Impact Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Por Nível de Impacto</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {byImpact.length > 0 ? byImpact.map((item) => {
                      const total = byImpact.reduce((sum, i) => sum + i.count, 0);
                      const percentage = total > 0 ? (item.count / total) * 100 : 0;
                      const colors: Record<string, { bg: string; bar: string }> = {
                        Baixo: { bg: 'bg-green-100', bar: 'bg-green-500' },
                        Médio: { bg: 'bg-yellow-100', bar: 'bg-yellow-500' },
                        Alto: { bg: 'bg-red-100', bar: 'bg-red-500' },
                      };
                      const color = colors[item.impact || ''] || {
                        bg: 'bg-gray-100',
                        bar: 'bg-gray-500',
                      };

                      return (
                        <div key={item.impact}>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-secondary-700">
                              {item.impact}
                            </span>
                            <span className="text-sm text-secondary-500">
                              {item.count} ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                          <div className={`h-3 rounded-full ${color.bg}`}>
                            <div
                              className={`h-3 rounded-full ${color.bar}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="text-center text-secondary-500 py-4">
                        Nenhuma {terms.incidentSingular.toLowerCase()} registrada
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Incidents */}
              <Card>
                <CardHeader>
                  <CardTitle>{terms.incidentPlural} Recentes</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-secondary-200 max-h-[320px] overflow-y-auto">
                    {recentIncidents.length > 0 ? recentIncidents.map((incident) => (
                      <div
                        key={incident.id}
                        className="px-6 py-4 hover:bg-secondary-50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/incidents/${incident.id}`)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-secondary-900">
                            {incident.process_number}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${getImpactColor(
                              incident.impact_level
                            )}`}
                          >
                            {incident.impact_level}
                          </span>
                        </div>
                        <p className="text-sm text-secondary-600 truncate">
                          {incident.school}
                        </p>
                        <p className="text-xs text-secondary-400 mt-1">
                          {formatDateTime(incident.incident_date || incident.created_at)}
                        </p>
                      </div>
                    )) : (
                      <div className="px-6 py-8 text-center text-secondary-500">
                        Nenhuma {terms.incidentSingular.toLowerCase()} registrada
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Location Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-primary-600" />
                    {terms.incidentPlural} por Localização
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    {byLocation.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={byLocation} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis
                            dataKey="location"
                            type="category"
                            width={140}
                            tick={{ fontSize: 11 }}
                          />
                          <Tooltip />
                          <Bar dataKey="count" name={terms.incidentPlural} fill="#3b82f6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-secondary-500">
                        Nenhuma {terms.incidentSingular.toLowerCase()} registrada
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Monthly Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-primary-600" />
                  Tendência Mensal de {terms.incidentPlural}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrend}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorCount)"
                        name={terms.incidentPlural}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </>
        ) : showChiefDashboard || showOperatorDashboard ? (
          <>
            {/* Chefia/Operador Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">Total no Período</p>
                      <p className="text-3xl font-bold text-white">
                        {stats?.monthly_incidents || 0}
                      </p>
                    </div>
                    <FileText className="h-10 w-10 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500 to-amber-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-100 text-sm">Aguardando Validação</p>
                      <p className="text-3xl font-bold text-white">
                        {stats?.open_incidents || 0}
                      </p>
                    </div>
                    <AlertTriangle className="h-10 w-10 text-amber-100" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-sky-500 to-sky-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sky-100 text-sm">Aprovadas</p>
                      <p className="text-3xl font-bold text-white">
                        {stats?.in_progress_incidents || 0}
                      </p>
                    </div>
                    <CheckCircle className="h-10 w-10 text-sky-100" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-rose-500 to-rose-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-rose-100 text-sm">Rejeitadas</p>
                      <p className="text-3xl font-bold text-white">
                        {stats?.rejected_incidents || 0}
                      </p>
                    </div>
                    <XCircle className="h-10 w-10 text-rose-100" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-500 to-red-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-100 text-sm">Alto Impacto</p>
                      <p className="text-3xl font-bold text-white">
                        {stats?.high_impact_open || 0}
                      </p>
                    </div>
                    <TrendingUp className="h-10 w-10 text-red-100" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Critical Schools and Impact */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center text-red-600">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    {terms.criticalUnits} (Período selecionado)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-secondary-200">
                    {criticalSchools.length > 0 ? criticalSchools.map((school, index) => (
                      <div
                        key={school.id}
                        className="px-6 py-4 hover:bg-secondary-50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-secondary-900 flex items-center">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-2 ${
                              index === 0 ? 'bg-red-100 text-red-700' :
                              index === 1 ? 'bg-orange-100 text-orange-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {index + 1}
                            </span>
                            <span className="truncate max-w-[180px]">{school.name}</span>
                          </span>
                          <span className="text-lg font-bold text-red-600">
                            {school.count}
                          </span>
                        </div>
                        <p className="text-xs text-secondary-500 ml-8">
                          {school.region}
                        </p>
                      </div>
                    )) : (
                      <div className="px-6 py-8 text-center text-secondary-500">
                        Nenhuma {terms.incidentSingular.toLowerCase()} no período selecionado
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Por Nível de Impacto</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {byImpact.length > 0 ? byImpact.map((item) => {
                      const total = byImpact.reduce((sum, i) => sum + i.count, 0);
                      const percentage = total > 0 ? (item.count / total) * 100 : 0;
                      const colors: Record<string, { bg: string; bar: string }> = {
                        Baixo: { bg: 'bg-green-100', bar: 'bg-green-500' },
                        Médio: { bg: 'bg-yellow-100', bar: 'bg-yellow-500' },
                        Alto: { bg: 'bg-red-100', bar: 'bg-red-500' },
                      };
                      const color = colors[item.impact || ''] || {
                        bg: 'bg-gray-100',
                        bar: 'bg-gray-500',
                      };

                      return (
                        <div key={item.impact}>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-secondary-700">
                              {item.impact}
                            </span>
                            <span className="text-sm text-secondary-500">
                              {item.count} ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                          <div className={`h-3 rounded-full ${color.bg}`}>
                            <div
                              className={`h-3 rounded-full ${color.bar}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="text-center text-secondary-500 py-4">
                        Nenhuma {terms.incidentSingular.toLowerCase()} registrada
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{terms.incidentPlural} Recentes</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-secondary-200 max-h-[320px] overflow-y-auto">
                    {recentIncidents.length > 0 ? recentIncidents.map((incident) => (
                      <div
                        key={incident.id}
                        className="px-6 py-4 hover:bg-secondary-50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/incidents/${incident.id}`)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-secondary-900">
                            {incident.process_number}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${getImpactColor(
                              incident.impact_level
                            )}`}
                          >
                            {incident.impact_level}
                          </span>
                        </div>
                        <p className="text-sm text-secondary-600 truncate">
                          {incident.school}
                        </p>
                        <p className="text-xs text-secondary-400 mt-1">
                          {formatDateTime(incident.incident_date || incident.created_at)}
                        </p>
                      </div>
                    )) : (
                      <div className="px-6 py-8 text-center text-secondary-500">
                        Nenhuma {terms.incidentSingular.toLowerCase()} registrada
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Region and Sector Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-primary-600" />
                    {terms.incidentPlural} por Região
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    {byRegion.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={byRegion} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis
                            dataKey="region"
                            type="category"
                            width={140}
                            tick={{ fontSize: 11 }}
                          />
                          <Tooltip />
                          <Bar dataKey="count" name={terms.incidentPlural} radius={[0, 4, 4, 0]}>
                            {byRegion.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={REGION_COLORS[index % REGION_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-secondary-500">
                        Nenhuma {terms.incidentSingular.toLowerCase()} registrada
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por {terms.sector}</CardTitle>
                </CardHeader>
                <CardContent>
                  {setorChartData.length > 0 ? (
                    <>
                      <div className="w-full max-w-[360px] aspect-square mx-auto">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={setorChartData}
                              dataKey="count"
                              nameKey="setor"
                              cx="50%"
                              cy="50%"
                              outerRadius="70%"
                              labelLine={false}
                              label={renderSetorSliceLabel}
                            >
                              {setorChartData.map((_, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS[index % COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      {renderSetorLegend()}
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center text-secondary-500">
                      Nenhuma {terms.incidentSingular.toLowerCase()} registrada
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Monthly Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-primary-600" />
                  Tendência Mensal de {terms.incidentPlural}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrend}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorCount)"
                        name={terms.incidentPlural}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">Total de {terms.incidentPlural}</p>
                      <p className="text-3xl font-bold text-white">
                        {stats?.total_incidents || 0}
                      </p>
                    </div>
                    <FileText className="h-10 w-10 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-purple-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm">No Período</p>
                      <p className="text-3xl font-bold text-white">
                        {stats?.monthly_incidents || 0}
                      </p>
                    </div>
                    <TrendingUp className="h-10 w-10 text-purple-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-500 to-red-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-100 text-sm">Alto Impacto</p>
                      <p className="text-3xl font-bold text-white">
                        {stats?.high_impact_open || 0}
                      </p>
                    </div>
                    <AlertTriangle className="h-10 w-10 text-red-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500 to-green-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm">Regiões Atendidas</p>
                      <p className="text-3xl font-bold text-white">
                        {byRegion.length || 0}
                      </p>
                    </div>
                    <MapPin className="h-10 w-10 text-green-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Region and Sector Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Region Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-primary-600" />
                    {terms.incidentPlural} por Região
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    {byRegion.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={byRegion} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis
                            dataKey="region"
                            type="category"
                            width={120}
                            tick={{ fontSize: 11 }}
                          />
                          <Tooltip />
                          <Bar dataKey="count" name={terms.incidentPlural} radius={[0, 4, 4, 0]}>
                            {byRegion.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={REGION_COLORS[index % REGION_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-secondary-500">
                        Nenhuma {terms.incidentSingular.toLowerCase()} registrada
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Sector Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por {terms.sector}</CardTitle>
                </CardHeader>
                <CardContent>
                  {setorChartData.length > 0 ? (
                    <>
                      <div className="w-full max-w-[360px] aspect-square mx-auto">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={setorChartData}
                              dataKey="count"
                              nameKey="setor"
                              cx="50%"
                              cy="50%"
                              outerRadius="70%"
                              labelLine={false}
                              label={renderSetorSliceLabel}
                            >
                              {setorChartData.map((_, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS[index % COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      {renderSetorLegend()}
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center text-secondary-500">
                      Nenhuma {terms.incidentSingular.toLowerCase()} registrada
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Incidents */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>{terms.incidentPlural} Recentes</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-secondary-200 max-h-[360px] overflow-y-auto">
                  {recentIncidents.length > 0 ? recentIncidents.map((incident) => (
                    <div
                      key={incident.id}
                      className="px-6 py-4 hover:bg-secondary-50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/incidents/${incident.id}`)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-secondary-900">
                          {incident.process_number}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${getImpactColor(
                            incident.impact_level
                          )}`}
                        >
                          {incident.impact_level}
                        </span>
                      </div>
                      <p className="text-sm text-secondary-600 truncate">
                        {incident.school}
                      </p>
                      <p className="text-xs text-secondary-400 mt-1">
                        {formatDateTime(incident.incident_date || incident.created_at)}
                      </p>
                    </div>
                  )) : (
                    <div className="px-6 py-8 text-center text-secondary-500">
                      Nenhuma {terms.incidentSingular.toLowerCase()} registrada
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Monthly Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-primary-600" />
                  Tendência Mensal de {terms.incidentPlural}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrend}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorCount)"
                        name={terms.incidentPlural}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}






