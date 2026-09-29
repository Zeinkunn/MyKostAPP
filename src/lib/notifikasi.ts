import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function createNotifikasi(data: {
  user_id: string;
  judul: string;
  pesan: string;
  tipe?: string;
}) {
  try {
    return await prisma.notifikasi.create({
      data: {
        user_id: data.user_id,
        judul: data.judul,
        pesan: data.pesan,
        tipe: data.tipe || 'UMUM',
      },
    });
  } catch (err) {
    console.error('Error creating notification:', err);
  }
}

export async function createNotifikasiOwnerAdmin(data: {
  judul: string;
  pesan: string;
  tipe?: string;
}) {
  try {
    const ownersAndAdmins = await prisma.user.findMany({
      where: { role: { in: [Role.OWNER, Role.ADMIN] } },
      select: { id: true },
    });

    const notifications = ownersAndAdmins.map((user) => ({
      user_id: user.id,
      judul: data.judul,
      pesan: data.pesan,
      tipe: data.tipe || 'UMUM',
    }));

    if (notifications.length > 0) {
      await prisma.notifikasi.createMany({
        data: notifications,
      });
    }
  } catch (err) {
    console.error('Error creating notification for owners/admins:', err);
  }
}
