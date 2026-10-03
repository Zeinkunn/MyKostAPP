import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Memulai pengecekan duplikasi data di database...\n');

  // 1. Check duplicate [kontrak_id, periode] on Tagihan
  console.log('--- 1. Memeriksa Tagihan ([kontrak_id, periode]) ---');
  const tagihanDuplicates: any[] = await prisma.$queryRaw`
    SELECT "kontrak_id", "periode", COUNT(*)::int as count
    FROM "Tagihan"
    GROUP BY "kontrak_id", "periode"
    HAVING COUNT(*) > 1;
  `;

  if (tagihanDuplicates.length > 0) {
    console.warn(`⚠️ DITEMUKAN ${tagihanDuplicates.length} duplikasi Tagihan:`);
    for (const dup of tagihanDuplicates) {
      console.warn(`  - Kontrak ID: ${dup.kontrak_id}, Periode: ${dup.periode} (${dup.count} baris)`);
      const details = await prisma.tagihan.findMany({
        where: { kontrak_id: dup.kontrak_id, periode: dup.periode },
        select: { id: true, jumlah: true, status: true, created_at: true },
      });
      console.warn('    Detail records:', details);
    }
  } else {
    console.log('✅ Tagihan: Tidak ada duplikasi pada (kontrak_id, periode).');
  }

  // 2. Check duplicate [properti_id, nomor_kamar] on Kamar
  console.log('\n--- 2. Memeriksa Kamar ([properti_id, nomor_kamar]) ---');
  const kamarDuplicates: any[] = await prisma.$queryRaw`
    SELECT "properti_id", "nomor_kamar", COUNT(*)::int as count
    FROM "Kamar"
    GROUP BY "properti_id", "nomor_kamar"
    HAVING COUNT(*) > 1;
  `;

  if (kamarDuplicates.length > 0) {
    console.warn(`⚠️ DITEMUKAN ${kamarDuplicates.length} duplikasi Kamar:`);
    for (const dup of kamarDuplicates) {
      console.warn(`  - Properti ID: ${dup.properti_id}, Nomor Kamar: ${dup.nomor_kamar} (${dup.count} baris)`);
      const details = await prisma.kamar.findMany({
        where: { properti_id: dup.properti_id, nomor_kamar: dup.nomor_kamar },
        select: { id: true, tipe: true, status: true },
      });
      console.warn('    Detail records:', details);
    }
  } else {
    console.log('✅ Kamar: Tidak ada duplikasi pada (properti_id, nomor_kamar).');
  }

  console.log('\n======================================================');
  if (tagihanDuplicates.length === 0 && kamarDuplicates.length === 0) {
    console.log('🎉 HASIL: Basis data bersih. Aman untuk menerapkan unique constraints!');
  } else {
    console.log('⚠️ HASIL: Ditemukan duplikasi yang harus diselesaikan sebelum migrasi.');
  }
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('Error saat memeriksa duplikasi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
