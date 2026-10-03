import { requireRole } from '@/lib/rbac';
import { Role } from '@prisma/client';

export default async function OwnerLogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole([Role.OWNER]);
  return <>{children}</>;
}
