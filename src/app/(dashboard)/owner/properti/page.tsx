'use client';

import { useState, useEffect } from 'react';
import { Building2, Plus, MapPin, BedDouble, X } from 'lucide-react';

interface PropertiItem {
  id: string;
  nama: string;
  alamat: string;
  created_at: string;
  _count?: { kamar: number };
}

export default function OwnerPropertiPage() {
  const [propertiList, setPropertiList] = useState<PropertiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nama, setNama] = useState('');
  const [alamat, setAlamat] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/properti');
      const data = await res.json();
      if (Array.isArray(data)) setPropertiList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    try {
      const res = await fetch('/api/properti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama, alamat }),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setNama('');
        setAlamat('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Manajemen Properti</h1>
          <p className="text-xs md:text-sm text-slate-500">
            Daftar cabang/gedung kost yang dikelola dalam sistem.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Properti</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">Memuat properti...</div>
      ) : propertiList.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 text-xs">
          Belum ada properti terdaftar.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {propertiList.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{item.nama}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {item.alamat}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-600">
                <span className="flex items-center gap-1 font-semibold text-blue-700">
                  <BedDouble className="w-4 h-4" />
                  {item._count?.kamar || 0} Total Unit Kamar
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add Properti */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Tambah Properti Baru</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Nama Gedung / Properti Kost</label>
                <input
                  type="text"
                  required
                  placeholder="cth. Kost Cempaka Indah Utama"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Alamat Lengkap</label>
                <textarea
                  required
                  rows={3}
                  placeholder="cth. Jl. Cempaka No. 12, Kebayoran Baru, Jakarta Selatan"
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={modalLoading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
              >
                {modalLoading ? 'Menyimpan...' : 'Simpan Properti'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
