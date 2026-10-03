'use client';

import { LogOut } from 'lucide-react';
import { useState } from 'react';

interface LogoutButtonProps {
  className?: string;
  variant?: 'sidebar' | 'profile';
}

export default function LogoutButton({
  className,
  variant = 'profile',
}: LogoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ action: 'CLEAR_CACHE' });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      window.location.href = '/login';
    }

  };

  if (variant === 'sidebar') {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className={
          className ||
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50'
        }
      >
        <LogOut className="w-5 h-5 text-rose-500 shrink-0" />
        <span>{loading ? 'Keluar...' : 'Keluar'}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={
        className ||
        'w-full p-3.5 flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-xs rounded-2xl border border-rose-200 transition-colors cursor-pointer disabled:opacity-50 shadow-xs'
      }
    >
      <LogOut className="w-4 h-4 shrink-0" />
      <span>{loading ? 'Sedang Keluar...' : 'Keluar dari Akun'}</span>
    </button>
  );
}
