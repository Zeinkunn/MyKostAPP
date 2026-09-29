'use client';

import { useState, useEffect } from 'react';
import { MessageSquareWarning, CheckCircle2, Clock, Wrench, RefreshCw, X } from 'lucide-react';
import { formatDateIndonesian, getStatusBadgeStyle } from '@/lib/utils';

interface PengaduanItem {
  id: string;
  kategori: string;
  deskripsi: string;
  foto_url?: string[];
  status: 'BARU' | 'DIPROSES' | 'SELESAI';
  catatan_internal?: string;
  created_at: string;
  resolved_at?: string;
  kamar: { nomor_kamar: string; tipe: string };
  penghuni: { nama: string; no_hp: string };
}

export default function OwnerPengaduanPage() {
  const [list, setList] = useState<PengaduanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('SEMUA');
  const [selectedItem, setSelectedItem] = useState<PengaduanItem | null>(null);
  const [newStatus, setNewStatus] = useState<string>('DIPROSES');
  const [catatan, setCatatan] = useState<string>('');
  const [saving, setSaving] = useState(false);

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

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setSaving(true);
    try {
      const res = await fetch('/api/pengaduan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedItem.id,
          status: newStatus,
          catatan_internal: catatan,
        }),
      });

      if (res.ok) {
        setSelectedItem(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const filteredList = list.filter((item) => {
    if (filter === 'SEMUA') return true;
    return item.status === filter;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Manajemen Pengaduan</h1>
          <p className="text-xs md:text-sm text-slate-500">
            Daftar komplain kerusakan fasilitas dari seluruh penghuni kamar.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="p-2 text-slate-600 hover:text-blue-600 rounded-xl border border-slate-200 bg-white"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {['SEMUA', 'BARU', 'DIPROSES', 'SELESAI'].map((st) => (
          <button
            key={st}
            onClick={() => setFilter(st)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              filter === st
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">Memuat daftar pengaduan...</div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 text-xs">
          Tidak ada data pengaduan.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredList.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px]">
                      Kamar {item.kamar.nomor_kamar} — {item.penghuni.nama}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm mt-1">{item.kategori}</h3>
                  </div>
                  <span
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border ${getStatusBadgeStyle(
                      item.status
                    )}`}
                  >
                    {item.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {item.deskripsi}
                </p>

                {item.foto_url && item.foto_url.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pt-1">
                    {item.foto_url.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt="Foto komplain"
                        className="w-16 h-16 rounded-xl object-cover border border-slate-200"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Status Update Button */}
              <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="text-slate-400">{formatDateIndonesian(item.created_at)}</span>
                <button
                  onClick={() => {
                    setSelectedItem(item);
                    setNewStatus(item.status);
                    setCatatan(item.catatan_internal || '');
                  }}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold rounded-xl transition-colors"
                >
                  Tindak Lanjuti
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Status Update */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                Tindak Lanjuti Komplain — Kamar {selectedItem.kamar.nomor_kamar}
              </h3>
              <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Ubah Status Komplain</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                >
                  <option value="BARU">BARU</option>
                  <option value="DIPROSES">DIPROSES (Dalam Perbaikan Teknisi)</option>
                  <option value="SELESAI">SELESAI (Perbaikan Rampung)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Catatan Internal / Penanganan</label>
                <textarea
                  rows={3}
                  placeholder="Catatan untuk teknisi atau penjelasan kepada penghuni..."
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
              >
                {saving ? 'Menyimpan...' : 'Update Status Komplain'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
