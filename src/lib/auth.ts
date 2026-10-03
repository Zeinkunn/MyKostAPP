import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { Role } from '@prisma/client';
import { prisma } from './prisma';

const PLACEHOLDER_SECRET = 'GANTI_DENGAN_HASIL_openssl_rand_-hex_32';
const rawSecret = process.env.JWT_SECRET;
if (
  !rawSecret ||
  rawSecret.length < 32 ||
  rawSecret === PLACEHOLDER_SECRET ||
  rawSecret === 'super-secret-jwt-key-change-in-production-123456'
) {
  throw new Error(
    'JWT_SECRET wajib di-set di environment variable, minimal 32 karakter, dan bukan placeholder default. ' +
    'Generate dengan: openssl rand -hex 32'
  );
}
const JWT_SECRET = new TextEncoder().encode(rawSecret);

const COOKIE_NAME = 'mykost_session';

export interface UserSessionPayload {
  id: string;
  nama: string;
  email: string;
  role: Role;
  penghuni_id?: string;
  kamar_id?: string;
  token_version?: number;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signSessionToken(payload: UserSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<UserSessionPayload | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as unknown as UserSessionPayload;
  } catch (error) {
    return null;
  }
}

export async function setSessionCookie(payload: UserSessionPayload) {
  const token = await signSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentSession(): Promise<UserSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (!session) return null;

  // Validate token_version against database: if token_version doesn't match, session was revoked
  if (typeof session.token_version === 'number') {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.id },
        select: { token_version: true },
      });

      if (!user || user.token_version !== session.token_version) {
        return null; // Session has been revoked by password change/reset
      }
    } catch {
      // In case of transient DB lookup error, verifySessionToken already validated signature
    }
  }

  return session;
}
