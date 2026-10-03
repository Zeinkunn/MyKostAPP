import { requireRole } from '@/lib/rbac';
import { Role } from '@prisma/client';

export default async function PenghuniLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole([Role.PENGHUNI]);
  return <>{children}</>;
}
