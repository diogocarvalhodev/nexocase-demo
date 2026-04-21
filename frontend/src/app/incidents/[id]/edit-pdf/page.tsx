'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import { Sidebar, Button, Card, CardContent, CardHeader, CardTitle, Input, Textarea } from '@/components';
import { Incident, User } from '@/types';
import { useTenantTerminology } from '@/lib/terminology';
import { ArrowLeft, Download } from 'lucide-react';

const ALLOWED_ROLES = ['MASTER', 'CHEFIA'];

interface PdfFormState {
  process_number: string;
  incident_date: string;
  unidade_escolar: string;
  endereco_escola: string;
  localizacao_interna: string;
  categoria: string;
  nivel_impacto: string;
  descricao: string;
  providencias: string;
  status: string;
}

export default function EditPdfPage() {
  const router = useRouter();
  const params = useParams();
  const { terms, isReady } = useTenantTerminology();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [form, setForm] = useState<PdfFormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
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
        const parsedUser = JSON.parse(userStr) as User;
        if (!ALLOWED_ROLES.includes(parsedUser.role)) {
          router.push(`/incidents/${params.id}`);
          return;
        }
        setCurrentUser(parsedUser);
      } catch {
        Cookies.remove('user');
        router.push('/login');
        return;
      }
    }

    const fetchData = async () => {
      try {
        const incidentRes = await api.get(`/api/incidents/${params.id}`);
        const incidentData: Incident = incidentRes.data;
        setIncident(incidentData);

        const incidentDate = new Date(incidentData.incident_date || incidentData.created_at)
          .toISOString()
          .slice(0, 10);

        setForm({
          process_number: incidentData.process_number,
          incident_date: incidentDate,
          unidade_escolar: incidentData.unidade_escolar || incidentData.school?.name || '',
          endereco_escola: incidentData.school?.address || '',
          localizacao_interna: incidentData.location || '',
          categoria: incidentData.setor || incidentData.category || '',
          nivel_impacto: incidentData.impact_level || '',
          descricao: incidentData.description || '',
          providencias: incidentData.actions_taken || '',
          status: incidentData.status || '',
        });
      } catch (fetchError) {
        console.error('Erro ao carregar dados do PDF:', fetchError);
        setError('Erro ao carregar os dados do PDF.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id, router]);

  const handleChange = (field: keyof PdfFormState, value: string) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleDownload = async () => {
    if (!form || !incident) return;

    setDownloading(true);
    setError(null);

    try {
      const response = await api.post(`/api/incidents/${incident.id}/pdf-edit`, form, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `oficio_${form.process_number.replace(/\//g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (downloadError) {
      console.error('Erro ao gerar PDF:', downloadError);
      setError('Erro ao gerar o PDF editado.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading || !form || !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      <Sidebar />

      <main className="lg:ml-64 p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/incidents/${params.id}`)}
              className="p-2 hover:bg-secondary-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-secondary-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-secondary-900">Editar PDF</h1>
              <p className="text-secondary-600 mt-1">
                Ajuste os campos do documento antes de gerar o PDF.
              </p>
            </div>
          </div>
          <Button onClick={handleDownload} disabled={downloading} className="mt-4 sm:mt-0">
            <Download className={`h-4 w-4 mr-2 ${downloading ? 'animate-spin' : ''}`} />
            {downloading ? 'Gerando...' : 'Baixar PDF editado'}
          </Button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados principais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Número do Processo"
                value={form.process_number}
                onChange={(e) => handleChange('process_number', e.target.value)}
              />
              <Input
                label={`Data da ${terms.incidentSingular}`}
                type="date"
                value={form.incident_date}
                onChange={(e) => handleChange('incident_date', e.target.value)}
              />
              <Input
                label={terms.unitSingular}
                value={form.unidade_escolar}
                onChange={(e) => handleChange('unidade_escolar', e.target.value)}
              />
              <Input
                label={`Endereço da ${terms.unitSingular}`}
                value={form.endereco_escola}
                onChange={(e) => handleChange('endereco_escola', e.target.value)}
              />
              <Input
                label={`Local da ${terms.incidentSingular}`}
                value={form.localizacao_interna}
                onChange={(e) => handleChange('localizacao_interna', e.target.value)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Classificação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label={terms.sectorSingular}
                value={form.categoria}
                onChange={(e) => handleChange('categoria', e.target.value)}
              />
              <Input
                label="Nível de Impacto"
                value={form.nivel_impacto}
                onChange={(e) => handleChange('nivel_impacto', e.target.value)}
              />
              <Input
                label="Status"
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
              />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Descrição e providências</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                label="Descrição detalhada"
                rows={6}
                value={form.descricao}
                onChange={(e) => handleChange('descricao', e.target.value)}
              />
              <Textarea
                label="Providências adotadas"
                rows={6}
                value={form.providencias}
                onChange={(e) => handleChange('providencias', e.target.value)}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
