import { requireAuth } from '@/lib/rbac';
import EditProfileForm from '@/components/profile/EditProfileForm';

export default async function EditProfilPenghuniPage() {
  const session = await requireAuth();

  return (
    <EditProfileForm
      initialNama={session.nama}
      initialEmail={session.email}
      backHref="/penghuni/profil"
      title="Edit Profil"
      successRedirectHref="/penghuni/profil"
    />
  );
}
