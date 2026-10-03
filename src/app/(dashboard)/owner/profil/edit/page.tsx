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
      no_hp: true,
    },
  });

  if (!user) {
    notFound();
  }

  return (
    <EditProfileForm
      initialNama={user.nama}
      initialEmail={user.email}
      initialNoHp={user.no_hp}
      backHref="/owner/profil"
      title="Edit Profil Pengelola"
      successRedirectHref="/owner/profil"
      showPhoneInput={true}
    />
  );
}
