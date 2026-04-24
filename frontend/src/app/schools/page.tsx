'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import {
  Sidebar,
  Button,
  Card,
  CardContent,
  Input,
} from '@/components';
import { School } from '@/types';
import { Plus, Building2, MapPin, Phone, Mail, Edit, Trash2 } from 'lucide-react';
import { useTenantTerminology } from '@/lib/terminology';

export default function SchoolsPage() {
  const router = useRouter();
  const { terms, isReady } = useTenantTerminology();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
  });

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

    fetchSchools();
  }, [router]);

  const fetchSchools = async () => {
    try {
      const response = await api.get('/api/schools');
      setSchools(response.data);
    } catch (error) {
      console.error(`Erro ao carregar ${terms.unitPlural.toLowerCase()}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingSchool) {
        await api.put(`/api/schools/${editingSchool.id}`, formData);
      } else {
        await api.post('/api/schools', formData);
      }
      
      fetchSchools();
      resetForm();
    } catch (error) {
      console.error(`Erro ao salvar ${terms.unitSingular.toLowerCase()}:`, error);
    }
  };

  const handleEdit = (school: School) => {
    setEditingSchool(school);
    setFormData({
      name: school.name,
      address: school.address || '',
      phone: school.phone || '',
      email: school.email || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (schoolId: number) => {
    if (!confirm(`Tem certeza que deseja desativar esta ${terms.unitSingular.toLowerCase()}?`)) return;

    try {
      await api.delete(`/api/schools/${schoolId}`);
      fetchSchools();
    } catch (error) {
      console.error(`Erro ao desativar ${terms.unitSingular.toLowerCase()}:`, error);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingSchool(null);
    setFormData({ name: '', address: '', phone: '', email: '' });
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
            <h1 className="text-2xl font-bold text-secondary-900">{terms.unitPlural}</h1>
            <p className="text-secondary-600 mt-1">
              Gerencie as {terms.unitPlural.toLowerCase()}
            </p>
          </div>
          <Button className="mt-4 sm:mt-0" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova {terms.unitSingular}
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-medium text-secondary-900 mb-4">
                {editingSchool ? `Editar ${terms.unitSingular}` : `Nova ${terms.unitSingular}`}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label={`Nome da ${terms.unitSingular} *`}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                  <Input
                    label="Endereço"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                  <Input
                    label="Telefone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                  <Input
                    label="E-mail"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingSchool ? 'Salvar Alterações' : 'Adicionar'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Schools Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-secondary-200 p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 skeleton rounded-lg" />
                  <div className="h-4 w-32 skeleton rounded" />
                </div>
                <div className="h-3 w-full skeleton rounded" />
                <div className="h-3 w-2/3 skeleton rounded" />
              </div>
            ))}
          </div>
        ) : schools.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary-100 flex items-center justify-center">
              <Building2 className="h-7 w-7 text-secondary-400" />
            </div>
            <p className="text-secondary-600 font-medium">Nenhuma {terms.unitSingular.toLowerCase()} cadastrada</p>
            <p className="text-secondary-400 text-sm mt-1">Clique em "Nova {terms.unitSingular}" para começar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schools.map((school) => (
              <Card key={school.id} className="group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-primary-400 to-primary-600" />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary-100 rounded-lg">
                        <Building2 className="h-5 w-5 text-primary-600" />
                      </div>
                      <h3 className="font-medium text-secondary-900 line-clamp-2">
                        {school.name}
                      </h3>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-secondary-600">
                    {school.address && (
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{school.address}</span>
                      </div>
                    )}
                    {school.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4" />
                        <span>{school.phone}</span>
                      </div>
                    )}
                    {school.email && (
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{school.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end space-x-1 mt-4 pt-3 border-t border-secondary-100 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(school)}
                      className="p-2 text-secondary-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(school.id)}
                      className="p-2 text-secondary-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

