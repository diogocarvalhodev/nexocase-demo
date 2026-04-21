'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = Cookies.get('token');
    if (token) {
      const userStr = Cookies.get('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.must_change_password) {
            router.push('/change-password');
            return;
          }
        } catch {
          Cookies.remove('user');
        }
      }

      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  );
}
