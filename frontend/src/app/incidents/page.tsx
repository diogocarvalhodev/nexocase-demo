'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import { Sidebar, Button, Card, CardContent, CardHeader, CardTitle, Select, Input, SkeletonTable } from '@/components';
import { Incident, Category, User, ImpactLevel, School } from '@/types';
import { formatDateTime, formatUserRole, getImpactColor, getStatusColor } from '@/lib/utils';
import { useTenantTerminology } from '@/lib/terminology';
import { Download, Eye, Plus, Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';

function IncidentsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { businessType, terms, isReady } = useTenantTerminology();
  const resolvePresetRange = (preset: string) => {
    const today = new Date();
    const toDateString = (value: Date) => value.toISOString().slice(0, 10);

    if (preset === 'day') {
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      return { startDate: toDateString(start), endDate: toDateString(today) };
    }
    if (preset === 'week') {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { startDate: toDateString(start), endDate: toDateString(today) };
    }
    if (preset === 'month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: toDateString(start), endDate: toDateString(today) };
    }
    if (preset === 'year') {
      const start = new Date(today.getFullYear(), 0, 1);
      return { startDate: toDateString(start), endDate: toDateString(today) };
    }
    if (preset === 'all') {
      return { startDate: '', endDate: '' };
    }

    return { startDate: '', endDate: '' };
  };

  const defaultRange = resolvePresetRange('all');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [setores, setSetores] = useState<Category[]>([]);
  const [impactLevels, setImpactLevels] = useState<ImpactLevel[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [operators, setOperators] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    setor: '',
    impact: '',
    schoolId: '',
    status: searchParams.get('status') || '',
    operatorId: '',
    query: '',
    operatorOnly: false,
    periodPreset: 'all',
    startDate: defaultRange.startDate,
    endDate: defaultRange.endDate,
  });
  const canSeeSetor = currentUser?.role === 'ADMIN' || currentUser?.role === 'MASTER' || currentUser?.role === 'OPERADOR' || currentUser?.is_admin;
  const canSeeSchool = currentUser?.role === 'ADMIN' || currentUser?.role === 'MASTER' || currentUser?.role === 'OPERADOR' || currentUser?.is_admin;
  const isOperator = currentUser?.role === 'OPERADOR';
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'MASTER' || currentUser?.is_admin;
  const pendingCount = incidents.filter(
    (incident) => incident.status === 'Aguardando Validação'
  ).length;

  const periodLabels: Record<string, string> = {
    all: 'Todos',
    day: 'Dia atual',
    week: 'Semana atual',
    month: 'Mes atual',
    year: 'Ano atual',
    custom: 'Periodo personalizado',
  };

  const isCustomPeriod = filters.periodPreset === 'custom';
  const periodBadgeLabel = periodLabels[filters.periodPreset] || 'Periodo selecionado';
  const periodRangeLabel = isCustomPeriod && (filters.startDate || filters.endDate)
    ? `${filters.startDate || '...'} a ${filters.endDate || '...'}`
    : '';

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

    fetchFilters();
  }, [router]);

  useEffect(() => {
    const statusParam = searchParams.get('status') || '';
    setFilters((prev) => ({ ...prev, status: statusParam }));
  }, [searchParams]);

  useEffect(() => {
    fetchIncidents();
  }, [filters, currentUser]);

  useEffect(() => {
    fetchOperators();
  }, [isAdmin]);

  const fetchFilters = async () => {
    try {
      const [sectorsRes, impactRes, schoolsRes] = await Promise.all([
        api.get('/api/options/categories'),
        api.get('/api/options/impact-levels'),
        api.get('/api/schools')
      ]);
      setSetores(Array.isArray(sectorsRes.data) ? sectorsRes.data : []);
      setImpactLevels(Array.isArray(impactRes.data) ? impactRes.data : []);
      setSchools(Array.isArray(schoolsRes.data) ? schoolsRes.data : []);
    } catch (error) {
      console.error('Erro ao carregar setores:', error);
    }
  };

  const fetchOperators = async () => {
    if (!isAdmin) {
      setOperators([]);
      return;
    }

    try {
      const response = await api.get('/api/auth/users');
      setOperators(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Erro ao carregar operadores:', error);
    }
  };

  const fetchIncidents = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.query) params.append('q', filters.query.trim());
      if (canSeeSetor && filters.setor) params.append('setor', filters.setor);
      if (filters.status) params.append('status_filter', filters.status);
      if (filters.impact) params.append('impact_level', filters.impact);
      if (canSeeSchool && filters.schoolId) params.append('school_id', filters.schoolId);
      if (filters.operatorId) params.append('operator_id', filters.operatorId);
      if (filters.operatorOnly && currentUser?.id) {
        params.append('operator_id', String(currentUser.id));
      }
      if (filters.startDate) params.append('start_date', filters.startDate);
      if (filters.endDate) params.append('end_date', filters.endDate);

      const response = await api.get(`/api/incidents?${params.toString()}`);
      setIncidents(response.data);
    } catch (error) {
      console.error('Erro ao carregar ocorrências:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async (incidentId: number, processNumber: string) => {
    try {
      const response = await api.get(`/api/incidents/${incidentId}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `oficio_${processNumber.replace(/\//g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      alert('Erro ao baixar o PDF. Tente novamente.');
    }
  };

  if (!isReady) {
    return <div className="min-h-screen bg-secondary-50" />;
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      <Sidebar />

      <main className="app-main">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-secondary-900">{terms.incidentPlural}</h1>
              <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                {periodBadgeLabel}{periodRangeLabel ? `: ${periodRangeLabel}` : ''}
              </span>
            </div>
            <p className="text-secondary-600 mt-1">
              Gerencie todos os {terms.incidentPlural.toLowerCase()} registrados
            </p>
          </div>
          <Link href="/incidents/new">
            <Button className="mt-0 w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Nova {terms.incidentSingular}
            </Button>
          </Link>
        </div>

        {isOperator && pendingCount > 0 && (
          <div className="mb-6 p-4 border border-amber-200 bg-amber-50 rounded-lg flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-amber-800">
                Existem {pendingCount} {terms.incidentPlural.toLowerCase()} aguardando validação.
              </p>
              <p className="text-sm text-amber-700">
                Use o filtro de status para revisar as pendentes.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setFilters((prev) => ({ ...prev, status: 'Aguardando Validação' }))}
            >
              Ver pendentes
            </Button>
          </div>
        )}

        {/* Collapsible Filters */}
        <Card className="mb-6">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-secondary-50/50 transition-colors rounded-xl"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-secondary-500" />
              <span className="text-sm font-medium text-secondary-700">Filtros</span>
              {(filters.setor || filters.impact || filters.schoolId || filters.status || filters.operatorId || filters.query || filters.periodPreset !== 'all') && (
                <span className="px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold">
                  {[filters.setor, filters.impact, filters.schoolId, filters.status, filters.operatorId, filters.query, filters.periodPreset !== 'all'].filter(Boolean).length}
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
                  value={filters.periodPreset}
                  onChange={(e) => {
                    const preset = e.target.value;
                    const range = resolvePresetRange(preset);
                    setFilters((prev) => ({
                      ...prev,
                      periodPreset: preset,
                      startDate: range.startDate,
                      endDate: range.endDate,
                    }));
                  }}
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

              {canSeeSetor ? (
                <Select
                  label={terms.sectorSingular}
                  options={setores.map((c) => ({ value: c.name, label: c.name }))}
                  value={filters.setor}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, setor: e.target.value }))
                  }
                />
              ) : null}

              {canSeeSchool ? (
                <Select
                  label={terms.unitSingular}
                  options={schools.map((s) => ({ value: s.id.toString(), label: s.name }))}
                  value={filters.schoolId}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, schoolId: e.target.value }))
                  }
                />
              ) : null}

              <Select
                label="Impacto"
                options={impactLevels.map((level) => ({ value: level.name, label: level.name }))}
                value={filters.impact}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, impact: e.target.value }))
                }
              />

              <Select
                label="Status"
                options={[
                  { value: 'Aguardando Validação', label: 'Aguardando Validação' },
                  { value: 'Aprovada', label: 'Aprovada' },
                  { value: 'Rejeitada', label: 'Rejeitada' },
                  { value: 'Fechado', label: 'Fechado' },
                ]}
                value={filters.status}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, status: e.target.value }))
                }
              />

              {isAdmin ? (
                <Select
                  label="Operador"
                  options={operators.map((op) => ({
                    value: op.id.toString(),
                    label: op.full_name,
                  }))}
                  value={filters.operatorId}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, operatorId: e.target.value }))
                  }
                />
              ) : null}

              {isOperator ? (
                <div className="flex items-end">
                  <Button
                    variant={filters.operatorOnly ? 'primary' : 'outline'}
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        operatorOnly: !prev.operatorOnly,
                      }))
                    }
                    className="w-full"
                  >
                    Somente minhas
                  </Button>
                </div>
              ) : null}

              <Input
                label="Busca"
                placeholder={`Processo, ${terms.unitSingular.toLowerCase()}, texto...`}
                value={filters.query}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, query: e.target.value }))
                }
              />

              {filters.periodPreset === 'custom' ? (
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Data Inicial
                  </label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, startDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              ) : null}

              {filters.periodPreset === 'custom' ? (
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Data Final
                  </label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              ) : null}

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() =>
                    setFilters({
                      setor: '',
                      impact: '',
                      schoolId: '',
                      status: '',
                      operatorId: '',
                      query: '',
                      operatorOnly: false,
                      periodPreset: 'all',
                      ...resolvePresetRange('all'),
                    })
                  }
                  className="w-full"
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
          )}
        </Card>

        {/* Incidents Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4">
                <SkeletonTable rows={6} />
              </div>
            ) : incidents.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary-100 flex items-center justify-center">
                  <Search className="h-7 w-7 text-secondary-400" />
                </div>
                <p className="text-secondary-600 font-medium">Nenhum {terms.incidentSingular.toLowerCase()} encontrado</p>
                <p className="text-secondary-400 text-sm mt-1">Tente ajustar os filtros de busca</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full table-striped">
                    <thead>
                      <tr className="border-b border-secondary-200">
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider bg-secondary-50/80">
                          Processo
                        </th>
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider bg-secondary-50/80">
                          {terms.unitSingular}
                        </th>
                        {canSeeSetor ? (
                          <th className="px-6 py-3.5 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider bg-secondary-50/80">
                            {terms.sectorSingular}
                          </th>
                        ) : null}
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider bg-secondary-50/80">
                          Impacto
                        </th>
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider bg-secondary-50/80">
                          Enviado por
                        </th>
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider bg-secondary-50/80">
                          Status
                        </th>
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider bg-secondary-50/80">
                          Data
                        </th>
                        <th className="px-6 py-3.5 text-right text-xs font-semibold text-secondary-500 uppercase tracking-wider bg-secondary-50/80">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-100">
                      {incidents.map((incident) => (
                        <tr
                          key={incident.id}
                          className="group cursor-pointer"
                          onClick={() => router.push(`/incidents/${incident.id}`)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-semibold text-secondary-900">
                              {incident.process_number}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-secondary-600 max-w-[200px] truncate block">
                              {incident.school?.name || 'N/A'}
                            </span>
                          </td>
                          {canSeeSetor ? (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-secondary-600">
                                {incident.setor || incident.category}
                              </span>
                            </td>
                          ) : null}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${getImpactColor(
                                incident.impact_level
                              )}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                              {incident.impact_level}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <p className="text-sm font-medium text-secondary-700">
                                {incident.operator?.full_name || 'N/A'}
                              </p>
                              <p className="text-xs text-secondary-400">
                                {formatUserRole(incident.operator, businessType)}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                incident.status
                              )}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                              {incident.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-secondary-500">
                              {formatDateTime(incident.incident_date || incident.created_at)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => router.push(`/incidents/${incident.id}`)}
                                className="p-2 text-secondary-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                title="Visualizar"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() =>
                                  handleDownloadPdf(incident.id, incident.process_number)
                                }
                                disabled={
                                  incident.status === 'Aguardando Validação'
                                  || incident.status === 'Rejeitada'
                                }
                                className={`p-2 rounded-lg transition-colors ${
                                  incident.status === 'Aguardando Validação'
                                  || incident.status === 'Rejeitada'
                                    ? 'text-secondary-300 cursor-not-allowed'
                                    : 'text-secondary-500 hover:text-green-600 hover:bg-green-50'
                                }`}
                                title={
                                  incident.status === 'Aguardando Validação'
                                  || incident.status === 'Rejeitada'
                                    ? 'Disponível apenas após aprovação'
                                    : 'Baixar PDF'
                                }
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden divide-y divide-secondary-100">
                  {incidents.map((incident) => (
                    <div
                      key={incident.id}
                      className="p-4 hover:bg-secondary-50/50 transition-colors cursor-pointer active:bg-secondary-100"
                      onClick={() => router.push(`/incidents/${incident.id}`)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-semibold text-secondary-900">{incident.process_number}</p>
                          <p className="text-xs text-secondary-500 mt-0.5">{incident.school?.name || 'N/A'}</p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(incident.status)}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                          {incident.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${getImpactColor(incident.impact_level)}`}>
                          {incident.impact_level}
                        </span>
                        <span className="text-xs text-secondary-400">
                          {formatDateTime(incident.incident_date || incident.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Results count */}
                <div className="px-4 sm:px-6 py-3 border-t border-secondary-100 bg-secondary-50/50">
                  <p className="text-xs text-secondary-500">
                    Mostrando {incidents.length} {incidents.length === 1 ? terms.incidentSingular.toLowerCase() : terms.incidentPlural.toLowerCase()}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function IncidentsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-secondary-50" /> }>
      <IncidentsPageContent />
    </Suspense>
  );
}

