import { requireRole } from '@/lib/rbac';
import { Role } from '@prisma/client';
import NotifikasiList from '@/components/NotifikasiList';

export default async function PenghuniNotifikasiPage() {
  await requireRole([Role.PENGHUNI]);

  return (
    <div className="max-w-md mx-auto space-y-5">
      <h1 className="text-xl font-bold text-slate-900">Notifikasi & Pengumuman</h1>
      <NotifikasiList />
    </div>
  );
}
