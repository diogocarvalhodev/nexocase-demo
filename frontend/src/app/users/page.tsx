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
  Input,
  Select,
} from '@/components';
import { Category, User } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { useTenantTerminology } from '@/lib/terminology';
import {
  Plus,
  User as UserIcon,
  Mail,
  Shield,
  ShieldOff,
  UserCheck,
  UserX,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface SchoolOption {
  id: number;
  name: string;
  address?: string | null;
}

interface UserFormData {
  username: string;
  email: string;
  full_name: string;
  password: string;
  role: 'CHEFIA' | 'GESTOR_SETOR' | 'DIRETOR' | 'OPERADOR';
  escola_vinculada?: number | null;
  setor_vinculado?: string | null;
}

export default function UsersPage() {
  const router = useRouter();
  const { terms, isReady } = useTenantTerminology();
  const [users, setUsers] = useState<User[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [setores, setSetores] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UserFormData>({
    defaultValues: {
      role: 'DIRETOR',
      escola_vinculada: null,
      setor_vinculado: null,
    },
  });

  const roleRegister = register('role', { required: 'Campo obrigatório' });
  const schoolRegister = register('escola_vinculada');
  const setorRegister = register('setor_vinculado');

  const selectedRole = watch('role');
  const selectedSchoolId = watch('escola_vinculada');
  const selectedSetor = watch('setor_vinculado');

  useEffect(() => {
    const token = Cookies.get('token');
    const userStr = Cookies.get('user');
    
    if (!token) {
      router.push('/login');
      return;
    }

    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.role !== 'MASTER') {
        router.push('/dashboard');
        return;
      }
    }

    fetchUsers();
    fetchSchools();
    fetchSetores();
  }, [router]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/auth/users');
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const response = await api.get('/api/admin/schools?include_inactive=false');
      setSchools(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Erro ao carregar escolas:', error);
    }
  };

  const fetchSetores = async () => {
    try {
      const response = await api.get('/api/options/categories');
      setSetores(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Erro ao carregar setores:', error);
    }
  };

  const onSubmit = async (data: UserFormData) => {
    setFormLoading(true);
    setApiError(null);

    if (data.role === 'DIRETOR' && !data.escola_vinculada) {
      setError('escola_vinculada', {
        type: 'required',
        message: `Selecione uma ${terms.unitSingular.toLowerCase()}.`
      });
      setFormLoading(false);
      return;
    }

    if (data.role === 'GESTOR_SETOR' && !data.setor_vinculado) {
      setError('setor_vinculado', {
        type: 'required',
        message: `Selecione ${terms.sectorSingular.toLowerCase()}.`
      });
      setFormLoading(false);
      return;
    }

    if (data.role !== 'DIRETOR') {
      data.escola_vinculada = null;
    }

    if (data.role !== 'GESTOR_SETOR') {
      data.setor_vinculado = null;
    }

    if (data.role === 'DIRETOR' && data.escola_vinculada) {
      data.escola_vinculada = Number(data.escola_vinculada);
    }

    try {
      await api.post('/api/auth/register', data);
      setSuccess('Usuário criado com sucesso!');
      fetchUsers();
      reset();
      setShowForm(false);

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setApiError(err.response?.data?.detail || 'Erro ao criar usuário.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleActive = async (userId: number) => {
    try {
      await api.put(`/api/auth/users/${userId}/toggle-active`);
      fetchUsers();
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">Usuários</h1>
            <p className="text-secondary-600 mt-1">
              Gerencie os operadores do sistema
            </p>
          </div>
          <Button className="mt-4 sm:mt-0" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Usuário
          </Button>
        </div>

        {/* Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center space-x-3 animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {apiError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3 animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
            <p className="text-sm text-red-700">{apiError}</p>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-medium text-secondary-900 mb-4">
                Novo Usuário
              </h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Nome de Usuário *"
                    {...register('username', { required: 'Campo obrigatório' })}
                    error={errors.username?.message}
                  />
                  <Input
                    label="Nome Completo *"
                    {...register('full_name', { required: 'Campo obrigatório' })}
                    error={errors.full_name?.message}
                  />
                  <Input
                    label="E-mail *"
                    type="email"
                    {...register('email', {
                      required: 'Campo obrigatório',
                      pattern: {
                        value: /^\S+@\S+$/i,
                        message: 'E-mail inválido',
                      },
                    })}
                    error={errors.email?.message}
                  />
                  <Input
                    label="Senha *"
                    type="password"
                    {...register('password', {
                      required: 'Campo obrigatório',
                      minLength: {
                        value: 6,
                        message: 'Mínimo de 6 caracteres',
                      },
                    })}
                    error={errors.password?.message}
                  />
                </div>
                <div>
                  <Select
                    label="Perfil"
                    options={[
                      { value: 'DIRETOR', label: terms.directorRoleLabel },
                      { value: 'GESTOR_SETOR', label: terms.sectorManagerRoleLabel },
                      { value: 'CHEFIA', label: 'Chefia' },
                      { value: 'OPERADOR', label: 'Operador' },
                    ]}
                    value={selectedRole}
                    name={roleRegister.name}
                    onBlur={roleRegister.onBlur}
                    ref={roleRegister.ref}
                    onChange={(event) => {
                      roleRegister.onChange(event);
                      const nextRole = event.target.value as UserFormData['role'];
                      setValue('role', nextRole, { shouldValidate: true });
                      clearErrors(['role', 'escola_vinculada', 'setor_vinculado']);
                      if (nextRole !== 'DIRETOR') {
                        setValue('escola_vinculada', null, { shouldValidate: true });
                      }
                      if (nextRole !== 'GESTOR_SETOR') {
                        setValue('setor_vinculado', null, { shouldValidate: true });
                      }
                    }}
                    error={errors.role?.message}
                  />
                </div>
                {selectedRole === 'DIRETOR' && (
                  <div>
                    <Select
                      label={terms.unitSingular}
                      options={schools.map((school) => ({
                        value: school.id.toString(),
                        label: school.name,
                      }))}
                      value={selectedSchoolId ? String(selectedSchoolId) : ''}
                      name={schoolRegister.name}
                      onBlur={schoolRegister.onBlur}
                      ref={schoolRegister.ref}
                      onChange={(event) => {
                        schoolRegister.onChange(event);
                        const nextValue = event.target.value
                          ? Number(event.target.value)
                          : null;
                        setValue('escola_vinculada', nextValue, { shouldValidate: true });
                        clearErrors('escola_vinculada');
                      }}
                      error={errors.escola_vinculada?.message}
                    />
                  </div>
                )}
                {selectedRole === 'GESTOR_SETOR' && (
                  <div>
                    <Select
                      label={terms.sectorSingular}
                      options={setores.map((setor) => ({
                        value: setor.name,
                        label: setor.name,
                      }))}
                      value={selectedSetor || ''}
                      name={setorRegister.name}
                      onBlur={setorRegister.onBlur}
                      ref={setorRegister.ref}
                      onChange={(event) => {
                        setorRegister.onChange(event);
                        setValue('setor_vinculado', event.target.value || null, {
                          shouldValidate: true,
                        });
                        clearErrors('setor_vinculado');
                      }}
                      error={errors.setor_vinculado?.message}
                    />
                  </div>
                )}
                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      reset();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" loading={formLoading}>
                    Criar Usuário
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-10 h-10 skeleton rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-40 skeleton rounded" />
                      <div className="h-3 w-56 skeleton rounded" />
                    </div>
                    <div className="h-6 w-20 skeleton rounded-full" />
                  </div>
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary-100 flex items-center justify-center">
                  <UserIcon className="h-7 w-7 text-secondary-400" />
                </div>
                <p className="text-secondary-600 font-medium">Nenhum usuário cadastrado</p>
                <p className="text-secondary-400 text-sm mt-1">Clique em "Novo Usuário" para começar</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-striped">
                  <thead className="bg-secondary-50/80 border-b border-secondary-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                        E-mail
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                        Criado em
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-200">
                    {users.map((user) => (
                      <tr key={user.id} className="group hover:bg-secondary-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                              <span className="text-primary-700 font-semibold">
                                {user.full_name.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-secondary-900">
                                {user.full_name}
                              </p>
                              <p className="text-xs text-secondary-500">@{user.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2 text-sm text-secondary-600">
                            <Mail className="h-4 w-4" />
                            <span>{user.email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.role === 'MASTER' && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              <Shield className="h-3 w-3 mr-1" />
                              Master
                            </span>
                          )}
                          {user.role === 'CHEFIA' && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              <UserIcon className="h-3 w-3 mr-1" />
                              Chefia
                            </span>
                          )}
                          {user.role === 'GESTOR_SETOR' && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
                              <UserIcon className="h-3 w-3 mr-1" />
                              {terms.sectorManagerRoleLabel}
                            </span>
                          )}
                          {user.role === 'DIRETOR' && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <UserIcon className="h-3 w-3 mr-1" />
                              {terms.directorRoleLabel}
                            </span>
                          )}
                          {user.role === 'OPERADOR' && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              <UserIcon className="h-3 w-3 mr-1" />
                              Operador
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.is_active ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <UserCheck className="h-3 w-3 mr-1" />
                              Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <UserX className="h-3 w-3 mr-1" />
                              Inativo
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-secondary-500">
                            {formatDateTime(user.created_at)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleToggleActive(user.id)}
                            className={`p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
                              user.is_active
                                ? 'text-red-500 hover:text-red-600 hover:bg-red-50'
                                : 'text-green-500 hover:text-green-600 hover:bg-green-50'
                            }`}
                            title={user.is_active ? 'Desativar' : 'Ativar'}
                          >
                            {user.is_active ? (
                              <ShieldOff className="h-4 w-4" />
                            ) : (
                              <Shield className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!loading && users.length > 0 && (
              <div className="px-6 py-3 border-t border-secondary-100 text-xs text-secondary-500">
                {users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

