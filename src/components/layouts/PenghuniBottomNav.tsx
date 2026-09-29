'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Receipt, MessageSquare, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const penghuniMobileNav = [
  { label: 'Beranda', href: '/penghuni/beranda', icon: Home },
  { label: 'Tagihan', href: '/penghuni/tagihan', icon: Receipt },
  { label: 'Komplain', href: '/penghuni/komplain', icon: MessageSquare },
  { label: 'Profil', href: '/penghuni/profil', icon: User },
];

export default function PenghuniBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-3 py-2 flex items-center justify-around z-40 shadow-lg">
      {penghuniMobileNav.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== '/penghuni/beranda' && pathname.startsWith(item.href));
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
