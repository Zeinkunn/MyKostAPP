import { requireRole } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { Bell, CheckCircle2 } from 'lucide-react';

export default async function OwnerNotifikasiPage() {
  await requireRole([Role.OWNER, Role.ADMIN]);

  return (
    <div className="max-w-xl space-y-5">
      <h1 className="text-xl font-bold text-slate-900">Notifikasi Pengelola</h1>

      <div className="space-y-3 text-xs">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <span className="font-semibold text-emerald-600">Sistem</span>
            <span>Hari Ini</span>
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Pemberitahuan Sistem</h3>
          <p className="text-slate-600">
            Seluruh fitur dan integrasi Supabase, Cloudflare R2, dan WhatsApp Fonnte aktif.
          </p>
        </div>
      </div>
    </div>
  );
}
