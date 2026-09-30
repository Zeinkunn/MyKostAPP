import { prisma } from '@/lib/prisma';
import { StatusTagihan } from '@prisma/client';
import { createNotifikasi } from '@/lib/notifikasi';

export async function generateMonthlyBills() {
  const activeContracts = await prisma.kontrak.findMany({
    where: { status: 'AKTIF' },
    include: {
      penghuni: { select: { user_id: true } },
      kamar: { select: { nomor_kamar: true } },
    },
  });

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const periode = `${year}-${month}`;

  let generatedCount = 0;

  for (const kontrak of activeContracts) {
    // Check if tagihan for this period already exists
    const existing = await prisma.tagihan.findFirst({
      where: {
        kontrak_id: kontrak.id,
        periode,
      },
    });

    if (!existing) {
      const dueDate = new Date(year, now.getMonth(), 10); // Default due date 10th of month

      await prisma.tagihan.create({
        data: {
          kontrak_id: kontrak.id,
          periode,
          jumlah: kontrak.harga_sewa_disepakati,
          denda: 0,
          jatuh_tempo: dueDate,
          status: StatusTagihan.BELUM_BAYAR,
        },
      });
      generatedCount++;

      // Send in-app notification if user is linked
      if (kontrak.penghuni.user_id) {
        await createNotifikasi({
          user_id: kontrak.penghuni.user_id,
          judul: 'Tagihan Sewa Baru',
          pesan: `Tagihan sewa Kamar ${kontrak.kamar.nomor_kamar} periode ${periode} telah terbit.`,
          tipe: 'TAGIHAN',
        });
      }
    }
  }

  return {
    generatedCount,
    periode,
  };
}
