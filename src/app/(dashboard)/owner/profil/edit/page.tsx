import { requireAuth } from '@/lib/rbac';
import EditProfileForm from '@/components/profile/EditProfileForm';

export default async function EditProfilOwnerPage() {
  const session = await requireAuth();

  return (
    <EditProfileForm
      initialNama={session.nama}
      initialEmail={session.email}
      backHref="/owner/profil"
      title="Edit Profil Pengelola"
      successRedirectHref="/owner/profil"
    />
  );
}
