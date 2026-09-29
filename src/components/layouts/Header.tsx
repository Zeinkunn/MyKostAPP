'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, User } from 'lucide-react';
import { UserSessionPayload } from '@/lib/auth';

interface HeaderProps {
  user: UserSessionPayload;
  title?: string;
}

export default function Header({ user, title }: HeaderProps) {
  const isPenghuni = user.role === 'PENGHUNI';
  const notificationHref = isPenghuni ? '/penghuni/notifikasi' : '/owner/notifikasi';
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const checkUnread = async () => {
      try {
        const res = await fetch('/api/notifikasi');
        if (res.ok && isMounted) {
          const data = await res.json();
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (err) {
        // Silent catch for header polling
      }
    };
    checkUnread();
    const interval = setInterval(checkUnread, 30000); // refresh unread count every 30s
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm lg:hidden">
          M
        </div>
        <div>
          <h1 className="font-bold text-slate-900 text-base md:text-lg leading-snug">
            {title || (isPenghuni ? 'MyKost Penghuni' : 'MyKost Pengelola')}
          </h1>
          <p className="text-xs text-slate-500 hidden sm:block">
            Halo, <span className="font-semibold text-slate-700">{user.nama}</span> ({user.role})
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={notificationHref}
          aria-label="Notifikasi"
          className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <Bell className="w-5 h-5 text-slate-700" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 ring-2 ring-white text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        <Link
          href={isPenghuni ? '/penghuni/profil' : '/owner/profil'}
          className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors"
        >
          {user.nama ? user.nama.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
        </Link>
      </div>
    </header>
  );
}
