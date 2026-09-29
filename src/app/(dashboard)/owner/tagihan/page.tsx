'use client';

import { useState, useEffect } from 'react';
import { Receipt, RefreshCw, Zap, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { formatRupiah, formatDateIndonesian, getStatusBadgeStyle } from '@/lib/utils';

interface TagihanItem {
  id: string;
  periode: string;
  jumlah: number;
  denda: number;
  jatuh_tempo: string;
  status: string;
  created_at: string;
  kontrak: {
    kamar: { nomor_kamar: string; tipe: string };
    penghuni: { nama: string; no_hp: string };
  };
}

export default function OwnerTagihanPage() {
  const [list, setList] = useState<TagihanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('SEMUA');
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tagihan');
      const data = await res.json();
      if (Array.isArray(data)) setList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateOtomatis = async () => {
    setGenerating(true);
    setMessage(null);
    try {
      const res = await fetch('/api/tagihan', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || 'Tagihan bulanan berhasil digenerate');
        fetchData();
      } else {
        alert(data.error || 'Gagal generate tagihan');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const filteredList = list.filter((item) => {
    if (filter === 'SEMUA') return true;
    return item.status === filter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Manajemen Tagihan Sewa</h1>
          <p className="text-xs md:text-sm text-slate-500">
            Kelola tagihan bulanan seluruh penghuni dan generate otomatis awal bulan.
          </p>
        </div>

        <button
          onClick={handleGenerateOtomatis}
          disabled={generating}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2"
        >
          <Zap className="w-4 h-4 text-emerald-200" />
          <span>{generating ? 'Generating...' : 'Generate Tagihan Bulan Ini'}</span>
        </button>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {['SEMUA', 'BELUM_BAYAR', 'LUNAS', 'TERLAMBAT'].map((st) => (
          <button
            key={st}
            onClick={() => setFilter(st)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              filter === st
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Table / Cards */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">Memuat tagihan...</div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 text-xs">
          Tidak ada data tagihan.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="p-3.5">Kamar / Penghuni</th>
                  <th className="p-3.5">Periode</th>
                  <th className="p-3.5">Jumlah Tagihan</th>
                  <th className="p-3.5">Jatuh Tempo</th>
                  <th className="p-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5">
                      <strong className="text-slate-900 font-bold">
                        Kamar {item.kontrak.kamar.nomor_kamar}
                      </strong>
                      <p className="text-slate-500 text-[11px]">{item.kontrak.penghuni.nama}</p>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-700">{item.periode}</td>
                    <td className="p-3.5 font-bold text-slate-900">
                      {formatRupiah(Number(item.jumlah) + Number(item.denda))}
                    </td>
                    <td className="p-3.5 text-slate-600">{formatDateIndonesian(item.jatuh_tempo)}</td>
                    <td className="p-3.5 text-right">
                      <span
                        className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-full border ${getStatusBadgeStyle(
                          item.status
                        )}`}
                      >
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
