import { requireRole } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { formatDateIndonesian, formatRupiah } from '@/lib/utils';
import { ArrowLeft, FileText, Calendar, Building2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default async function DetailKontrakPage() {
  const sessionUser = await requireRole([Role.PENGHUNI]);

  const penghuni = await prisma.penghuni.findUnique({
    where: { user_id: sessionUser.id },
    include: {
      kontrak: {
        where: { status: 'AKTIF' },
        include: { kamar: { include: { properti: true } } },
        take: 1,
      },
    },
  });

  const activeKontrak = penghuni?.kontrak[0];

  return (
    <div className="max-w-md mx-auto space-y-5">
      <Link
        href="/penghuni/profil"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke Profil</span>
      </Link>

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
              Status Kontrak Aktif
            </span>
            <h1 className="text-lg font-bold text-slate-900">Kontrak Sewa Digital</h1>
          </div>
        </div>

        {activeKontrak ? (
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <p className="text-slate-400">Gedung Properti:</p>
              <p className="font-bold text-slate-900">{activeKontrak.kamar.properti.nama}</p>
              <p className="text-slate-500">{activeKontrak.kamar.properti.alamat}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <p className="text-slate-400">Nomor Kamar:</p>
                <p className="font-bold text-slate-900 text-sm">Kamar {activeKontrak.kamar.nomor_kamar}</p>
                <p className="text-slate-500 text-[11px]">{activeKontrak.kamar.tipe}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <p className="text-slate-400">Harga Disepakati:</p>
                <p className="font-bold text-emerald-700 text-sm">
                  {formatRupiah(activeKontrak.harga_sewa_disepakati)}
                </p>
                <p className="text-slate-500 text-[11px]">per bulan</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <p className="text-slate-400">Masa Berlaku Kontrak:</p>
              <p className="font-semibold text-slate-900">
                {formatDateIndonesian(activeKontrak.tanggal_mulai)} s/d{' '}
                {formatDateIndonesian(activeKontrak.tanggal_selesai)}
              </p>
            </div>

            <div className="p-3.5 bg-blue-50 text-blue-800 rounded-xl flex items-start gap-2 text-[11px]">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Kontrak ini terikat sah dengan pengelola kost. Perpanjangan kontrak dapat diajukan 30 hari sebelum masa berlaku berakhir.
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 text-center py-6">
            Anda belum memiliki kontrak sewa yang aktif.
          </p>
        )}
      </div>
    </div>
  );
}
