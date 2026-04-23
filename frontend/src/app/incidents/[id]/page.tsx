'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import {
  Sidebar,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Textarea,
} from '@/components';
import { Incident, User } from '@/types';
import { formatDateTime, formatUserRole, getImpactColor, getStatusColor } from '@/lib/utils';
import { useTenantTerminology } from '@/lib/terminology';
import {
  ArrowLeft,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Building2,
  MapPin,
  Tag,
  User as UserIcon,
  Calendar,
  FileText,
} from 'lucide-react';

export default function IncidentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { businessType, terms, isReady } = useTenantTerminology();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationNote, setValidationNote] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

    fetchIncident();
  }, [params.id, router]);

  const fetchIncident = async () => {
    try {
      const response = await api.get(`/api/incidents/${params.id}`);
      setIncident(response.data);
    } catch (error) {
      console.error(`Erro ao carregar ${terms.incidentSingular.toLowerCase()}:`, error);
      setError(`Erro ao carregar os detalhes da ${terms.incidentSingular.toLowerCase()}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!incident) return;

    if (
      incident.status === 'Aguardando Validação'
      || incident.status === 'Rejeitada'
    ) {
      setError('PDF disponível apenas após aprovação.');
      return;
    }

    try {
      const response = await api.get(`/api/incidents/${incident.id}/pdf`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `oficio_${incident.process_number.replace(/\//g, '_')}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      setError('Erro ao baixar o PDF. Tente novamente.');
    }
  };

  const handleRegeneratePdf = async () => {
    if (!incident) return;

    if (
      incident.status === 'Aguardando Validação'
      || incident.status === 'Rejeitada'
    ) {
      setError('PDF disponível apenas após aprovação.');
      return;
    }

    setUpdating(true);
    setError(null);

    try {
      await api.post(`/api/incidents/${incident.id}/regenerate-pdf`);
      setSuccess('PDF regenerado com sucesso!');
      fetchIncident();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao regenerar PDF.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading || !isReady) {
    return (
      <div className="min-h-screen bg-secondary-50">
        <Sidebar />
        <main className="lg:ml-64 p-6 lg:p-8">
          <div className="space-y-6 animate-fade-in">
            <div className="h-4 w-48 skeleton rounded-lg" />
            <div className="h-8 w-64 skeleton rounded-lg" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white rounded-xl border border-secondary-200 p-6 space-y-3">
                  <div className="h-4 w-40 skeleton rounded" />
                  <div className="h-4 w-full skeleton rounded" />
                  <div className="h-4 w-3/4 skeleton rounded" />
                </div>
              </div>
              <div className="bg-white rounded-xl border border-secondary-200 p-6 space-y-3">
                <div className="h-4 w-32 skeleton rounded" />
                <div className="h-4 w-full skeleton rounded" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="min-h-screen bg-secondary-50">
        <Sidebar />
        <main className="lg:ml-64 p-6 lg:p-8">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-secondary-600">{terms.incidentSingular} não encontrada</p>
            <Button variant="outline" className="mt-4" onClick={() => router.push('/incidents')}>
              Voltar para lista
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const isOperator = currentUser?.role === 'OPERADOR';
  const isPendingValidation = incident.status === 'Aguardando Validação';
  const isRejected = incident.status === 'Rejeitada';
  const isPdfBlocked = isPendingValidation || isRejected;

  const canEditPdf = currentUser?.role === 'MASTER'
    || currentUser?.role === 'ADMIN'
    || currentUser?.role === 'CHEFIA'
    || currentUser?.is_admin;

  const handleApproveIncident = async () => {
    if (!incident) return;

    setValidating(true);
    setError(null);

    try {
      const response = await api.post(`/api/incidents/${incident.id}/approve`, {
        note: validationNote,
      });
      setIncident(response.data);
      setSuccess(`${terms.incidentSingular} aprovada com sucesso!`);
      setValidationNote('');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || `Erro ao aprovar ${terms.incidentSingular.toLowerCase()}.`);
    } finally {
      setValidating(false);
    }
  };

  const handleRejectIncident = async () => {
    if (!incident) return;

    setValidating(true);
    setError(null);

    try {
      const response = await api.post(`/api/incidents/${incident.id}/reject`, {
        note: validationNote,
      });
      setIncident(response.data);
      setSuccess(`${terms.incidentSingular} rejeitada.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || `Erro ao rejeitar ${terms.incidentSingular.toLowerCase()}.`);
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary-50">
      <Sidebar />

      <main className="lg:ml-64 p-6 lg:p-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm mb-6">
          <button onClick={() => router.push('/dashboard')} className="text-secondary-400 hover:text-secondary-600 transition-colors">Painel</button>
          <span className="text-secondary-300">/</span>
          <button onClick={() => router.push('/incidents')} className="text-secondary-400 hover:text-secondary-600 transition-colors">{terms.incidentPlural}</button>
          <span className="text-secondary-300">/</span>
          <span className="text-secondary-700 font-medium">{incident.process_number}</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/incidents')}
              className="p-2 hover:bg-secondary-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-secondary-500" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-secondary-900">
                {incident.process_number}
              </h1>
              <p className="text-secondary-600 mt-1">Detalhes da {terms.incidentSingular.toLowerCase()}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 mt-4 sm:mt-0">
            <Button
              variant="outline"
              onClick={handleRegeneratePdf}
              disabled={updating || isPdfBlocked}
              title={isPdfBlocked ? 'Disponível apenas após aprovação' : 'Regenerar PDF'}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${updating ? 'animate-spin' : ''}`} />
              Regenerar PDF
            </Button>
            {canEditPdf && !isPdfBlocked && (
              <Button
                variant="outline"
                onClick={() => router.push(`/incidents/${incident.id}/edit-pdf`)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Editar PDF
              </Button>
            )}
            <Button
              onClick={handleDownloadPdf}
              disabled={isPdfBlocked}
              title={isPdfBlocked ? 'Disponível apenas após aprovação' : 'Baixar PDF'}
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar PDF
            </Button>
          </div>
        </div>

        {/* Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(
              incident.status
            )}`}
          >
            {incident.status}
          </span>
          {incident.validated_at && (
            <span className="text-xs text-secondary-500">
              Validado em {formatDateTime(incident.validated_at)}
            </span>
          )}
        </div>

        {(incident.status === 'Aprovada' || isRejected) && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm font-medium text-amber-800">
              {isRejected ? `${terms.incidentSingular} rejeitada` : `${terms.incidentSingular} aprovada`}
            </p>
            <p className="text-sm text-amber-700 mt-1">
              Validado por: {incident.validator?.full_name || (incident.validated_by ? `ID ${incident.validated_by}` : 'Não informado')}
              {incident.validator ? ` (${formatUserRole(incident.validator, businessType)})` : ''}
            </p>
            {incident.validated_at && (
              <p className="text-sm text-amber-700">
                Em {formatDateTime(incident.validated_at)}
              </p>
            )}
            {(incident.validation_note || incident.rejection_reason) && (
              <p className="text-sm text-amber-700 mt-1">
                Descrição: {incident.validation_note || incident.rejection_reason}
              </p>
            )}
          </div>
        )}

        {isOperator && isPendingValidation && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Validação do Operador</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                label="Descrição (opcional)"
                rows={3}
                value={validationNote}
                onChange={(event) => setValidationNote(event.target.value)}
              />
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleApproveIncident} disabled={validating}>
                  Aprovar ocorrência
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRejectIncident}
                  disabled={validating}
                >
                  Rejeitar ocorrência
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <Building2 className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm text-secondary-500">{terms.unitSingular}</p>
                      <p className="font-medium text-secondary-900">
                        {incident.school?.name || 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <MapPin className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-secondary-500">Localização</p>
                      <p className="font-medium text-secondary-900">
                        {incident.location}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Tag className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-secondary-500">{terms.sectorSingular}</p>
                      <p className="font-medium text-secondary-900">
                        {incident.setor || incident.category}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <UserIcon className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-secondary-500">Enviado por</p>
                      <p className="font-medium text-secondary-900">
                        {incident.operator?.full_name || 'N/A'}
                      </p>
                      <p className="text-xs text-secondary-500">
                        {formatUserRole(incident.operator, businessType)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Descrição Detalhada</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-secondary-700 whitespace-pre-wrap">
                  {incident.description}
                </p>
              </CardContent>
            </Card>

            {/* Actions Taken */}
            <Card>
              <CardHeader>
                <CardTitle>Providências Adotadas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-secondary-700 whitespace-pre-wrap">
                  {incident.actions_taken || 'Nenhuma providência registrada.'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Impacto Card */}
            <Card>
              <CardHeader>
                <CardTitle>Informações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-secondary-500">Impacto</span>
                    <span
                      className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getImpactColor(
                        incident.impact_level
                      )}`}
                    >
                      {incident.impact_level}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-secondary-500">Data da {terms.incidentSingular.toLowerCase()}</span>
                    <span className="text-sm text-secondary-700">
                      {formatDateTime(incident.incident_date || incident.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-secondary-500">Registrado em</span>
                    <span className="text-sm text-secondary-700">
                      {formatDateTime(incident.created_at)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>



            {/* PDF Info */}
            <Card>
              <CardHeader>
                <CardTitle>Documento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <FileText className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-secondary-900">
                      Documento Oficial
                    </p>
                    <p className="text-xs text-secondary-500">
                      {incident.pdf_path ? 'PDF disponível' : 'PDF não gerado'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
