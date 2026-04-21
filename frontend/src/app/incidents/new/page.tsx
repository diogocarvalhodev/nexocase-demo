'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import {
  Sidebar,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  Input,
  Textarea,
} from '@/components';
import {
  School,
  IncidentFormData,
  Category,
  Location,
  ImpactLevel,
  User,
} from '@/types';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { useTenantTerminology } from '@/lib/terminology';

export default function NewIncidentPage() {
  const router = useRouter();
  const { terms, isReady } = useTenantTerminology();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [setores, setSetores] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [impactLevels, setImpactLevels] = useState<ImpactLevel[]>([]);
  const [directorSchoolName, setDirectorSchoolName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<IncidentFormData>({
    defaultValues: {
      incident_date: new Date().toISOString().slice(0, 10),
    },
  });

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

    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      const [schoolsRes, sectorsRes, locationsRes, impactRes] = await Promise.all([
        api.get('/api/schools'),
        api.get('/api/options/categories'),
        api.get('/api/options/locations'),
        api.get('/api/options/impact-levels'),
      ]);
      const userStr = Cookies.get('user');
      let parsedUser: User | null = null;
      if (userStr) {
        try {
          parsedUser = JSON.parse(userStr);
        } catch {
          parsedUser = null;
        }
      }

      if (parsedUser?.role === 'DIRETOR' && parsedUser.escola_vinculada) {
        const filteredSchools = schoolsRes.data.filter(
          (school: School) => school.id === parsedUser?.escola_vinculada
        );
        setSchools(filteredSchools);
        setValue('school_id', parsedUser.escola_vinculada);
        setDirectorSchoolName(filteredSchools[0]?.name || null);
      } else {
        setSchools(schoolsRes.data);
        setDirectorSchoolName(null);
      }
      setSetores(sectorsRes.data);
      setLocations(locationsRes.data);
      setImpactLevels(impactRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const onSubmit = async (data: IncidentFormData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/api/incidents', {
        ...data,
        school_id: parseInt(data.school_id.toString()),
        incident_date: data.incident_date ? `${data.incident_date}T12:00:00` : undefined,
      });

      if (response.data.status === 'Aguardando Validação') {
        setSuccessMessage(`${terms.incidentSingular} enviada para validação. Aguarde um operador aprovar.`);
      } else {
        setSuccessMessage(`${terms.incidentSingular} registrada com sucesso! O ofício foi gerado automaticamente.`);
      }
      reset();

      // Redirecionar após 2 segundos
      setTimeout(() => {
        router.push(`/incidents/${response.data.id}`);
      }, 2000);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          `Erro ao registrar ${terms.incidentSingular.toLowerCase()}. Tente novamente.`
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isReady) {
    return <div className="min-h-screen bg-secondary-50" />;
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      <Sidebar />

      <main className="lg:ml-64 p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-secondary-900">Nova {terms.incidentSingular}</h1>
          <p className="text-secondary-600 mt-1">
            Registre uma nova {terms.incidentSingular.toLowerCase()} no sistema
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center space-x-3 animate-fade-in">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
              <p className="text-sm text-green-600">Redirecionando...</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3 animate-fade-in">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Formulário de Registro</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Section 1 - Identificação */}
              <div>
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-secondary-200">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold">1</span>
                  <h3 className="text-base font-semibold text-secondary-900">Identificação da {terms.unitSingular}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {currentUser?.role === 'DIRETOR' ? (
                    <>
                      <Input
                        label={terms.unitSingular}
                        value={directorSchoolName || 'Unidade vinculada'}
                        disabled
                      />
                      <input
                        type="hidden"
                        {...register('school_id', {
                          required: `Selecione uma ${terms.unitSingular.toLowerCase()}`,
                        })}
                      />
                    </>
                  ) : (
                    <Select
                      label={`${terms.unitSingular} *`}
                      id="school_id"
                      options={schools.map((s) => ({
                        value: s.id.toString(),
                        label: s.name,
                      }))}
                      {...register('school_id', {
                        required: `Selecione uma ${terms.unitSingular.toLowerCase()}`,
                      })}
                      error={errors.school_id?.message}
                    />
                  )}

                  <Select
                    label="Localização Interna *"
                    id="location"
                    options={locations.map((l) => ({ value: l.name, label: l.name }))}
                    {...register('location', {
                      required: 'Selecione a localização',
                    })}
                    error={errors.location?.message}
                  />

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Data da {terms.incidentSingular} *
                    </label>
                    <input
                      type="date"
                      {...register('incident_date', {
                        required: `Selecione a data da ${terms.incidentSingular.toLowerCase()}`,
                      })}
                      max={new Date().toISOString().slice(0, 10)}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    {errors.incident_date?.message && (
                      <p className="mt-1 text-sm text-red-600">{errors.incident_date.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 2 - Classificação */}
              <div>
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-secondary-200">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold">2</span>
                  <h3 className="text-base font-semibold text-secondary-900">Classificação do {terms.incidentSingular}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Select
                    label={`${terms.sectorSingular} *`}
                    id="setor"
                    options={setores.map((c) => ({ value: c.name, label: c.name }))}
                    {...register('setor', {
                      required: `Selecione ${terms.sectorSingular.toLowerCase()}`,
                    })}
                    error={errors.setor?.message}
                  />

                  <Select
                    label="Nível de Impacto *"
                    id="impact_level"
                    options={impactLevels.map((i) => ({ value: i.name, label: i.name }))}
                    {...register('impact_level', {
                      required: 'Selecione o nível de impacto',
                    })}
                    error={errors.impact_level?.message}
                  />
                </div>
              </div>

              {/* Section 3 - Descrição */}
              <div>
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-secondary-200">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold">3</span>
                  <h3 className="text-base font-semibold text-secondary-900">Descrição da {terms.incidentSingular}</h3>
                </div>
                <Textarea
                  label="Descrição Detalhada *"
                  id="description"
                  rows={6}
                  placeholder="Descreva detalhadamente o incidente ocorrido, incluindo horário, pessoas envolvidas e circunstâncias..."
                  {...register('description', {
                    required: 'A descrição é obrigatória',
                    minLength: {
                      value: 20,
                      message: 'A descrição deve ter pelo menos 20 caracteres',
                    },
                  })}
                  error={errors.description?.message}
                />
              </div>

              {/* Section 4 - Providências */}
              <div>
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-secondary-200">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary-100 text-secondary-600 flex items-center justify-center text-sm font-bold">4</span>
                  <h3 className="text-base font-semibold text-secondary-900">Providências Adotadas</h3>
                </div>
                <Textarea
                  label="Providências"
                  id="actions_taken"
                  rows={4}
                  placeholder="Descreva as providências já tomadas ou que serão tomadas para resolver o incidente..."
                  {...register('actions_taken')}
                />
              </div>

              {/* Submit - Sticky action bar */}
              <div className="sticky bottom-0 -mx-6 -mb-4 px-6 py-4 bg-white/80 backdrop-blur-lg border-t border-secondary-200 flex items-center justify-end space-x-4 rounded-b-xl">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/incidents')}
                >
                  Cancelar
                </Button>
                <Button type="submit" loading={loading}>
                  Registrar {terms.incidentSingular}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
