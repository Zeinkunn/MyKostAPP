import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { TrendingUp, AlertTriangle } from 'lucide-react';
import { formatRupiah, formatDateIndonesian } from '@/lib/utils';
import ExportExcelButton from '@/components/ExportExcelButton';

export default async function OwnerLaporanPage() {
  await requireRole([Role.OWNER, Role.ADMIN]);

  // Approved Payments List (use select to avoid leaking unneeded fields & Decimal issues)
  const approvedPayments = await prisma.pembayaran.findMany({
    where: { status_verifikasi: 'DISETUJUI' },
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
  });

  const totalIncome = approvedPayments.reduce((acc, curr) => acc + Number(curr.jumlah_dibayar), 0);

  // Unpaid Tagihan List (use select)
  const unpaidBills = await prisma.tagihan.findMany({
    where: { status: { in: ['BELUM_BAYAR', 'TERLAMBAT'] } },
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
  });

  const totalUnpaid = unpaidBills.reduce((acc, curr) => acc + Number(curr.jumlah) + Number(curr.denda), 0);

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
            Ringkasan pemasukan kas kost dan rincian piutang tagihan.
          </p>
        </div>

        <ExportExcelButton
          approvedPayments={serializedPayments}
          unpaidBills={serializedUnpaid}
        />
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
            <span>Total Pemasukan Kas (Lunas)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-700">{formatRupiah(totalIncome)}</p>
          <p className="text-[11px] text-slate-500">{approvedPayments.length} Transaksi Terverifikasi</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
            <span>Total Piutang Belum Lunas</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-extrabold text-rose-600">{formatRupiah(totalUnpaid)}</p>
          <p className="text-[11px] text-slate-500">{unpaidBills.length} Invoice Tertunggak</p>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-5">
        <h3 className="font-bold text-slate-900 text-sm">Rincian Pemasukan Kas Terakhir</h3>
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
              {approvedPayments.map((p) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
