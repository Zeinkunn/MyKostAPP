import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';
import { formatRupiah, formatDateIndonesian } from '@/lib/utils';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Upload, ArrowLeft, ShieldCheck } from 'lucide-react';
import PrintButton from '@/components/PrintButton';

export default async function DetailTagihanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  const resolvedParams = await params;
  const tagihanId = resolvedParams.id;

  const tagihan = await prisma.tagihan.findUnique({
    where: { id: tagihanId },
    select: {
      id: true,
      periode: true,
      jumlah: true,
      denda: true,
      jatuh_tempo: true,
      status: true,
      kontrak: {
        select: {
          id: true,
          penghuni: {
            select: {
              id: true,
              user_id: true,
              nama: true,
            },
          },
          kamar: {
            select: {
              nomor_kamar: true,
              tipe: true,
              properti: {
                select: { nama: true },
              },
            },
          },
        },
      },
      pembayaran: {
        select: {
          id: true,
          metode: true,
          tanggal_bayar: true,
          status_verifikasi: true,
        },
        orderBy: { tanggal_bayar: 'desc' },
      },
    },
  });

  if (!tagihan) {
    notFound();
  }

  // IDOR Protection: Tenant can only view their own bill. Owner/Admin can view any.
  if (session.role === 'PENGHUNI' && tagihan.kontrak.penghuni.user_id !== session.id) {
    notFound();
  }

  const isLunas = tagihan.status === 'LUNAS';
  const latestPembayaran = tagihan.pembayaran[0];
  const isPendingVerification = latestPembayaran?.status_verifikasi === 'PENDING';

  const totalBayar = Number(tagihan.jumlah) + Number(tagihan.denda);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Back Button */}
      <Link
        href="/penghuni/tagihan"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 no-print"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke Daftar Tagihan</span>
      </Link>

      {/* Kwitansi / Invoice Card Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print-card">
        {/* Card Header Banner */}
        <div className={`p-6 text-white ${isLunas ? 'bg-emerald-600' : 'bg-blue-600'}`}>
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
                {isLunas ? 'Kwitansi Pembayaran Resmi' : 'Invoice Tagihan Sewa'}
              </span>
              <h2 className="text-2xl font-bold mt-1">
                {tagihan.kontrak.kamar.properti.nama} — Kamar {tagihan.kontrak.kamar.nomor_kamar}
              </h2>
            </div>
            <span
              className={`px-3 py-1 text-xs font-bold rounded-full ${
                isLunas ? 'bg-white text-emerald-800' : 'bg-white text-blue-800'
              }`}
            >
              {isPendingVerification ? 'Pending Approval' : tagihan.status.replace('_', ' ')}
            </span>
          </div>

          <div className="mt-4 pt-4 border-t border-white/20 flex justify-between items-end">
            <div>
              <p className="text-xs text-white/80">Total Tagihan Periode {tagihan.periode}</p>
              <p className="text-3xl font-extrabold mt-0.5">{formatRupiah(totalBayar)}</p>
            </div>
            <p className="text-xs text-white/90">
              Jatuh Tempo: {formatDateIndonesian(tagihan.jatuh_tempo)}
            </p>
          </div>
        </div>

        {/* Breakdown Body */}
        <div className="p-6 space-y-4">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
            Rincian Komponen Tagihan
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Sewa Kamar ({tagihan.kontrak.kamar.tipe})</span>
              <span className="font-semibold text-slate-900">{formatRupiah(tagihan.jumlah)}</span>
            </div>

            {Number(tagihan.denda) > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Denda Keterlambatan</span>
                <span className="font-semibold">{formatRupiah(tagihan.denda)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-100">
              <span>Total Pembayaran</span>
              <span className="text-blue-600">{formatRupiah(totalBayar)}</span>
            </div>
          </div>

          {/* Info Payment Verification / History */}
          {latestPembayaran && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <p className="font-semibold text-slate-900">Status Pembayaran Terakhir:</p>
              <p className="text-slate-600">
                Metode: {latestPembayaran.metode} | Waktu:{' '}
                {formatDateIndonesian(latestPembayaran.tanggal_bayar)}
              </p>
              <p className="text-slate-600">
                Status Verifikasi:{' '}
                <strong
                  className={
                    latestPembayaran.status_verifikasi === 'DISETUJUI'
                      ? 'text-emerald-600'
                      : latestPembayaran.status_verifikasi === 'PENDING'
                      ? 'text-amber-600'
                      : 'text-rose-600'
                  }
                >
                  {latestPembayaran.status_verifikasi}
                </strong>
              </p>
            </div>
          )}

          {/* Actions depending on Status */}
          {isLunas ? (
            /* READ ONLY KWITANSI - NO PAY BUTTON AT ALL */
            <div className="pt-4 space-y-3">
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Kwitansi ini lunas dan terverifikasi sah oleh sistem pengelola kost.</span>
              </div>

              <div className="no-print">
                <PrintButton />
              </div>
            </div>
          ) : (
            /* BELUM LUNAS - Action to Upload Proof */
            <div className="pt-4 space-y-2 no-print">
              <Link
                href={`/penghuni/tagihan/${tagihan.id}/bayar`}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 text-center"
              >
                <Upload className="w-4 h-4" />
                <span>
                  {isPendingVerification ? 'Kirim Ulang Bukti Bayar' : 'Upload Bukti Pembayaran'}
                </span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
