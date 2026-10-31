import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { Role, StatusTagihan, StatusVerifikasi } from '@prisma/client';
import { TrendingUp, AlertTriangle, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatRupiah, formatDateIndonesian } from '@/lib/utils';
import { getJakartaDateParts } from '@/lib/tagihan';
import ExportExcelButton from '@/components/ExportExcelButton';
import Link from 'next/link';

const PAGE_SIZE = 50;

export default async function OwnerLaporanPage({
  searchParams,
}: {
  searchParams?: Promise<{ periode?: string; page?: string }>;
}) {
  await requireRole([Role.OWNER, Role.ADMIN]);

  const resolvedParams = searchParams ? await searchParams : {};
  const { year, month } = getJakartaDateParts();
  const currentMonthPeriode = `${year}-${String(month).padStart(2, '0')}`;

  const rawPeriode = resolvedParams.periode?.trim();
  const activePeriode =
    rawPeriode === 'ALL'
      ? 'ALL'
      : rawPeriode && /^\d{4}-\d{2}$/.test(rawPeriode)
        ? rawPeriode
        : currentMonthPeriode;

  const currentPage = Math.max(1, parseInt(resolvedParams.page || '1', 10) || 1);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const paymentWhere = {
    status_verifikasi: StatusVerifikasi.DISETUJUI,
    ...(activePeriode !== 'ALL' && {
      tagihan: { periode: activePeriode },
    }),
  };

  const unpaidWhere = {
    status: { in: [StatusTagihan.BELUM_BAYAR, StatusTagihan.TERLAMBAT] },
    ...(activePeriode !== 'ALL' && {
      periode: activePeriode,
    }),
  };

  // Database-level aggregations & bounded queries in parallel
  const [paymentAgg, unpaidAgg, approvedPayments, unpaidBills] = await Promise.all([
    prisma.pembayaran.aggregate({
      where: paymentWhere,
      _sum: { jumlah_dibayar: true },
      _count: { id: true },
    }),
    prisma.tagihan.aggregate({
      where: unpaidWhere,
      _sum: { jumlah: true, denda: true },
      _count: { id: true },
    }),
    prisma.pembayaran.findMany({
      where: paymentWhere,
      select: {
        id: true,
        tanggal_bayar: true,
        metode: true,
        jumlah_dibayar: true,
        tagihan: {
          select: {
            periode: true,
            kontrak: {
              select: {
                kamar: { select: { nomor_kamar: true } },
                penghuni: { select: { nama: true } },
              },
            },
          },
        },
      },
      orderBy: { tanggal_bayar: 'desc' },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.tagihan.findMany({
      where: unpaidWhere,
      select: {
        id: true,
        periode: true,
        jumlah: true,
        denda: true,
        jatuh_tempo: true,
        kontrak: {
          select: {
            kamar: { select: { nomor_kamar: true } },
            penghuni: { select: { nama: true } },
          },
        },
      },
      orderBy: { jatuh_tempo: 'asc' },
      take: PAGE_SIZE,
    }),
  ]);

  const totalIncome = Number(paymentAgg._sum.jumlah_dibayar ?? 0);
  const totalPaymentCount = paymentAgg._count.id;
  const totalPages = Math.max(1, Math.ceil(totalPaymentCount / PAGE_SIZE));

  const totalUnpaid =
    Number(unpaidAgg._sum.jumlah ?? 0) + Number(unpaidAgg._sum.denda ?? 0);
  const totalUnpaidCount = unpaidAgg._count.id;

  // Strictly serialize to plain objects (Number for Decimals, ISO string for Dates)
  const serializedPayments = approvedPayments.map((p) => ({
    id: p.id,
    tanggal_bayar: p.tanggal_bayar.toISOString(),
    metode: p.metode,
    jumlah_dibayar: Number(p.jumlah_dibayar),
    tagihan: {
      periode: p.tagihan.periode,
      kontrak: {
        kamar: { nomor_kamar: p.tagihan.kontrak.kamar.nomor_kamar },
        penghuni: { nama: p.tagihan.kontrak.penghuni.nama },
      },
    },
  }));

  const serializedUnpaid = unpaidBills.map((b) => ({
    id: b.id,
    periode: b.periode,
    jumlah: Number(b.jumlah),
    denda: Number(b.denda),
    jatuh_tempo: b.jatuh_tempo.toISOString(),
    kontrak: {
      kamar: { nomor_kamar: b.kontrak.kamar.nomor_kamar },
      penghuni: { nama: b.kontrak.penghuni.nama },
    },
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Laporan Keuangan & Pendapatan</h1>
          <p className="text-xs md:text-sm text-slate-500">
            Ringkasan pemasukan kas kost dan rincian piutang tagihan ({activePeriode === 'ALL' ? 'Semua Periode' : `Periode ${activePeriode}`}).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 ml-2" />
            <Link
              href={`/owner/laporan?periode=${currentMonthPeriode}&page=1`}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                activePeriode === currentMonthPeriode
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Bulan Ini ({currentMonthPeriode})
            </Link>
            <Link
              href="/owner/laporan?periode=ALL&page=1"
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                activePeriode === 'ALL'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Semua Periode
            </Link>
          </div>

          <ExportExcelButton
            approvedPayments={serializedPayments}
            unpaidBills={serializedUnpaid}
          />
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
            <span>Total Pemasukan Kas (Lunas)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-700">{formatRupiah(totalIncome)}</p>
          <p className="text-[11px] text-slate-500">{totalPaymentCount} Transaksi Terverifikasi</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
            <span>Total Piutang Belum Lunas</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-extrabold text-rose-600">{formatRupiah(totalUnpaid)}</p>
          <p className="text-[11px] text-slate-500">{totalUnpaidCount} Invoice Tertunggak</p>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-5">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-slate-900 text-sm">Rincian Pemasukan Kas Terakhir</h3>
          <span className="text-[11px] text-slate-500">
            Halaman {currentPage} dari {totalPages}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="p-3">Tanggal Bayar</th>
                <th className="p-3">Kamar & Penghuni</th>
                <th className="p-3">Periode Tagihan</th>
                <th className="p-3">Metode</th>
                <th className="p-3 text-right">Jumlah Dibayar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {approvedPayments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400">
                    Belum ada transaksi pemasukan pada periode ini.
                  </td>
                </tr>
              ) : (
                approvedPayments.map((p) => (
                  <tr key={p.id}>
                    <td className="p-3 text-slate-600">{formatDateIndonesian(p.tanggal_bayar)}</td>
                    <td className="p-3">
                      <strong className="text-slate-900">
                        Kamar {p.tagihan.kontrak.kamar.nomor_kamar}
                      </strong>
                      <p className="text-slate-500 text-[11px]">{p.tagihan.kontrak.penghuni.nama}</p>
                    </td>
                    <td className="p-3 font-semibold text-slate-700">{p.tagihan.periode}</td>
                    <td className="p-3 text-slate-600">{p.metode}</td>
                    <td className="p-3 text-right font-bold text-emerald-700">
                      {formatRupiah(p.jumlah_dibayar)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-xs">
            <Link
              href={`/owner/laporan?periode=${activePeriode}&page=${Math.max(1, currentPage - 1)}`}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border font-semibold ${
                currentPage <= 1
                  ? 'pointer-events-none opacity-40 border-slate-200 text-slate-400'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Sebelumnya</span>
            </Link>
            <Link
              href={`/owner/laporan?periode=${activePeriode}&page=${Math.min(totalPages, currentPage + 1)}`}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border font-semibold ${
                currentPage >= totalPages
                  ? 'pointer-events-none opacity-40 border-slate-200 text-slate-400'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>Berikutnya</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
