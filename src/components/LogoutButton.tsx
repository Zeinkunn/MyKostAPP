'use client';

import { LogOut, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import ConfirmDialog from '@/components/ConfirmDialog';

interface LogoutButtonProps {
  className?: string;
  variant?: 'sidebar' | 'profile' | 'profile-card';
  label?: string;
  sublabel?: string;
  confirmTitle?: string;
  confirmMessage?: string;
}

export default function LogoutButton({
  className,
  variant = 'profile-card',
  label,
  sublabel,
  confirmTitle,
  confirmMessage,
}: LogoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
      <>
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          disabled={loading}
          className={
            className ||
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50'
          }
        >
          <LogOut className="w-5 h-5 text-rose-500 shrink-0" />
          <span>{loading ? 'Keluar...' : label || 'Keluar'}</span>
        </button>

        <ConfirmDialog
          isOpen={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={handleLogout}
          loading={loading}
          title={confirmTitle || 'Keluar dari Sesi?'}
          message={confirmMessage || 'Apakah Anda yakin ingin keluar dari akun ini?'}
        />
      </>
    );
  }

  if (variant === 'profile-card') {
    return (
      <>
        <div className="bg-white rounded-2xl shadow-xs overflow-hidden border border-rose-100">
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={loading}
            className={
              className ||
              'w-full flex items-center justify-between p-3.5 text-left bg-rose-50/50 hover:bg-rose-50 active:bg-rose-100/60 transition-colors cursor-pointer group disabled:opacity-50'
            }
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0 group-hover:scale-105 transition-transform">
                <LogOut className="w-5 h-5" />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-bold text-rose-600 truncate">{label || 'Keluar'}</p>
                <p className="text-xs text-rose-500/80 truncate">
                  {sublabel || 'Akhiri sesi aktif di perangkat ini'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-rose-400 shrink-0 ml-2" />
          </button>
        </div>

        <ConfirmDialog
          isOpen={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={handleLogout}
          loading={loading}
          title={confirmTitle || 'Keluar dari Sesi?'}
          message={
            confirmMessage ||
            'Apakah Anda yakin ingin mengakhiri sesi aktif di perangkat ini?'
          }
        />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        className={
          className ||
          'w-full p-3.5 flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-xs rounded-2xl border border-rose-200 transition-colors cursor-pointer disabled:opacity-50 shadow-xs'
        }
      >
        <LogOut className="w-4 h-4 shrink-0" />
        <span>{loading ? 'Sedang Keluar...' : label || 'Keluar dari Akun'}</span>
      </button>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleLogout}
        loading={loading}
        title={confirmTitle || 'Keluar dari Sesi?'}
        message={
          confirmMessage ||
          'Apakah Anda yakin ingin mengakhiri sesi aktif di perangkat ini?'
        }
      />
    </>
  );
}
