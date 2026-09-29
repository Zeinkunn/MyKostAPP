import { getCurrentSession, UserSessionPayload } from './auth';
import { Role } from '@prisma/client';
import { redirect } from 'next/navigation';

export class ApiAuthError extends Error {
  status: number;
  constructor(message: string, status: number = 401) {
    super(message);
    this.name = 'ApiAuthError';
    this.status = status;
  }
}

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

export async function requireAuthApi(): Promise<UserSessionPayload> {
  const session = await getCurrentSession();
  if (!session) {
    throw new ApiAuthError('Unauthorized: Silakan login terlebih dahulu', 401);
  }
  return session;
}

export async function requireRoleApi(allowedRoles: Role[]): Promise<UserSessionPayload> {
  const session = await requireAuthApi();
  if (!allowedRoles.includes(session.role)) {
    throw new ApiAuthError('Forbidden: Anda tidak memiliki akses ke resource ini', 403);
  }
  return session;
}

