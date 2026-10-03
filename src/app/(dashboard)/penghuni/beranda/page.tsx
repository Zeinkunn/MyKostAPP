import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { Home, Receipt, AlertCircle, PlusCircle, History, ChevronRight } from 'lucide-react';
import { formatRupiah, formatDateIndonesian, getStatusBadgeStyle } from '@/lib/utils';
import Link from 'next/link';

export default async function PenghuniBerandaPage() {
  const user = await requireRole([Role.PENGHUNI]);

  // Fetch active Penghuni data & contract
  const penghuni = await prisma.penghuni.findUnique({
    where: { user_id: user.id },
    include: {
      kontrak: {
        where: { status: 'AKTIF' },
        include: {
          kamar: { include: { properti: true } },
          tagihan: { orderBy: { created_at: 'desc' }, take: 1 },
        },
        take: 1,
      },
    },
  });

  const activeKontrak = penghuni?.kontrak[0];
  const activeKamar = activeKontrak?.kamar;

  // Calculate days remaining in contract
  let sisaHari = 0;
  if (activeKontrak) {
    const diffTime = new Date(activeKontrak.tanggal_selesai).getTime() - new Date().getTime();
    sisaHari = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  // Active Bill Preview
  const currentTagihan = activeKontrak?.tagihan[0];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Halo, {user.nama}! 👋</h1>
          <p className="text-xs text-slate-500">Selamat datang kembali di hunian sewa Anda.</p>
        </div>
      </div>

      {/* Active Kamar Card */}

      {activeKamar ? (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 mb-2">
                Kamar {activeKamar.nomor_kamar} — {activeKamar.tipe}
              </span>
              <h2 className="text-xl font-bold text-slate-900">{activeKamar.properti.nama}</h2>
              <p className="text-xs text-slate-500">{activeKamar.properti.alamat}</p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-500">Sisa Masa Sewa</span>
              <p className="text-lg font-bold text-emerald-600">{sisaHari} Hari</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Link
              href="/penghuni/komplain/baru"
              className="flex items-center justify-center gap-2 p-3 bg-blue-50 text-blue-700 font-semibold rounded-xl text-xs hover:bg-blue-100 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Ajukan Komplain</span>
            </Link>
            <Link
              href="/penghuni/tagihan"
              className="flex items-center justify-center gap-2 p-3 bg-emerald-50 text-emerald-700 font-semibold rounded-xl text-xs hover:bg-emerald-100 transition-colors"
            >
              <History className="w-4 h-4" />
              <span>Riwayat Bayar</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-center text-slate-500 text-xs">
          Anda belum terhubung ke kamar sewa manapun.
        </div>
      )}

      {/* Active Invoice Card Preview */}
      {currentTagihan ? (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-900 text-sm">Tagihan Bulan Ini</h3>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeStyle(
                currentTagihan.status
              )}`}
            >
              {currentTagihan.status.replace('_', ' ')}
            </span>
          </div>

          <div className="flex justify-between items-end pt-1">
            <div>
              <p className="text-xs text-slate-500">Periode {currentTagihan.periode}</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">
                {formatRupiah(Number(currentTagihan.jumlah) + Number(currentTagihan.denda))}
              </p>
            </div>
            <Link
              href={`/penghuni/tagihan/${currentTagihan.id}`}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
            >
              {currentTagihan.status === 'LUNAS' ? 'Lihat Kwitansi' : 'Bayar Sekarang'}
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm text-center text-slate-500 text-xs">
          Belum ada tagihan aktif bulan ini.
        </div>
      )}
    </div>
  );
}
