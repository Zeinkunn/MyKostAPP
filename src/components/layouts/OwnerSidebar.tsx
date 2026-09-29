'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  BedDouble,
  Users,
  Receipt,
  CheckCircle2,
  BarChart3,
  MessageSquareWarning,
  UserCog,
  Settings,
  History,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', href: '/owner/dashboard', icon: LayoutDashboard },
  { label: 'Properti', href: '/owner/properti', icon: Building2 },
  { label: 'Kamar', href: '/owner/kamar', icon: BedDouble },
  { label: 'Penghuni', href: '/owner/penghuni', icon: Users },
  { label: 'Tagihan', href: '/owner/tagihan', icon: Receipt },
  { label: 'Verifikasi Bayar', href: '/owner/verifikasi', icon: CheckCircle2 },
  { label: 'Laporan Keuangan', href: '/owner/laporan', icon: BarChart3 },
  { label: 'Pengaduan', href: '/owner/pengaduan', icon: MessageSquareWarning },
  { label: 'Kelola User', href: '/owner/users', icon: UserCog },
  { label: 'Pengaturan', href: '/owner/pengaturan', icon: Settings },
  { label: 'Log Aktivitas', href: '/owner/log', icon: History },
];

export default function OwnerSidebar() {
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-slate-200 z-30">
      <div className="p-6 border-b border-slate-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
          M
        </div>
        <div>
          <h1 className="font-bold text-slate-900 text-lg leading-tight">MyKost</h1>
          <p className="text-xs text-slate-500 font-medium">Panel Pengelola</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-600 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive ? 'text-blue-600' : 'text-slate-400')} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <LogOut className="w-5 h-5 text-rose-500" />
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
}
