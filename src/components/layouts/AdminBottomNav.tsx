'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BedDouble,
  Users,
  CheckCircle2,
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const adminMobileNav = [
  { label: 'Dashboard', href: '/owner/dashboard', icon: LayoutDashboard },
  { label: 'Kamar', href: '/owner/kamar', icon: BedDouble },
  { label: 'Penghuni', href: '/owner/penghuni', icon: Users },
  { label: 'Verifikasi', href: '/owner/verifikasi', icon: CheckCircle2 },
  { label: 'Lainnya', href: '/owner/menu', icon: Menu },
];

export default function AdminBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 flex items-center justify-around z-40 shadow-lg">
      {adminMobileNav.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== '/owner/dashboard' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center py-1 px-3 min-w-[64px] min-h-[44px] rounded-xl text-xs font-medium transition-colors',
              isActive ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-900'
            )}
          >
            <Icon className={cn('w-5 h-5 mb-0.5', isActive ? 'text-blue-600' : 'text-slate-400')} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
