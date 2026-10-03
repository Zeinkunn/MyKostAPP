import { requireRole } from '@/lib/rbac';
import { Role } from '@prisma/client';

export default async function OwnerUsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole([Role.OWNER]);
  return <>{children}</>;
}
