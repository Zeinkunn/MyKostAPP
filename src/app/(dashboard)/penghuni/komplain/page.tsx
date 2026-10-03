'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, MessageSquare, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatDateIndonesian, getStatusBadgeStyle, getFileDisplayUrl } from '@/lib/utils';

interface PengaduanItem {
  id: string;
  kategori: string;
  deskripsi: string;
  foto_url?: string[];
  status: 'BARU' | 'DIPROSES' | 'SELESAI';
  catatan_internal?: string;
  created_at: string;
  resolved_at?: string;
  kamar?: { nomor_kamar: string };
}

export default function PenghuniKomplainPage() {
  const [list, setList] = useState<PengaduanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('SEMUA');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pengaduan');
      const data = await res.json();
      if (Array.isArray(data)) setList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredList = list.filter((item) => {
    if (filter === 'SEMUA') return true;
    return item.status === filter;
  });

  return (
    <div className="space-y-5 relative min-h-[80vh]">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Daftar Komplain & Maintenance</h1>
        <p className="text-xs text-slate-500">
          Laporkan perbaikan fasilitas kamar dan pantau status pengerjaannya
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {['SEMUA', 'BARU', 'DIPROSES', 'SELESAI'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              filter === status
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* List items */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">Memuat laporan...</div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 text-xs">
          Belum ada pengaduan fasilitas.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredList.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                    {item.kategori}
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm mt-0.5">{item.deskripsi}</h3>
                </div>
                <span
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border ${getStatusBadgeStyle(
                    item.status
                  )}`}
                >
                  {item.status}
                </span>
              </div>

              {item.foto_url && item.foto_url.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pt-1">
                  {item.foto_url.map((url, i) => (
                    <img
                      key={i}
                      src={getFileDisplayUrl(url)}
                      alt="Bukti foto"
                      className="w-16 h-16 rounded-xl object-cover border border-slate-200"
                    />
                  ))}
                </div>
              )}

              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex justify-between items-center">
                <span>Diajukan: {formatDateIndonesian(item.created_at)}</span>
                {item.resolved_at && (
                  <span className="text-emerald-600 font-medium">
                    Selesai: {formatDateIndonesian(item.resolved_at)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Action Button (FAB) for New Complaint */}
      <Link
        href="/penghuni/komplain/baru"
        className="fixed bottom-24 right-5 z-40 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg shadow-blue-600/30 flex items-center justify-center transition-all active:scale-95"
        aria-label="Ajukan Komplain Baru"
      >
        <Plus className="w-6 h-6" />
      </Link>
    </div>
  );
}
