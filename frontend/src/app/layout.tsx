import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import ShowcaseBanner from '@/components/ShowcaseBanner';

export const metadata: Metadata = {
  title: 'NexoCase - Gestão de Casos',
  description: 'Sistema de gestão de casos multisetor',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="icon" href="/api/favicon?v=nc-2" type="image/svg+xml" />
      </head>
      <body className="bg-secondary-50 min-h-screen antialiased font-sans">
        {children}
        <ShowcaseBanner />
        <Toaster position="bottom-right" richColors closeButton duration={4000} />
      </body>
    </html>
  );
}
