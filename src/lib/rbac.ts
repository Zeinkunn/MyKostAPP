import { getCurrentSession, UserSessionPayload } from './auth';
import { Role } from '@prisma/client';
import { redirect } from 'next/navigation';

export async function requireAuth(): Promise<UserSessionPayload> {
  const session = await getCurrentSession();
  if (!session) {
    redirect('/login');
  }
  return session;
}

export async function requireRole(allowedRoles: Role[]): Promise<UserSessionPayload> {
  const session = await requireAuth();
  if (!allowedRoles.includes(session.role)) {
    // Redirect to proper role dashboard
    if (session.role === Role.PENGHUNI) {
      redirect('/penghuni/beranda');
    } else {
      redirect('/owner/dashboard');
    }
  }
  return session;
}
