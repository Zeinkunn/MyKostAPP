import { prisma } from './prisma';

export async function logAktivitas(userId: string, aksi: string, detail: string) {
  try {
    await prisma.logAktivitas.create({
      data: {
        user_id: userId,
        aksi,
        detail,
      },
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
