import { requireRole } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  CalendarDays,
  CreditCard,
  FileText,
  KeyRound,
  LifeBuoy,
  ChevronRight,
  Building2,
} from 'lucide-react';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';
import PerpanjangButton from '@/components/profile/PerpanjangButton';
import {
  formatPhoneDisplay,
  formatDateRange,
  formatDateShortIndonesian,
} from '@/lib/utils';
import pkg from '../../../../../package.json';

export default async function PenghuniProfilPage() {
  const sessionUser = await requireRole([Role.PENGHUNI]);

  const [user, penghuni] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        nama: true,
        email: true,
      },
    }),
    prisma.penghuni.findUnique({
      where: { user_id: sessionUser.id },
      include: {
        kontrak: {
          where: { status: 'AKTIF' },
          include: {
            kamar: {
              include: {
                properti: { select: { nama: true } },
              },
            },
            tagihan: {
              where: { status: { not: 'LUNAS' } },
              orderBy: { jatuh_tempo: 'asc' },
              take: 1,
            },
          },
          take: 1,
        },
      },
    }),
  ]);

  const activeKontrak = penghuni?.kontrak?.[0];
  const kamar = activeKontrak?.kamar;
  const propertiNama = kamar?.properti?.nama || 'Properti Kost';

  // Lease period calculations
  let dateRangeText = '';
  let sisaHari = 0;
  let progressPercent = 0;
  let nextDueFormatted: string | null = null;

  if (activeKontrak) {
    dateRangeText = formatDateRange(
      activeKontrak.tanggal_mulai,
      activeKontrak.tanggal_selesai
    );
    const nowMs = Date.now();
    const endMs = new Date(activeKontrak.tanggal_selesai).getTime();
    const startMs = new Date(activeKontrak.tanggal_mulai).getTime();
    const totalDuration = Math.max(1, endMs - startMs);
    const elapsedDuration = Math.max(0, nowMs - startMs);

    sisaHari = Math.max(0, Math.ceil((endMs - nowMs) / (1000 * 60 * 60 * 24)));
    progressPercent = Math.min(100, Math.max(0, Math.round((elapsedDuration / totalDuration) * 100)));

    const nextUnpaidBill = activeKontrak.tagihan?.[0];
    if (nextUnpaidBill) {
      nextDueFormatted = formatDateShortIndonesian(nextUnpaidBill.jatuh_tempo);
    }
  }

  const initialLetter = (user?.nama || sessionUser.nama || 'P').charAt(0).toUpperCase();

  return (
    <div className="max-w-md mx-auto px-0 space-y-5">
      {/* 1. Baris Judul */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider block">
            Akun Pengguna
          </span>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Profil Saya</h1>
        </div>
      </div>

      {/* 2. Kartu Ringkasan */}
      <section className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col items-center text-center relative overflow-hidden">
        {/* Dekorasi lingkaran blur samar di sudut */}
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-blue-500/5 pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-blue-600/5 pointer-events-none" />

        {/* Avatar 96px */}
        <div className="relative mb-3">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-3xl font-bold shadow-md select-none">
            {initialLetter}
          </div>
        </div>

        {/* Nama Pengguna */}
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          {user?.nama || sessionUser.nama}
        </h2>

        {/* Chip Berderet */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2 mb-2.5">
          {activeKontrak && kamar ? (
            <>
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
                Kamar {kamar.nomor_kamar} • {kamar.tipe}
              </span>
              <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
                {propertiNama}
              </span>
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Penghuni Aktif
              </span>
            </>
          ) : (
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              Belum Ada Kontrak
            </span>
          )}
        </div>

        {/* Email dan No. HP */}
        <div className="flex flex-col items-center gap-0.5 text-xs text-slate-500">
          <span>{user?.email || sessionUser.email}</span>
          <span className="font-medium text-slate-700">
            {formatPhoneDisplay(penghuni?.no_hp)}
          </span>
        </div>
      </section>

      {/* 3. Kartu Masa Sewa Berjalan */}
      {activeKontrak ? (
        <section className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Masa Sewa Berjalan
                </span>
                <p className="text-xs font-bold text-slate-900">{dateRangeText}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
                Sisa {sisaHari} Hari
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 mb-3 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-500">
              {nextDueFormatted
                ? `Jatuh tempo sewa berikutnya: ${nextDueFormatted}`
                : 'Semua tagihan sewa lunas'}
            </span>
            <PerpanjangButton />
          </div>
        </section>
      ) : (
        <section className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs text-center text-xs text-slate-500">
          <p>Belum ada kontrak sewa aktif.</p>
        </section>
      )}

      {/* 4. Grup "Akun & Dokumen" */}
      <section className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          Akun &amp; Dokumen
        </h3>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col divide-y divide-slate-100">
          {/* Data Pribadi */}
          <Link
            href="/penghuni/profil/data"
            className="flex items-center justify-between p-3.5 hover:bg-slate-50 active:bg-slate-100/60 transition-colors min-h-[44px] group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-semibold text-slate-900 truncate">Data Pribadi</p>
                <p className="text-xs text-slate-400 truncate">KTP, No. HP, Email</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 ml-2" />
          </Link>

          {/* Detail Kontrak */}
          <Link
            href="/penghuni/profil/kontrak"
            className="flex items-center justify-between p-3.5 hover:bg-slate-50 active:bg-slate-100/60 transition-colors min-h-[44px] group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-semibold text-slate-900 truncate">Detail Kontrak</p>
                <p className="text-xs text-slate-400 truncate">
                  Perjanjian sewa &amp; unit kamar
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 ml-2" />
          </Link>
        </div>
      </section>

      {/* 5. Grup "Keamanan & Dukungan" */}
      <section className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          Keamanan &amp; Dukungan
        </h3>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col divide-y divide-slate-100">
          {/* Ganti Password */}
          <Link
            href="/penghuni/profil/password"
            className="flex items-center justify-between p-3.5 hover:bg-slate-50 active:bg-slate-100/60 transition-colors min-h-[44px] group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
                <KeyRound className="w-5 h-5" />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-semibold text-slate-900 truncate">Ganti Password</p>
                <p className="text-xs text-slate-400 truncate">Ubah kata sandi akun</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 ml-2" />
          </Link>

          {/* Pusat Bantuan */}
          <Link
            href="/penghuni/bantuan"
            className="flex items-center justify-between p-3.5 hover:bg-slate-50 active:bg-slate-100/60 transition-colors min-h-[44px] group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
                <LifeBuoy className="w-5 h-5" />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-semibold text-slate-900 truncate">Pusat Bantuan</p>
                <p className="text-xs text-slate-400 truncate">FAQ &amp; kontak pengelola</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 ml-2" />
          </Link>
        </div>
      </section>

      {/* 6. Kartu Keluar Destruktif */}
      <section className="pt-1">
        <LogoutButton
          variant="profile-card"
          label="Keluar"
          sublabel="Akhiri sesi aktif di perangkat ini"
          confirmTitle="Keluar dari Sesi?"
          confirmMessage="Apakah Anda yakin ingin mengakhiri sesi aktif di perangkat ini?"
        />
      </section>

      {/* 7. Footer Kecil */}
      <footer className="pt-3 pb-6 flex flex-col items-center justify-center gap-1 text-center">
        <div className="flex items-center gap-1.5 text-slate-400 text-xs">
          <Building2 className="w-3.5 h-3.5" />
          <span className="font-medium text-[11px] tracking-wide text-slate-500">
            MyKost Penghuni v{pkg.version} • {propertiNama}
          </span>
        </div>
      </footer>
    </div>
  );
}
