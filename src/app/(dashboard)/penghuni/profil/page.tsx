import { requireRole } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { User, FileText, KeyRound, HelpCircle, ChevronRight, Edit3 } from 'lucide-react';
import Link from 'next/link';

export default async function PenghuniProfilPage() {
  const sessionUser = await requireRole([Role.PENGHUNI]);

  const penghuni = await prisma.penghuni.findUnique({
    where: { user_id: sessionUser.id },
    include: {
      kontrak: {
        where: { status: 'AKTIF' },
        include: { kamar: true },
        take: 1,
      },
    },
  });

  const activeKontrak = penghuni?.kontrak[0];

  return (
    <div className="max-w-md mx-auto space-y-5">
      {/* Profile Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-blue-600 text-white text-2xl font-bold flex items-center justify-center mx-auto shadow-md">
          {sessionUser.nama ? sessionUser.nama.charAt(0).toUpperCase() : 'P'}
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{sessionUser.nama}</h2>
          <p className="text-xs text-slate-500">{penghuni?.no_hp || sessionUser.email}</p>
          {activeKontrak && (
            <span className="inline-block px-3 py-1 mt-2 text-[11px] font-bold rounded-full bg-blue-100 text-blue-800">
              Kamar {activeKontrak.kamar.nomor_kamar} — {activeKontrak.kamar.tipe}
            </span>
          )}
        </div>
      </div>

      {/* Navigation List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 text-xs font-semibold text-slate-700 overflow-hidden">
        {/* Edit Profil */}
        <Link
          href="/penghuni/profil/edit"
          className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-slate-900">Edit Profil & Data Diri</p>
              <p className="text-[11px] text-slate-400 font-normal">Ubah nama & email terdaftar</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </Link>

        {/* Change Password */}
        <Link
          href="/penghuni/profil/password"
          className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <p className="text-slate-900">Ubah Kata Sandi</p>
              <p className="text-[11px] text-slate-400 font-normal">Ganti password akun MyKost Anda</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </Link>

        {/* Detail Kontrak Sub-Menu */}
        <Link
          href="/penghuni/profil/kontrak"
          className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <p className="text-slate-900">Detail Kontrak Sewa</p>
              <p className="text-[11px] text-slate-400 font-normal">Informasi masa berlaku & harga sewa</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </Link>

        <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
              <User className="w-4 h-4" />
            </div>
            <div>
              <p className="text-slate-900">Data KTP Penghuni</p>
              <p className="text-[11px] text-slate-400 font-normal">No. KTP: {penghuni?.no_ktp || '-'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
