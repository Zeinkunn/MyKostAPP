import { prisma } from '@/lib/prisma';
import { StatusTagihan } from '@prisma/client';

export function getJakartaDateParts(date: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const formatted = formatter.format(date);
  const [year, month, day] = formatted.split('-').map(Number);
  return { year, month, day, dateStr: formatted };
}

export function getBillingMonthBoundaries(referenceDate: Date = new Date()) {
  const { year, month } = getJakartaDateParts(referenceDate);
  const monthStr = String(month).padStart(2, '0');
  const periode = `${year}-${monthStr}`;

  // Use UTC timestamps aligned with Asia/Jakarta month boundaries
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  // Default due date on the 10th of the month
  const dueDate = new Date(Date.UTC(year, month - 1, 10, 16, 59, 59, 999));

  return { year, month, periode, startOfMonth, endOfMonth, dueDate };
}

export function isContractEligibleForPeriod(
  kontrak: { status: string; tanggal_mulai: Date; tanggal_selesai: Date },
  startOfMonth: Date,
  endOfMonth: Date
): boolean {
  return (
    kontrak.status === 'AKTIF' &&
    kontrak.tanggal_mulai.getTime() <= endOfMonth.getTime() &&
    kontrak.tanggal_selesai.getTime() >= startOfMonth.getTime()
  );
}

export async function generateMonthlyBills(referenceDate: Date = new Date()) {
  const { periode, startOfMonth, endOfMonth, dueDate } = getBillingMonthBoundaries(referenceDate);

  const [activeContracts, existingBills] = await Promise.all([
    prisma.kontrak.findMany({
      where: {
        status: 'AKTIF',
        tanggal_mulai: { lte: endOfMonth },
        tanggal_selesai: { gte: startOfMonth },
      },
      include: {
        penghuni: { select: { user_id: true } },
        kamar: { select: { nomor_kamar: true } },
      },
    }),
    prisma.tagihan.findMany({
      where: { periode },
      select: { kontrak_id: true },
    }),
  ]);

  const existingContractIds = new Set(existingBills.map((b) => b.kontrak_id));
  const contractsToBill = activeContracts.filter(
    (k) => !existingContractIds.has(k.id) && isContractEligibleForPeriod(k, startOfMonth, endOfMonth)
  );

  if (contractsToBill.length === 0) {
    return {
      generatedCount: 0,
      periode,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.tagihan.createMany({
      data: contractsToBill.map((kontrak) => ({
        kontrak_id: kontrak.id,
        periode,
        jumlah: kontrak.harga_sewa_disepakati,
        denda: 0,
        jatuh_tempo: dueDate,
        status: StatusTagihan.BELUM_BAYAR,
      })),
      skipDuplicates: true,
    });

    const notificationsToCreate = contractsToBill
      .filter((kontrak): kontrak is typeof kontrak & { penghuni: { user_id: string } } =>
        Boolean(kontrak.penghuni.user_id)
      )
      .map((kontrak) => ({
        user_id: kontrak.penghuni.user_id,
        judul: 'Tagihan Sewa Baru',
        pesan: `Tagihan sewa Kamar ${kontrak.kamar.nomor_kamar} periode ${periode} telah terbit.`,
        tipe: 'TAGIHAN',
      }));

    if (notificationsToCreate.length > 0) {
      await tx.notifikasi.createMany({
        data: notificationsToCreate,
      });
    }
  });

  return {
    generatedCount: contractsToBill.length,
    periode,
  };
}
