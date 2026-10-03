import { requireRole } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { User, Edit3, KeyRound, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';

export default async function OwnerProfilPage() {
  const sessionUser = await requireRole([Role.OWNER, Role.ADMIN]);

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-center space-y-3">
        <div className="w-20 h-20 rounded-full bg-blue-600 text-white text-3xl font-bold flex items-center justify-center mx-auto shadow-md">
          {sessionUser.nama ? sessionUser.nama.charAt(0).toUpperCase() : 'U'}
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">{sessionUser.nama}</h2>
          <p className="text-xs text-slate-500">{sessionUser.email}</p>
          <span className="inline-block px-3 py-1 mt-2 text-[10px] font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wider">
            {sessionUser.role}
          </span>
        </div>
      </div>

      {/* Menu Options */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 text-xs font-semibold text-slate-700 overflow-hidden">
        <Link
          href="/owner/profil/edit"
          className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-slate-900">Edit Profil & Data Pengelola</p>
              <p className="text-[11px] text-slate-400 font-normal">Nama, email terdaftar</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </Link>

        <Link
          href="/owner/profil/password"
          className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <p className="text-slate-900">Keamanan & Password</p>
              <p className="text-[11px] text-slate-400 font-normal">Ganti kata sandi akun pengelola</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </Link>
      </div>

      {/* Logout Action */}
      <div>
        <LogoutButton variant="profile" />
      </div>
    </div>
  );
}
