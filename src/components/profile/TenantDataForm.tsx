'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, CreditCard, Lock, ArrowLeft, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { maskKTP, formatPhoneDisplay } from '@/lib/utils';

interface TenantDataFormProps {
  initialNama: string;
  initialEmail: string;
  noHp: string;
  noKtp: string;
}

export default function TenantDataForm({
  initialNama,
  initialEmail,
  noHp,
  noKtp,
}: TenantDataFormProps) {
  const router = useRouter();
  const [nama, setNama] = useState(initialNama);
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: nama.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui data pribadi');

      setSuccess('Data pribadi berhasil diperbarui!');
      setTimeout(() => {
        router.push('/penghuni/profil');
        router.refresh();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/penghuni/profil"
          className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          title="Kembali ke Profil"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Data Pribadi</h1>
          <p className="text-xs text-slate-500">Kelola informasi data diri dan identitas Anda</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
          {/* Editable: Nama Lengkap */}
          <div className="space-y-1">
            <label className="block text-slate-600">Nama Lengkap</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Masukkan nama lengkap"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>
          </div>

          {/* Editable: Email */}
          <div className="space-y-1">
            <label className="block text-slate-600">Alamat Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>
          </div>

          {/* Readonly: No. HP */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-slate-600">Nomor Handphone (WhatsApp)</label>
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-normal">
                <Lock className="w-3 h-3" /> Read-only
              </span>
            </div>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                readOnly
                disabled
                value={formatPhoneDisplay(noHp)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 cursor-not-allowed select-all"
              />
            </div>
            <p className="text-[11px] text-slate-400 font-normal">
              Ubah nomor hubungi pengelola
            </p>
          </div>

          {/* Readonly: No. KTP */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-slate-600">Nomor Induk Kependudukan (KTP)</label>
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-normal">
                <Lock className="w-3 h-3" /> Dilindungi
              </span>
            </div>
            <div className="relative">
              <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                readOnly
                disabled
                value={maskKTP(noKtp)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 cursor-not-allowed tracking-wider"
              />
            </div>
            <p className="text-[11px] text-slate-400 font-normal">
              Disamarkan demi privasi dan keamanan identitas
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
