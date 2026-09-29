'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Receipt, CheckCircle2, Clock, AlertCircle, ChevronRight, Download } from 'lucide-react';
import { formatRupiah, formatDateIndonesian, getStatusBadgeStyle } from '@/lib/utils';

interface TagihanItem {
  id: string;
  periode: string;
  jumlah: number;
  denda: number;
  jatuh_tempo: string;
  status: 'BELUM_BAYAR' | 'SEBAGIAN' | 'LUNAS' | 'TERLAMBAT';
  created_at: string;
  kontrak: {
    kamar: { nomor_kamar: string; tipe: string };
  };
  pembayaran?: Array<{
    status_verifikasi: string;
  }>;
}

export default function PenghuniTagihanPage() {
  const [tagihanList, setTagihanList] = useState<TagihanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'aktif' | 'riwayat'>('aktif');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tagihan');
      const data = await res.json();
      if (Array.isArray(data)) setTagihanList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const activeBills = tagihanList.filter((t) => t.status !== 'LUNAS');
  const historyBills = tagihanList.filter((t) => t.status === 'LUNAS');

  const displayedList = activeTab === 'aktif' ? activeBills : historyBills;

  return (
    <div className="space-y-5">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Daftar Tagihan</h1>
        <p className="text-xs text-slate-500">Kelola tagihan sewa bulanan & bukti pembayaran Anda</p>
      </div>

      {/* Segmented Tab */}
      <div className="w-full bg-slate-100 p-1 rounded-xl flex items-center shadow-inner">
        <button
          onClick={() => setActiveTab('aktif')}
          className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'aktif' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Belum Lunas ({activeBills.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('riwayat')}
          className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'riwayat' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Riwayat Lunas ({historyBills.length})</span>
        </button>
      </div>

      {/* Bill List Cards */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">Memuat tagihan...</div>
      ) : displayedList.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 text-xs">
          {activeTab === 'aktif' ? 'Tidak ada tagihan aktif yang perlu dibayar.' : 'Belum ada riwayat tagihan lunas.'}
        </div>
      ) : (
        <div className="space-y-3">
          {displayedList.map((item) => {
            const isPendingVerification = item.pembayaran?.[0]?.status_verifikasi === 'PENDING';
            return (
              <Link
                key={item.id}
                href={`/penghuni/tagihan/${item.id}`}
                className="block bg-white rounded-2xl p-4 border border-slate-200 shadow-sm hover:border-blue-400 transition-all space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Periode {item.periode} — Kamar {item.kontrak?.kamar?.nomor_kamar}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                      {formatRupiah(Number(item.jumlah) + Number(item.denda))}
                    </h3>
                  </div>

                  <span
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border ${getStatusBadgeStyle(
                      isPendingVerification ? 'PENDING' : item.status
                    )}`}
                  >
                    {isPendingVerification ? 'Menunggu Verifikasi' : item.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-500 pt-1 border-t border-slate-100">
                  <span>Jatuh tempo: {formatDateIndonesian(item.jatuh_tempo)}</span>
                  <div className="flex items-center text-blue-600 font-semibold gap-1">
                    <span>{item.status === 'LUNAS' ? 'Kwitansi' : 'Rincian'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
