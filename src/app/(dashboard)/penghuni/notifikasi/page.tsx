import { requireRole } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { Bell, CheckCircle2, Clock } from 'lucide-react';
import Link from 'next/link';

export default async function PenghuniNotifikasiPage() {
  await requireRole([Role.PENGHUNI]);

  return (
    <div className="max-w-md mx-auto space-y-5">
      <h1 className="text-xl font-bold text-slate-900">Notifikasi & Pengumuman</h1>

      <div className="space-y-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1 text-xs">
          <div className="flex justify-between items-center text-slate-400">
            <span className="font-semibold text-blue-600">Tagihan Baru</span>
            <span>Hari Ini</span>
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Tagihan Sewa Bulan Ini</h3>
          <p className="text-slate-600">
            Tagihan sewa kamar Anda untuk periode bulan ini telah terbit. Silakan lakukan pembayaran sebelum jatuh tempo.
          </p>
        </div>
      </div>
    </div>
  );
}
