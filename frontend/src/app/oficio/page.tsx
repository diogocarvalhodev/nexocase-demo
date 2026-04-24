'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import { Sidebar, Card, CardContent, CardHeader, CardTitle, Button, Textarea } from '@/components';
import { User } from '@/types';

const ALLOWED_ROLES = ['MASTER', 'ADMIN', 'CHEFIA'];

export default function OficioPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [textoOficio, setTextoOficio] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
        const parsedUser = JSON.parse(userStr) as User;
        if (!ALLOWED_ROLES.includes(parsedUser.role)) {
          router.push('/dashboard');
          return;
        }
        setCurrentUser(parsedUser);
      } catch {
        Cookies.remove('user');
        router.push('/login');
        return;
      }
    }

    const fetchTexto = async () => {
      try {
        const response = await api.get('/api/reports/oficio-text');
        setTextoOficio(response.data?.texto_oficio || '');
      } catch (fetchError) {
        console.error('Erro ao carregar texto do ofício:', fetchError);
        setError('Erro ao carregar o texto do ofício.');
      } finally {
        setLoading(false);
      }
    };

    fetchTexto();
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    setSuccess(null);
    setError(null);

    try {
      await api.put('/api/reports/oficio-text', {
        texto_oficio: textoOficio,
      });
      setSuccess('Texto do ofício atualizado com sucesso.');
    } catch (saveError) {
      console.error('Erro ao salvar texto do ofício:', saveError);
      setError('Erro ao salvar o texto do ofício.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary-50">
      <Sidebar />

      <main className="app-main">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">Texto do Ofício</h1>
            <p className="text-secondary-600 mt-1">
              Atualize o texto padrão exibido no PDF do ofício.
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving || loading} className="mt-4 sm:mt-0">
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Conteúdo do Ofício</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                {success}
              </div>
            )}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}
            <Textarea
              label="Texto"
              rows={14}
              value={textoOficio}
              onChange={(e) => setTextoOficio(e.target.value)}
              placeholder="Digite o texto padrão do ofício..."
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

