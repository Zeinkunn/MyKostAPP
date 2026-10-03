'use client';

import { useState, useEffect } from 'react';
import { UserCog, Plus, Shield, Mail, X, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatDateIndonesian } from '@/lib/utils';

interface UserItem {
  id: string;
  nama: string;
  email: string;
  role: string;
  created_at: string;
}

export default function OwnerUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nama: '',
    email: '',
    password: '',
    role: 'ADMIN',
  });
  const [saving, setSaving] = useState(false);

  // Reset password states
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [targetAdmin, setTargetAdmin] = useState<UserItem | null>(null);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [resetSaving, setResetSaving] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ nama: '', email: '', password: '', role: 'ADMIN' });
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Gagal menambahkan user');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAdmin) return;
    setResetError(null);
    setResetSuccess(null);
    setResetSaving(true);

    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetAdmin.id,
          newPassword: newAdminPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setResetError(data.error || 'Gagal mereset kata sandi');
      } else {
        setResetSuccess(data.message || 'Kata sandi berhasil diatur ulang');
        setTimeout(() => {
          setResetModalOpen(false);
          setTargetAdmin(null);
          setNewAdminPassword('');
          setResetSuccess(null);
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setResetError('Terjadi kesalahan koneksi');
    } finally {
      setResetSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Manajemen User & Peran (Role)</h1>
          <p className="text-xs md:text-sm text-slate-500">
            Kelola daftar akun pengelola (Owner/Admin) dan tingkat hak akses sistem.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tambah Pengelola</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">Memuat daftar user...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="p-3.5">Nama & Email</th>
                <th className="p-3.5">Peran (Role)</th>
                <th className="p-3.5">Tanggal Terdaftar</th>
                <th className="p-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80">
                  <td className="p-3.5">
                    <strong className="text-slate-900 font-bold">{u.nama}</strong>
                    <p className="text-slate-500 text-[11px] flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {u.email}
                    </p>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${
                        u.role === 'OWNER'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : u.role === 'ADMIN'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-600">{formatDateIndonesian(u.created_at)}</td>
                  <td className="p-3.5 text-right">
                    {u.role === 'ADMIN' && (
                      <button
                        onClick={() => {
                          setTargetAdmin(u);
                          setNewAdminPassword('');
                          setResetError(null);
                          setResetSuccess(null);
                          setResetModalOpen(true);
                        }}
                        className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[11px] font-semibold transition-all inline-flex items-center gap-1.5"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Reset Sandi</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Add User */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Tambah Pengelola Baru</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Mbak Siti"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Alamat Email</label>
                <input
                  type="email"
                  required
                  placeholder="admin2@mykost.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Kata Sandi</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="******"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Peran Sistem (Role)</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                >
                  <option value="ADMIN">ADMIN (Pengelola Harian)</option>
                  <option value="OWNER">OWNER (Pemilik Akses Penuh)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
              >
                {saving ? 'Menyimpan...' : 'Simpan User Baru'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reset Password Admin by OWNER */}
      {resetModalOpen && targetAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-sm">Reset Kata Sandi Admin</h3>
              </div>
              <button onClick={() => setResetModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetSuccess ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{resetSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
                <p className="text-slate-500 leading-relaxed">
                  Mereset kata sandi untuk akun admin <strong>{targetAdmin.nama}</strong> ({targetAdmin.email}).
                  Sesi login admin yang aktif saat ini akan langsung dicabut secara otomatis.
                </p>

                {resetError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                    <span>{resetError}</span>
                  </div>
                )}

                <div>
                  <label className="font-semibold text-slate-700">Kata Sandi Baru</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Minimal 8 karakter"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-600"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={resetSaving}
                    className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-semibold"
                  >
                    {resetSaving ? 'Menyimpan...' : 'Simpan Sandi Baru'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
