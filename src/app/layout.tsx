import type { Metadata, Viewport } from 'next';
import './globals.css';
import OfflineBanner from '@/components/pwa/OfflineBanner';

export const metadata: Metadata = {
  title: 'MyKost — Aplikasi Manajemen Kost',
  description: 'Aplikasi manajemen kost modern untuk pengelola dan penghuni.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased bg-slate-50 text-slate-900 min-h-screen">
        <OfflineBanner />
        {children}
      </body>
    </html>
  );
}
