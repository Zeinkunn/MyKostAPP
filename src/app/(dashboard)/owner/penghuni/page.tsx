'use client';

import { useState, useEffect } from 'react';
import { UserPlus, Search, Phone, FileText, CheckCircle, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { formatRupiah, formatDateIndonesian } from '@/lib/utils';

interface PenghuniItem {
  id: string;
  nama: string;
  no_ktp: string;
  no_hp: string;
  email: string;
  created_at: string;
  kontrak?: Array<{
    id: string;
    tanggal_mulai: string;
    tanggal_selesai: string;
    harga_sewa_disepakati: number;
    status: string;
    kamar: { nomor_kamar: string; tipe: string };
  }>;
}

interface KamarItem {
  id: string;
  nomor_kamar: string;
  tipe: string;
  harga_sewa: number;
  status: string;
}

export default function OwnerPenghuniPage() {
  const [penghuniList, setPenghuniList] = useState<PenghuniItem[]>([]);
  const [availableKamar, setAvailableKamar] = useState<KamarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State for Onboarding Flow 6.1
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nama: '',
    no_ktp: '',
    no_hp: '',
    email: '',
    kamar_id: '',
    tanggal_mulai: new Date().toISOString().split('T')[0],
    tanggal_selesai: new Date(new Date().setMonth(new Date().getMonth() + 6))
      .toISOString()
      .split('T')[0],
    harga_sewa_disepakati: '',
  });

  const [modalLoading, setModalLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resPenghuni, resKamar] = await Promise.all([
        fetch('/api/penghuni'),
        fetch('/api/kamar?status=KOSONG'),
      ]);
      const dataPenghuni = await resPenghuni.json();
      const dataKamar = await resKamar.json();

      if (Array.isArray(dataPenghuni)) setPenghuniList(dataPenghuni);
      if (Array.isArray(dataKamar)) {
        setAvailableKamar(dataKamar);
        if (dataKamar.length > 0) {
          setFormData((prev) => ({
            ...prev,
            kamar_id: dataKamar[0].id,
            harga_sewa_disepakati: String(dataKamar[0].harga_sewa),
          }));
        }
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectKamarChange = (kamarId: string) => {
    const selected = availableKamar.find((k) => k.id === kamarId);
    setFormData((prev) => ({
      ...prev,
      kamar_id: kamarId,
      harga_sewa_disepakati: selected ? String(selected.harga_sewa) : prev.harga_sewa_disepakati,
    }));
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    try {
      // Step 1: Create Penghuni
      const resPenghuni = await fetch('/api/penghuni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: formData.nama,
          no_ktp: formData.no_ktp,
          no_hp: formData.no_hp,
          email: formData.email,
        }),
      });

      const dataPenghuni = await resPenghuni.json();
      if (!resPenghuni.ok) {
        alert(dataPenghuni.error || 'Gagal menyimpan data penghuni');
        setModalLoading(false);
        return;
      }

      // Step 2: Create Kontrak (Triggers Kamar status TERISI, auto first Tagihan & WhatsApp activation link)
      const resKontrak = await fetch('/api/kontrak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kamar_id: formData.kamar_id,
          penghuni_id: dataPenghuni.id,
          tanggal_mulai: formData.tanggal_mulai,
          tanggal_selesai: formData.tanggal_selesai,
          harga_sewa_disepakati: formData.harga_sewa_disepakati,
        }),
      });

      if (resKontrak.ok) {
        setIsModalOpen(false);
        setToastMessage('Penghuni & Kontrak sewa berhasil dibuat! Pesan instruksi WhatsApp telah dikirim.');
        setTimeout(() => setToastMessage(null), 6000);
        fetchData();
      }
    } catch (err) {
      console.error('Onboarding error:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const filteredPenghuni = penghuniList.filter((item) => {
    return (
      item.nama.toLowerCase().includes(search.toLowerCase()) ||
      item.no_hp.includes(search) ||
      (item.kontrak?.[0]?.kamar?.nomor_kamar || '').includes(search)
    );
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2 shadow-md">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Manajemen Penghuni & Kontrak</h1>
          <p className="text-xs md:text-sm text-slate-500">
            Onboarding penghuni baru, registrasi kontrak sewa, dan pengiriman instruksi aktivasi.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Onboarding Penghuni Baru</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama penghuni, nomor HP, atau kamar..."
          className="w-full pl-10 pr-4 py-2.5 text-xs md:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
        />
      </div>

      {/* List Penghuni */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Memuat data penghuni...</div>
      ) : filteredPenghuni.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 text-sm">
          Belum ada penghuni terdaftar.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPenghuni.map((item) => {
            const activeKontrak = item.kontrak?.[0];
            return (
              <div key={item.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{item.nama}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {item.no_hp}
                    </p>
                  </div>
                  {activeKontrak ? (
                    <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                      Kamar {activeKontrak.kamar?.nomor_kamar}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-600">
                      Tidak Ada Kontrak
                    </span>
                  )}
                </div>

                {activeKontrak && (
                  <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                    <p>
                      <span className="text-slate-400">Periode: </span>
                      <strong>
                        {formatDateIndonesian(activeKontrak.tanggal_mulai)} s/d{' '}
                        {formatDateIndonesian(activeKontrak.tanggal_selesai)}
                      </strong>
                    </p>
                    <p>
                      <span className="text-slate-400">Harga Sewa: </span>
                      <strong className="text-emerald-700">
                        {formatRupiah(activeKontrak.harga_sewa_disepakati)} / bulan
                      </strong>
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Onboarding (Alur 6.1) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Onboarding Penghuni Baru (Alur 6.1)</h3>
                <p className="text-xs text-slate-500">Buat data penghuni & kontrak sewa kamar sekaligus.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOnboardingSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Nama Lengkap (KTP)</label>
                  <input
                    type="text"
                    required
                    placeholder="Dimas Pratama"
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Nomor KTP</label>
                  <input
                    type="text"
                    required
                    placeholder="3171012345670001"
                    value={formData.no_ktp}
                    onChange={(e) => setFormData({ ...formData, no_ktp: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Nomor HP (WhatsApp)</label>
                  <input
                    type="tel"
                    required
                    placeholder="081234567890"
                    value={formData.no_hp}
                    onChange={(e) => setFormData({ ...formData, no_hp: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Alamat Email</label>
                  <input
                    type="email"
                    required
                    placeholder="penghuni@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <label className="font-semibold text-slate-700">Pilih Kamar Sewa (Kosong)</label>
                {availableKamar.length === 0 ? (
                  <p className="text-rose-500 font-semibold py-1">Tidak ada kamar kosong yang tersedia!</p>
                ) : (
                  <select
                    value={formData.kamar_id}
                    onChange={(e) => handleSelectKamarChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    required
                  >
                    {availableKamar.map((k) => (
                      <option key={k.id} value={k.id}>
                        Kamar {k.nomor_kamar} — {k.tipe} ({formatRupiah(k.harga_sewa)}/bln)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Tanggal Mulai Sewa</label>
                  <input
                    type="date"
                    required
                    value={formData.tanggal_mulai}
                    onChange={(e) => setFormData({ ...formData, tanggal_mulai: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Tanggal Selesai Sewa</label>
                  <input
                    type="date"
                    required
                    value={formData.tanggal_selesai}
                    onChange={(e) => setFormData({ ...formData, tanggal_selesai: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Harga Sewa Disepakati (Rp/bulan)</label>
                <input
                  type="number"
                  required
                  value={formData.harga_sewa_disepakati}
                  onChange={(e) => setFormData({ ...formData, harga_sewa_disepakati: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="p-3 bg-blue-50 text-blue-800 rounded-xl flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Sistem akan otomatis mengubah status kamar jadi <strong>TERISI</strong>, membuat tagihan pertama,
                  dan mengirimi pesan WhatsApp aktivasi akun ke penghuni.
                </span>
              </div>

              <button
                type="submit"
                disabled={modalLoading || availableKamar.length === 0}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
              >
                {modalLoading ? 'Memproses Onboarding...' : 'Proses Onboarding & Kirim Link WA'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
