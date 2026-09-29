'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Eye, RefreshCw, Check, X } from 'lucide-react';
import { formatRupiah, formatDateIndonesian } from '@/lib/utils';

interface PembayaranItem {
  id: string;
  jumlah_dibayar: number;
  metode: string;
  tanggal_bayar: string;
  bukti_url: string;
  status_verifikasi: 'PENDING' | 'DISETUJUI' | 'DITOLAK';
  tagihan: {
    periode: string;
    jumlah: number;
    kontrak: {
      kamar: { nomor_kamar: string; tipe: string };
      penghuni: { nama: string; no_hp: string };
    };
  };
}

export default function OwnerVerifikasiPage() {
  const [listPembayaran, setListPembayaran] = useState<PembayaranItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pembayaran');
      const data = await res.json();
      if (Array.isArray(data)) setListPembayaran(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id: string, status: 'DISETUJUI' | 'DITOLAK') => {
    try {
      const res = await fetch('/api/pembayaran', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status_verifikasi: status }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const pendingList = listPembayaran.filter((p) => p.status_verifikasi === 'PENDING');
  const historyList = listPembayaran.filter((p) => p.status_verifikasi !== 'PENDING');

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Verifikasi Pembayaran</h1>
          <p className="text-xs md:text-sm text-slate-500">
            Tinjau bukti transfer dan setujui atau tolak pembayaran penghuni.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="p-2 text-slate-600 hover:text-blue-600 rounded-xl border border-slate-200 bg-white"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Pending Section */}
      <div className="space-y-3">
        <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <span>Menunggu Persetujuan ({pendingList.length})</span>
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
        </h2>

        {loading ? (
          <div className="text-center py-8 text-slate-400 text-xs">Memuat data verifikasi...</div>
        ) : pendingList.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-slate-200 text-slate-500 text-xs">
            Tidak ada pembayaran baru yang perlu diverifikasi.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingList.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-4 border border-amber-200 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div className="flex gap-3">
                  {/* Thumbnail Bukti */}
                  <div
                    onClick={() => setSelectedImage(item.bukti_url)}
                    className="w-20 h-24 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 cursor-pointer relative group"
                  >
                    <img src={item.bukti_url} alt="Bukti" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Eye className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px]">
                      Kamar {item.tagihan.kontrak.kamar.nomor_kamar}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {item.tagihan.kontrak.penghuni.nama}
                    </h3>
                    <p className="text-slate-500 font-semibold">
                      Jumlah: {formatRupiah(item.jumlah_dibayar)}
                    </p>
                    <p className="text-slate-400 text-[11px]">
                      {item.metode} • {formatDateIndonesian(item.tanggal_bayar)}
                    </p>
                  </div>
                </div>

                {/* Approve / Reject CTA Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleVerify(item.id, 'DITOLAK')}
                    className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Tolak</span>
                  </button>

                  <button
                    onClick={() => handleVerify(item.id, 'DISETUJUI')}
                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Setujui</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History Section */}
      <div className="space-y-3 pt-4 border-t border-slate-200">
        <h2 className="font-bold text-slate-900 text-sm">Riwayat Verifikasi Terbaru</h2>
        <div className="space-y-2">
          {historyList.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl p-3 border border-slate-200 flex justify-between items-center text-xs"
            >
              <div>
                <strong className="text-slate-900">
                  Kamar {item.tagihan.kontrak.kamar.nomor_kamar} — {item.tagihan.kontrak.penghuni.nama}
                </strong>
                <p className="text-slate-500">
                  {formatRupiah(item.jumlah_dibayar)} ({item.metode})
                </p>
              </div>
              <span
                className={`px-2.5 py-1 text-[11px] font-bold rounded-full ${
                  item.status_verifikasi === 'DISETUJUI'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {item.status_verifikasi}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Fullscreen Image Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-2xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 p-2 bg-slate-900/60 text-white rounded-full hover:bg-slate-900"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={selectedImage} alt="Bukti Transfer" className="max-h-[80vh] w-auto mx-auto object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
}
