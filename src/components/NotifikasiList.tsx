'use client';

import { useState, useEffect } from 'react';
import { Bell, CheckCheck, Clock, ShieldAlert, CreditCard, MessageSquare } from 'lucide-react';
import { formatDateIndonesian } from '@/lib/utils';

interface NotifikasiItem {
  id: string;
  judul: string;
  pesan: string;
  tipe: string;
  dibaca: boolean;
  created_at: string;
}

export default function NotifikasiList() {
  const [notifications, setNotifications] = useState<NotifikasiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifikasi = async () => {
    try {
      const res = await fetch('/api/notifikasi');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifikasi || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Fetch notifikasi error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifikasi();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifikasi', { method: 'PUT' });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, dibaca: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const handleMarkSingleRead = async (id: string, currentlyRead: boolean) => {
    if (currentlyRead) return;
    try {
      await fetch('/api/notifikasi', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, dibaca: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Mark single read error:', err);
    }
  };

  const getIcon = (tipe: string) => {
    switch (tipe) {
      case 'TAGIHAN':
      case 'PEMBAYARAN':
        return <CreditCard className="w-5 h-5 text-blue-600" />;
      case 'PENGADUAN':
        return <MessageSquare className="w-5 h-5 text-amber-600" />;
      default:
        return <Bell className="w-5 h-5 text-indigo-600" />;
    }
  };

  if (loading) {
    return (
      <div className="py-10 text-center text-slate-400 text-sm">
        Memuat notifikasi...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {unreadCount > 0 && (
        <div className="flex justify-between items-center bg-blue-50 border border-blue-200 px-4 py-3 rounded-xl text-xs text-blue-800">
          <span>Anda memiliki <strong>{unreadCount}</strong> notifikasi belum dibaca</span>
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-900 transition-colors"
          >
            <CheckCheck className="w-4 h-4" /> Tandai Semua Dibaca
          </button>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-sm space-y-2">
          <Bell className="w-8 h-8 mx-auto opacity-30" />
          <p>Belum ada notifikasi saat ini.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((item) => (
            <div
              key={item.id}
              onClick={() => handleMarkSingleRead(item.id, item.dibaca)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                item.dibaca
                  ? 'bg-white border-slate-200 opacity-80'
                  : 'bg-blue-50/50 border-blue-200 shadow-xs'
              }`}
            >
              <div className="flex gap-3">
                <div className="p-2.5 bg-slate-100 rounded-xl h-fit">
                  {getIcon(item.tipe)}
                </div>
                <div className="flex-1 space-y-1 text-xs">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="font-semibold text-slate-700 uppercase text-[10px] tracking-wider">
                      {item.tipe}
                    </span>
                    <span className="flex items-center gap-1 text-[11px]">
                      <Clock className="w-3 h-3" />
                      {new Date(item.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <h3 className={`text-sm ${item.dibaca ? 'font-semibold text-slate-800' : 'font-bold text-slate-900'}`}>
                    {item.judul}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">{item.pesan}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
