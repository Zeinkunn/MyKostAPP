'use client';

import { useState, useEffect } from 'react';
import {
  Receipt,
  RefreshCw,
  Zap,
  CheckCircle2,
  Clock,
  AlertCircle,
  Banknote,
  Sliders,
  X,
} from 'lucide-react';
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

  // Cash Payment Modal
  const [cashModalItem, setCashModalItem] = useState<TagihanItem | null>(null);
  const [cashLoading, setCashLoading] = useState(false);
  const [cashError, setCashError] = useState<string | null>(null);

  // Adjust Bill Modal
  const [adjustModalItem, setAdjustModalItem] = useState<TagihanItem | null>(null);
  const [adjustJumlah, setAdjustJumlah] = useState<string>('');
  const [adjustDenda, setAdjustDenda] = useState<string>('');
  const [adjustAlasan, setAdjustAlasan] = useState<string>('');
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

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

  const handleCashPayment = async () => {
    if (!cashModalItem) return;
    setCashLoading(true);
    setCashError(null);

    try {
      const res = await fetch('/api/pembayaran/tunai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagihan_id: cashModalItem.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCashError(data.error || 'Gagal mencatat pembayaran tunai');
      } else {
        setMessage(data.message || 'Pembayaran tunai berhasil dicatat');
        setCashModalItem(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
      setCashError('Terjadi kesalahan koneksi');
    } finally {
      setCashLoading(false);
    }
  };

  const handleAdjustBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalItem) return;

    if (!adjustAlasan.trim() || adjustAlasan.trim().length < 3) {
      setAdjustError('Alasan penyesuaian wajib diisi (minimal 3 karakter)');
      return;
    }

    setAdjustLoading(true);
    setAdjustError(null);

    try {
      const payload: any = {
        tagihan_id: adjustModalItem.id,
        alasan: adjustAlasan.trim(),
      };

      if (adjustJumlah !== '') {
        payload.jumlah = Number(adjustJumlah);
      }
      if (adjustDenda !== '') {
        payload.denda = Number(adjustDenda);
      }

      const res = await fetch('/api/tagihan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setAdjustError(data.error || 'Gagal menyesuaikan tagihan');
      } else {
        setMessage(data.message || 'Tagihan berhasil disesuaikan');
        setAdjustModalItem(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
      setAdjustError('Terjadi kesalahan koneksi');
    } finally {
      setAdjustLoading(false);
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
            Kelola tagihan bulanan seluruh penghuni, catat pembayaran tunai, atau sesuaikan nominal tagihan.
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
                  <th className="p-3.5">Pokok + Denda</th>
                  <th className="p-3.5">Jatuh Tempo</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Aksi</th>
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
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">
                        {formatRupiah(Number(item.jumlah) + Number(item.denda))}
                      </div>
                      {Number(item.denda) > 0 && (
                        <div className="text-[10px] text-rose-600 font-medium">
                          (Termasuk denda: {formatRupiah(item.denda)})
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-600">{formatDateIndonesian(item.jatuh_tempo)}</td>
                    <td className="p-3.5">
                      <span
                        className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-full border ${getStatusBadgeStyle(
                          item.status
                        )}`}
                      >
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {item.status !== 'LUNAS' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setCashModalItem(item);
                              setCashError(null);
                            }}
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-semibold transition-all inline-flex items-center gap-1"
                            title="Catat Pembayaran Tunai"
                          >
                            <Banknote className="w-3.5 h-3.5" />
                            <span>Bayar Tunai</span>
                          </button>

                          <button
                            onClick={() => {
                              setAdjustModalItem(item);
                              setAdjustJumlah(String(item.jumlah));
                              setAdjustDenda(String(item.denda));
                              setAdjustAlasan('');
                              setAdjustError(null);
                            }}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-semibold transition-all inline-flex items-center gap-1"
                            title="Sesuaikan Nominal Tagihan"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                            <span>Sesuaikan</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium italic">Lunas</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Catat Pembayaran Tunai */}
      {cashModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Catat Pembayaran Tunai</h3>
              </div>
              <button
                onClick={() => setCashModalItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-500 leading-relaxed">
                Anda akan mencatat penerimaan uang tunai langsung dari penghuni. Sistem akan membuat riwayat pembayaran terverifikasi dan menandai tagihan sebagai <strong>LUNAS</strong>.
              </p>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Penghuni:</span>
                  <span className="font-bold text-slate-900">{cashModalItem.kontrak.penghuni.nama}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kamar:</span>
                  <span className="font-bold text-slate-900">Kamar {cashModalItem.kontrak.kamar.nomor_kamar}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Periode:</span>
                  <span className="font-bold text-slate-900">{cashModalItem.periode}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-700 font-semibold">Total Diterima:</span>
                  <span className="font-bold text-emerald-600 text-sm">
                    {formatRupiah(Number(cashModalItem.jumlah) + Number(cashModalItem.denda))}
                  </span>
                </div>
              </div>

              {cashError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                  <span>{cashError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCashModalItem(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={cashLoading}
                  onClick={handleCashPayment}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-semibold"
                >
                  {cashLoading ? 'Memproses...' : 'Konfirmasi Lunas'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sesuaikan Tagihan */}
      {adjustModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Sesuaikan Tagihan Sewa</h3>
              </div>
              <button
                onClick={() => setAdjustModalItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustBill} className="space-y-3 text-xs">
              <p className="text-slate-500 leading-relaxed">
                Sesuaikan nominal pokok sewa atau denda keterlambatan untuk Kamar{' '}
                <strong>{adjustModalItem.kontrak.kamar.nomor_kamar}</strong> periode{' '}
                <strong>{adjustModalItem.periode}</strong>. Alasan perubahan wajib dicatat ke log aktivitas sistem.
              </p>

              {adjustError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                  <span>{adjustError}</span>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700">Jumlah Pokok Sewa (Rp)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={adjustJumlah}
                  onChange={(e) => setAdjustJumlah(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-600"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Denda Keterlambatan (Rp)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={adjustDenda}
                  onChange={(e) => setAdjustDenda(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-600"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">
                  Alasan Penyesuaian <span className="text-rose-500">*wajib</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="cth. Keringanan denda karena sakit, atau diskon sewa bulan pertama"
                  value={adjustAlasan}
                  onChange={(e) => setAdjustAlasan(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-600"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalItem(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={adjustLoading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold"
                >
                  {adjustLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
