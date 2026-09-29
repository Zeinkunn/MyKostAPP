import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { BedDouble, Receipt, MessageSquareWarning, ArrowUpRight, CheckCircle2, Clock, Users } from 'lucide-react';
import { formatRupiah, formatDateIndonesian } from '@/lib/utils';
import Link from 'next/link';

export default async function OwnerDashboardPage() {
  const user = await requireRole([Role.OWNER, Role.ADMIN]);

  // Fetch real-time live aggregates from Supabase
  const totalKamar = await prisma.kamar.count();
  const terisiKamar = await prisma.kamar.count({ where: { status: 'TERISI' } });
  const occupancyPercentage = totalKamar > 0 ? Math.round((terisiKamar / totalKamar) * 100) : 0;

  // Monthly Revenue
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const approvedPayments = await prisma.pembayaran.aggregate({
    where: {
      status_verifikasi: 'DISETUJUI',
      tanggal_bayar: { gte: startOfMonth, lte: endOfMonth },
    },
    _sum: { jumlah_dibayar: true },
  });
  const monthlyRevenue = Number(approvedPayments._sum.jumlah_dibayar || 0);

  // Unpaid Bills Aggregate
  const unpaidBills = await prisma.tagihan.aggregate({
    where: { status: { in: ['BELUM_BAYAR', 'TERLAMBAT'] } },
    _sum: { jumlah: true, denda: true },
    _count: true,
  });
  const totalUnpaid = Number(unpaidBills._sum.jumlah || 0) + Number(unpaidBills._sum.denda || 0);

  // Active Complaints
  const activeComplaintsCount = await prisma.pengaduan.count({
    where: { status: { in: ['BARU', 'DIPROSES'] } },
  });

  // Pending Approvals List (Quick Action)
  const pendingVerifications = await prisma.pembayaran.findMany({
    where: { status_verifikasi: 'PENDING' },
    include: {
      tagihan: {
        include: {
          kontrak: {
            include: {
              kamar: { select: { nomor_kamar: true } },
              penghuni: { select: { nama: true } },
            },
          },
        },
      },
    },
    take: 5,
    orderBy: { tanggal_bayar: 'desc' },
  });

  // Recent Complaints List
  const recentComplaints = await prisma.pengaduan.findMany({
    where: { status: { in: ['BARU', 'DIPROSES'] } },
    include: {
      kamar: { select: { nomor_kamar: true } },
      penghuni: { select: { nama: true } },
    },
    take: 5,
    orderBy: { created_at: 'desc' },
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-lg flex justify-between items-center">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">Dashboard Pengelola Kost</h2>
          <p className="text-blue-100 text-xs md:text-sm mt-1">
            Pantau statistik okupansi, pendapatan, dan aksi verifikasi hari ini secara real-time.
          </p>
        </div>
        <div className="hidden sm:block text-right">
          <span className="text-xs text-blue-200">Peran Pengguna</span>
          <p className="font-bold text-base uppercase tracking-wider">{user.role}</p>
        </div>
      </div>

      {/* 2x2 / 4 Real-time Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-semibold">Okupansi Kamar</span>
            <BedDouble className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl md:text-2xl font-bold text-slate-900">{occupancyPercentage}%</p>
          <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> {terisiKamar} dari {totalKamar} Kamar Terisi
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-semibold">Pendapatan Bulan Ini</span>
            <Receipt className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl md:text-2xl font-bold text-slate-900">{formatRupiah(monthlyRevenue)}</p>
          <p className="text-[11px] text-slate-500 font-medium">Terverifikasi Lunas</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-semibold">Tagihan Tertunggak</span>
            <Receipt className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-xl md:text-2xl font-bold text-rose-600">{formatRupiah(totalUnpaid)}</p>
          <p className="text-[11px] text-rose-500 font-medium">{unpaidBills._count} Invoice Belum Lunas</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-semibold">Komplain Aktif</span>
            <MessageSquareWarning className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl md:text-2xl font-bold text-amber-600">{activeComplaintsCount}</p>
          <p className="text-[11px] text-amber-600 font-medium">Perlu Tindakan Perbaikan</p>
        </div>
      </div>

      {/* Action Required Today Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pending Verifications */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Verifikasi Bayar Perlu Di-Approve</span>
            </h3>
            <Link href="/owner/verifikasi" className="text-xs text-blue-600 font-semibold hover:underline">
              Lihat Semua
            </Link>
          </div>

          {pendingVerifications.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
              Tidak ada pembayaran pending yang perlu diverifikasi.
            </div>
          ) : (
            <div className="space-y-2">
              {pendingVerifications.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-xs"
                >
                  <div>
                    <strong className="text-slate-900">
                      Kamar {item.tagihan.kontrak.kamar.nomor_kamar} — {item.tagihan.kontrak.penghuni.nama}
                    </strong>
                    <p className="text-slate-500">{formatRupiah(item.jumlah_dibayar)} ({item.metode})</p>
                  </div>
                  <Link
                    href="/owner/verifikasi"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm"
                  >
                    Tinjau
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Complaints Required Action */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <MessageSquareWarning className="w-4 h-4 text-rose-500" />
              <span>Komplain Baru Masuk</span>
            </h3>
            <Link href="/owner/pengaduan" className="text-xs text-blue-600 font-semibold hover:underline">
              Lihat Semua
            </Link>
          </div>

          {recentComplaints.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
              Tidak ada komplain aktif saat ini.
            </div>
          ) : (
            <div className="space-y-2">
              {recentComplaints.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-xs"
                >
                  <div>
                    <strong className="text-slate-900">
                      Kamar {item.kamar.nomor_kamar} — {item.kategori}
                    </strong>
                    <p className="text-slate-500 line-clamp-1">{item.deskripsi}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
