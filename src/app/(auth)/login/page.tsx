'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, LogIn, UserPlus, Eye, EyeOff, Info, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [nama, setNama] = useState('');
  const [identifier, setIdentifier] = useState(''); // Email or Phone for Login
  const [email, setEmail] = useState(''); // Email for Register
  const [noHp, setNoHp] = useState(''); // Phone for Register
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (activeTab === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: identifier.trim(),
            password,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Gagal masuk');
          setLoading(false);
          return;
        }

        window.location.href = data.redirectUrl;
      } else {
        // Format Phone Number to start with 08 or 62 format
        let cleanPhone = noHp.trim().replace(/\D/g, '');
        if (cleanPhone.startsWith('62')) {
          cleanPhone = '0' + cleanPhone.substring(2);
        }

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nama: nama.trim(),
            email: email.trim(),
            no_hp: cleanPhone,
            password,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Gagal mendaftar');
          setLoading(false);
          return;
        }

        window.location.href = data.redirectUrl;
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan koneksi');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 md:p-8 space-y-6">
        {/* Header Logo & Title */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative p-3 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-2xl shadow-sm">
              M
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow">
              <KeyRound className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">MyKost</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Akses kamar, tagihan & komplain kost dalam satu tempat
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="w-full bg-slate-100 p-1 rounded-xl flex items-center shadow-inner">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setError(null);
            }}
            className={`flex-1 py-2.5 text-center text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'login'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Masuk</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setError(null);
            }}
            className={`flex-1 py-2.5 text-center text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'register'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Daftar Akun</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 leading-relaxed font-medium flex items-start gap-2">
            <Info className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === 'register' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Nama Lengkap (Sesuai KTP)</label>
              <input
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="cth. Dimas Pratama"
                className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
              />
            </div>
          )}

          {activeTab === 'login' ? (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Email atau Nomor HP</label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="email@example.com atau 08123456789"
                className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
              />
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Alamat Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="penghuni@example.com"
                  className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-700">Nomor Handphone</label>
                  <span className="text-[11px] text-blue-600 font-normal">Wajib terdaftar di kontrak</span>
                </div>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:bg-white focus-within:border-blue-600 transition-all">
                  <div className="px-3.5 py-3 bg-slate-100 text-xs font-bold text-slate-700 border-r border-slate-200 select-none">
                    🇮🇩 +62
                  </div>
                  <input
                    type="tel"
                    required
                    value={noHp}
                    onChange={(e) => setNoHp(e.target.value)}
                    placeholder="81234567890"
                    className="w-full px-3 py-3 text-sm bg-transparent focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Kata Sandi</label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                className="w-full px-3.5 py-3 pr-10 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 p-1 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {activeTab === 'register' && (
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-800 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Pendaftaran hanya berhasil jika Nomor HP Anda sudah diinput oleh pengelola pada kontrak sewa kamar.
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <span>{activeTab === 'login' ? 'Masuk ke Akun' : 'Aktivasi Akun Penghuni'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Butuh bantuan pengelola kost? <span className="font-semibold text-blue-600 cursor-pointer">Hubungi Admin</span>
          </p>
        </div>
      </div>
    </div>
  );
}
