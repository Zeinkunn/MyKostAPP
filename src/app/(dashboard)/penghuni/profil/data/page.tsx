import { requireRole } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import TenantDataForm from '@/components/profile/TenantDataForm';

export default async function PenghuniProfilDataPage() {
  const sessionUser = await requireRole([Role.PENGHUNI]);

  const [user, penghuni] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { nama: true, email: true },
    }),
    prisma.penghuni.findUnique({
      where: { user_id: sessionUser.id },
      select: {
        nama: true,
        email: true,
        no_hp: true,
        no_ktp: true,
        kontak_darurat_nama: true,
        kontak_darurat_hp: true,
      },
    }),
  ]);

  if (!user) {
    notFound();
  }

  return (
    <TenantDataForm
      initialNama={user.nama}
      initialEmail={user.email}
      noHp={penghuni?.no_hp || ''}
      noKtp={penghuni?.no_ktp || ''}
      initialKontakDaruratNama={penghuni?.kontak_darurat_nama}
      initialKontakDaruratHp={penghuni?.kontak_darurat_hp}
    />
  );
}
