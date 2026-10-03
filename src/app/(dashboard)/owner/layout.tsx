import { requireRole } from '@/lib/rbac';
import { Role } from '@prisma/client';

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole([Role.OWNER, Role.ADMIN]);
  return <>{children}</>;
}
