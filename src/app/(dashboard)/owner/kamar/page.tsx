'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, BedDouble, CheckCircle2, AlertCircle, Wrench, Building2, X } from 'lucide-react';
import { formatRupiah, getStatusBadgeStyle } from '@/lib/utils';

interface KamarItem {
  id: string;
  nomor_kamar: string;
  tipe: string;
  lantai?: number | null;
  harga_sewa: number;
  status: 'KOSONG' | 'TERISI' | 'BOOKING' | 'MAINTENANCE';
  fasilitas: string;
  foto_url?: string;
  properti: { nama: string };
  kontrak?: Array<{
    penghuni: { nama: string; no_hp: string };
  }>;
}

interface PropertiItem {
  id: string;
  nama: string;
}

export default function OwnerKamarPage() {
  const [kamarList, setKamarList] = useState<KamarItem[]>([]);
  const [propertiList, setPropertiList] = useState<PropertiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('SEMUA');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    properti_id: '',
    nomor_kamar: '',
    tipe: '',
    lantai: '',
    harga_sewa: '',
    fasilitas: '',
    status: 'KOSONG',
  });
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resKamar, resProperti] = await Promise.all([
        fetch('/api/kamar'),
        fetch('/api/properti'),
      ]);
      const dataKamar = await resKamar.json();
      const dataProperti = await resProperti.json();

      if (Array.isArray(dataKamar)) setKamarList(dataKamar);
      if (Array.isArray(dataProperti)) {
        setPropertiList(dataProperti);
        if (dataProperti.length > 0) {
          setFormData((prev) => ({ ...prev, properti_id: dataProperti[0].id }));
        }
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (kamarId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'KOSONG' ? 'MAINTENANCE' : 'KOSONG';
    try {
      const res = await fetch('/api/kamar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: kamarId, status: nextStatus }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Update status error:', err);
    }
  };

  const handleSubmitModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    try {
      const res = await fetch('/api/kamar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          lantai: formData.lantai ? Number(formData.lantai) : null,
        }),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({
          properti_id: propertiList[0]?.id || '',
          nomor_kamar: '',
          tipe: '',
          lantai: '',
          harga_sewa: '',
          fasilitas: '',
          status: 'KOSONG',
        });
        fetchData();
      }
    } catch (error) {
      console.error('Add kamar error:', error);
    } finally {
      setModalLoading(false);
    }
  };

  // Filtered List
  const filteredList = kamarList.filter((item) => {
    const matchSearch =
      item.nomor_kamar.toLowerCase().includes(search.toLowerCase()) ||
      item.tipe.toLowerCase().includes(search.toLowerCase()) ||
      (item.kontrak?.[0]?.penghuni?.nama || '').toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === 'SEMUA' || item.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Counters
  const countTerisi = kamarList.filter((k) => k.status === 'TERISI').length;
  const countKosong = kamarList.filter((k) => k.status === 'KOSONG').length;
  const countMaintenance = kamarList.filter((k) => k.status === 'MAINTENANCE').length;

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Manajemen Kamar</h1>
          <p className="text-xs md:text-sm text-slate-500">
            Kelola daftar unit kamar, tipe sewa, dan status ketersediaan.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kamar</span>
        </button>
      </div>

      {/* Counter Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Terisi</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <p className="text-lg md:text-xl font-bold text-slate-900">{countTerisi}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Kosong</span>
            <BedDouble className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-lg md:text-xl font-bold text-emerald-600">{countKosong}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Maintenance</span>
            <Wrench className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <p className="text-lg md:text-xl font-bold text-rose-600">{countMaintenance}</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor kamar, tipe, atau nama penghuni..."
            className="w-full pl-10 pr-4 py-2.5 text-xs md:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {['SEMUA', 'TERISI', 'KOSONG', 'MAINTENANCE'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Content: Mobile Cards / Desktop Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Memuat data kamar...</div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 text-sm">
          Tidak ada data kamar ditemukan.
        </div>
      ) : (
        <>
          {/* Mobile Card List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredList.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-blue-600 tracking-wide">
                      {item.properti?.nama || 'Properti Kost'}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">Kamar {item.nomor_kamar}</h3>
                    <p className="text-xs text-slate-500">
                      {item.tipe}
                      {item.lantai ? ` • Lt. ${item.lantai}` : ''}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border ${getStatusBadgeStyle(
                      item.status
                    )}`}
                  >
                    {item.status}
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p>
                    <span className="text-slate-400">Harga: </span>
                    <strong className="text-slate-900">{formatRupiah(item.harga_sewa)} / bln</strong>
                  </p>
                  <p className="line-clamp-1">
                    <span className="text-slate-400">Fasilitas: </span>
                    {item.fasilitas || '-'}
                  </p>
                  {item.kontrak?.[0]?.penghuni && (
                    <p className="text-blue-700 font-semibold pt-1">
                      Penghuni: {item.kontrak[0].penghuni.nama}
                    </p>
                  )}
                </div>

                {/* Quick Action Toggle */}
                <div className="pt-2 flex gap-2">
                  {item.status !== 'TERISI' && (
                    <button
                      onClick={() => handleStatusToggle(item.id, item.status)}
                      className="flex-1 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    >
                      Set {item.status === 'KOSONG' ? 'Maintenance' : 'Kosong'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal Add Kamar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Tambah Kamar Baru</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitModal} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Properti</label>
                <select
                  value={formData.properti_id}
                  onChange={(e) => setFormData({ ...formData, properti_id: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  required
                >
                  {propertiList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Nomor Kamar</label>
                  <input
                    type="text"
                    placeholder="cth. 101, 204"
                    value={formData.nomor_kamar}
                    onChange={(e) => setFormData({ ...formData, nomor_kamar: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Lantai (Opsional)</label>
                  <input
                    type="number"
                    placeholder="cth. 1, 2"
                    value={formData.lantai}
                    onChange={(e) => setFormData({ ...formData, lantai: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Tipe Kamar</label>
                <input
                  type="text"
                  placeholder="cth. Deluxe AC, Standard Fan"
                  value={formData.tipe}
                  onChange={(e) => setFormData({ ...formData, tipe: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Harga Sewa Bulanan (Rp)</label>
                <input
                  type="number"
                  placeholder="cth. 1500000"
                  value={formData.harga_sewa}
                  onChange={(e) => setFormData({ ...formData, harga_sewa: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Fasilitas Kamar</label>
                <textarea
                  placeholder="AC, Kamar Mandi Dalam, Kasur Springbed, Lemari..."
                  value={formData.fasilitas}
                  onChange={(e) => setFormData({ ...formData, fasilitas: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none h-20"
                />
              </div>

              <button
                type="submit"
                disabled={modalLoading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
              >
                {modalLoading ? 'Menyimpan...' : 'Simpan Kamar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
