import { requireRole } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import EditProfileForm from '@/components/profile/EditProfileForm';

export default async function EditProfilOwnerPage() {
  const sessionUser = await requireRole([Role.OWNER, Role.ADMIN]);

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      nama: true,
      email: true,
    },
  });

  if (!user) {
    notFound();
  }

  return (
    <EditProfileForm
      initialNama={user.nama}
      initialEmail={user.email}
      backHref="/owner/profil"
      title="Edit Profil Pengelola"
      successRedirectHref="/owner/profil"
    />
  );
}
