import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  if (session.role === 'PENGHUNI') {
    redirect('/penghuni/beranda');
  } else {
    redirect('/owner/dashboard');
  }
}
