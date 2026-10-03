import { requireRole } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  BadgeCheck,
  DoorOpen,
  TrendingUp,
  Users,
  UserCheck,
  KeyRound,
  Building2,
  Bell,
  SlidersHorizontal,
  UserCog,
  LifeBuoy,
  FileText,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';
import pkg from '../../../../../package.json';

export default async function OwnerProfilPage() {
  const sessionUser = await requireRole([Role.OWNER, Role.ADMIN]);

  // Parallel data fetching for performance
  const [
    user,
    propertiList,
    totalKamar,
    terisiKamar,
    penghuniAktifCount,
    unreadNotifikasiCount,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, nama: true, email: true, role: true },
    }),
    prisma.properti.findMany({
      select: { id: true, nama: true, _count: { select: { kamar: true } } },
    }),
    prisma.kamar.count(),
    prisma.kamar.count({ where: { status: 'TERISI' } }),
    prisma.kontrak.count({ where: { status: 'AKTIF' } }),
    prisma.notifikasi.count({ where: { user_id: sessionUser.id, dibaca: false } }),
  ]);

  // Safe occupancy calculation without NaN
  const okupansi = totalKamar > 0 ? ((terisiKamar / totalKamar) * 100).toFixed(1) + '%' : '0%';

  // Property labels
  const propertiLabel =
    propertiList.length === 0
      ? 'Belum Ada Properti'
      : propertiList.length === 1
      ? propertiList[0].nama
      : `${propertiList.length} Properti`;

  const propertiSubtext = `${propertiList.length} properti • ${totalKamar} kamar`;

  const isOwner = sessionUser.role === Role.OWNER;
  const initialLetter = (user?.nama || sessionUser.nama || 'U').charAt(0).toUpperCase();

  return (
    <div className="max-w-md mx-auto px-0 space-y-5">
      {/* 1. Profile Hero Header */}
      <section className="px-5 pt-3 pb-1 flex flex-col items-center text-center">
        {/* Circular Avatar with blue gradient ring */}
        <div className="relative group mb-3">
          <div className="w-[104px] h-[104px] rounded-full p-1 bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md">
            <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center text-3xl font-bold text-blue-600 select-none">
              {initialLetter}
            </div>
          </div>
        </div>

        {/* User Identity */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              {user?.nama || sessionUser.nama}
            </h1>
            <BadgeCheck className="w-5 h-5 text-blue-600 fill-blue-50 shrink-0" />
          </div>

          {/* Role & Property Tag */}
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap justify-center">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {isOwner ? 'Super Admin / Owner' : 'Admin'}
            </span>
            <span className="text-[12px] font-medium text-slate-500">
              {propertiLabel}
            </span>
          </div>

          {/* Contact Subline */}
          <p className="mt-1 text-[11.5px] font-normal text-slate-500 flex items-center justify-center gap-1.5">
            <span>{user?.email || sessionUser.email}</span>
          </p>
        </div>
      </section>

      {/* 2. Quick Business Stats Overview (3 Kolom) */}
      <section>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="grid grid-cols-3 gap-2">
            {/* Stat Item 1: Total Kamar */}
            <div className="flex flex-col items-center text-center px-1">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-blue-600 mb-1.5">
                <DoorOpen className="w-4 h-4" />
              </div>
              <span className="text-base font-bold text-slate-900 tracking-tight">
                {totalKamar} Unit
              </span>
              <span className="text-[11px] font-medium text-slate-400 mt-0.5">
                Total Kamar
              </span>
            </div>

            {/* Stat Item 2: Okupansi Aktif */}
            <div className="flex flex-col items-center text-center px-1 border-x border-slate-100">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-1.5">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-base font-bold text-blue-600 tracking-tight">
                {okupansi}
              </span>
              <span className="text-[11px] font-medium text-slate-400 mt-0.5">
                Okupansi Aktif
              </span>
            </div>

            {/* Stat Item 3: Penghuni Aktif */}
            <div className="flex flex-col items-center text-center px-1">
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-1.5">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-base font-bold text-slate-900 tracking-tight">
                {penghuniAktifCount}
              </span>
              <span className="text-[11px] font-medium text-slate-400 mt-0.5">
                Penghuni Aktif
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Grup: Pengaturan Akun */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          Pengaturan Akun
        </h2>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col divide-y divide-slate-100">
          {/* Data Pribadi */}
          <Link
            href="/owner/profil/edit"
            className="flex items-center justify-between p-3.5 hover:bg-slate-50 active:bg-slate-100/60 transition-colors min-h-[44px] group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
                <UserCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-semibold text-slate-900 truncate">Data Pribadi</p>
                <p className="text-xs text-slate-400 truncate">Nama &amp; email akun</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 ml-2" />
          </Link>

          {/* Ganti Password */}
          <Link
            href="/owner/profil/password"
            className="flex items-center justify-between p-3.5 hover:bg-slate-50 active:bg-slate-100/60 transition-colors min-h-[44px] group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
                <KeyRound className="w-5 h-5" />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-semibold text-slate-900 truncate">Ganti Password</p>
                <p className="text-xs text-slate-400 truncate">Kata sandi akun pengelola</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 ml-2" />
          </Link>
        </div>
      </section>

      {/* 4. Grup: Properti & Sistem */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          Properti &amp; Sistem
        </h2>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col divide-y divide-slate-100">
          {/* Properti Saya */}
          <Link
            href="/owner/properti"
            className="flex items-center justify-between p-3.5 hover:bg-slate-50 active:bg-slate-100/60 transition-colors min-h-[44px] group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-semibold text-slate-900 truncate">Properti Saya</p>
                <p className="text-xs text-slate-400 truncate">{propertiSubtext}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 ml-2" />
          </Link>

          {/* Notifikasi Sistem */}
          <Link
            href="/owner/notifikasi"
            className="flex items-center justify-between p-3.5 hover:bg-slate-50 active:bg-slate-100/60 transition-colors min-h-[44px] group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
                <Bell className="w-5 h-5" />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-semibold text-slate-900 truncate">Notifikasi Sistem</p>
                <p className="text-xs text-slate-400 truncate">
                  Pengingat jatuh tempo &amp; komplain
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              {unreadNotifikasiCount > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-blue-100" />
              )}
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>
          </Link>

          {/* Pengaturan Denda & Template WA */}
          <Link
            href="/owner/pengaturan"
            className="flex items-center justify-between p-3.5 hover:bg-slate-50 active:bg-slate-100/60 transition-colors min-h-[44px] group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  Pengaturan Denda &amp; Template WA
                </p>
                <p className="text-xs text-slate-400 truncate">
                  Aturan denda sewa &amp; otomatisasi pesan
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 ml-2" />
          </Link>

          {/* Kelola User & Peran (OWNER ONLY) */}
          {isOwner && (
            <Link
              href="/owner/users"
              className="flex items-center justify-between p-3.5 hover:bg-slate-50 active:bg-slate-100/60 transition-colors min-h-[44px] group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
                  <UserCog className="w-5 h-5" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    Kelola User &amp; Peran
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    Kelola akun admin &amp; hak akses
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 ml-2" />
            </Link>
          )}
        </div>
      </section>

      {/* 5. Grup: Bantuan & Kebijakan */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          Bantuan &amp; Kebijakan
        </h2>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col divide-y divide-slate-100">
          {/* Pusat Bantuan */}
          <Link
            href="/owner/bantuan"
            className="flex items-center justify-between p-3.5 hover:bg-slate-50 active:bg-slate-100/60 transition-colors min-h-[44px] group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
                <LifeBuoy className="w-5 h-5" />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-semibold text-slate-900 truncate">Pusat Bantuan</p>
                <p className="text-xs text-slate-400 truncate">Panduan pengelola &amp; FAQ</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 ml-2" />
          </Link>

          {/* Kebijakan & Ketentuan Layanan */}
          <Link
            href="/kebijakan"
            className="flex items-center justify-between p-3.5 hover:bg-slate-50 active:bg-slate-100/60 transition-colors min-h-[44px] group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  Kebijakan &amp; Ketentuan Layanan
                </p>
                <p className="text-xs text-slate-400 truncate">
                  Perjanjian lisensi &amp; privasi
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 ml-2" />
          </Link>
        </div>
      </section>

      {/* 6. Kartu Keluar dari Akun */}
      <section className="pt-1">
        <LogoutButton
          variant="profile-card"
          label="Keluar dari Akun"
          sublabel="Akhiri sesi manajemen pada perangkat ini"
          confirmTitle="Keluar dari Sesi?"
          confirmMessage="Anda perlu masuk kembali untuk mengelola properti MyKost."
        />
      </section>

      {/* 7. Footer */}
      <footer className="mt-6 mb-2 px-5 text-center flex flex-col items-center">
        <div className="flex items-center gap-1.5 text-slate-400 text-xs">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="text-[11px] font-medium tracking-wide text-slate-500">
            MyKost Pemilik v{pkg.version}
          </span>
        </div>
      </footer>
    </div>
  );
}
