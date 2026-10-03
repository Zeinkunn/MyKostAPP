import crypto from 'crypto';
import { prisma } from './prisma';

export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export async function createAktivasiToken(
  penghuni_id: string,
  tipe: 'AKTIVASI' | 'RESET_PASSWORD' = 'AKTIVASI',
  daysValid = 7
): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000);

  // Invalidate previous unused tokens of same type for this tenant
  await prisma.aktivasiToken.updateMany({
    where: {
      penghuni_id,
      tipe,
      used_at: null,
    },
    data: {
      used_at: new Date(),
    },
  });

  await prisma.aktivasiToken.create({
    data: {
      penghuni_id,
      token_hash: tokenHash,
      tipe,
      expires_at: expiresAt,
    },
  });

  return rawToken;
}
