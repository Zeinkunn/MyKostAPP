'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface EditProfileFormProps {
  initialNama: string;
  initialEmail: string;
  initialNoHp?: string | null;
  backHref: string;
  title: string;
  successRedirectHref: string;
  showPhoneInput?: boolean;
}

export default function EditProfileForm({
  initialNama,
  initialEmail,
  initialNoHp = '',
  backHref,
  title,
  successRedirectHref,
  showPhoneInput = true,
}: EditProfileFormProps) {
  const router = useRouter();
  const [nama, setNama] = useState(initialNama);
  const [email, setEmail] = useState(initialEmail);
  const [noHp, setNoHp] = useState(initialNoHp || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const payload: any = {
        nama: nama.trim(),
        email: email.trim(),
      };
      if (showPhoneInput) {
        payload.no_hp = noHp.trim();
      }

      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui profil');

      setSuccess('Profil berhasil diperbarui!');
      setTimeout(() => {
        router.push(successRedirectHref);
        router.refresh();
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href={backHref}
          className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
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

          {showPhoneInput && (
            <div className="space-y-1">
              <label className="block text-slate-600">Nomor Handphone (WhatsApp)</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="tel"
                  value={noHp}
                  onChange={(e) => setNoHp(e.target.value)}
                  placeholder="081234567890"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </form>
      </div>
    </div>
  );
}
