import { requireRole } from '@/lib/rbac';
import { Role } from '@prisma/client';
import NotifikasiList from '@/components/NotifikasiList';

export default async function OwnerNotifikasiPage() {
  await requireRole([Role.OWNER, Role.ADMIN]);

  return (
    <div className="max-w-xl space-y-5">
      <h1 className="text-xl font-bold text-slate-900">Notifikasi Pengelola</h1>
      <NotifikasiList />
    </div>
  );
}
