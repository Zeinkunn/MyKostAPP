import { PrismaClient, Role, StatusKamar, StatusKontrak, StatusTagihan, DendaMode } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});


async function main() {
  console.log('🌱 Menjalankan seeding database MyKost...');

  const passwordHash = await bcrypt.hash('password123', 10);
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const currentPeriode = `${year}-${month}`;

  // 1. Create / Update Owner User
  const ownerUser = await prisma.user.upsert({
    where: { email: 'owner@mykost.com' },
    update: {
      password_hash: passwordHash,
      token_version: 0,
    },
    create: {
      nama: 'Bapak Hendra (Owner)',
      email: 'owner@mykost.com',
      password_hash: passwordHash,
      role: Role.OWNER,
      token_version: 0,
    },
  });

  // 2. Create / Update Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@mykost.com' },
    update: {
      password_hash: passwordHash,
      token_version: 0,
    },
    create: {
      nama: 'Mbak Siti (Admin)',
      email: 'admin@mykost.com',
      password_hash: passwordHash,
      role: Role.ADMIN,
      token_version: 0,
    },
  });

  // 3. Create / Upsert Properti
  let properti = await prisma.properti.findFirst({
    where: { user_id: ownerUser.id, nama: 'Kost Cempaka Indah' },
  });

  if (!properti) {
    properti = await prisma.properti.create({
      data: {
        nama: 'Kost Cempaka Indah',
        alamat: 'Jl. Cempaka No. 12, Jakarta Selatan',
        user_id: ownerUser.id,
      },
    });
  }

  // 4. Upsert Kamar (using unique [properti_id, nomor_kamar])
  const kamar1 = await prisma.kamar.upsert({
    where: {
      properti_id_nomor_kamar: {
        properti_id: properti.id,
        nomor_kamar: '204',
      },
    },
    update: {
      tipe: 'Deluxe AC',
      harga_sewa: 1500000,
      fasilitas: 'AC, Kamar Mandi Dalam, Kasur Springbed, Lemari, WiFi',
      status: StatusKamar.TERISI,
    },
    create: {
      properti_id: properti.id,
      nomor_kamar: '204',
      tipe: 'Deluxe AC',
      harga_sewa: 1500000,
      status: StatusKamar.TERISI,
      fasilitas: 'AC, Kamar Mandi Dalam, Kasur Springbed, Lemari, WiFi',
    },
  });

  await prisma.kamar.upsert({
    where: {
      properti_id_nomor_kamar: {
        properti_id: properti.id,
        nomor_kamar: '205',
      },
    },
    update: {
      tipe: 'Standard Fan',
      harga_sewa: 1000000,
      fasilitas: 'Kipas Angin, Kasur, Lemari, WiFi',
      status: StatusKamar.KOSONG,
    },
    create: {
      properti_id: properti.id,
      nomor_kamar: '205',
      tipe: 'Standard Fan',
      harga_sewa: 1000000,
      status: StatusKamar.KOSONG,
      fasilitas: 'Kipas Angin, Kasur, Lemari, WiFi',
    },
  });

  // 5. Upsert Penghuni User & Penghuni Profile
  const penghuniUser = await prisma.user.upsert({
    where: { email: 'dimas@gmail.com' },
    update: {
      password_hash: passwordHash,
      token_version: 0,
    },
    create: {
      nama: 'Dimas Pratama',
      email: 'dimas@gmail.com',
      password_hash: passwordHash,
      role: Role.PENGHUNI,
      token_version: 0,
    },
  });

  const penghuni = await prisma.penghuni.upsert({
    where: { no_hp: '081234567890' },
    update: {
      user_id: penghuniUser.id,
      nama: 'Dimas Pratama',
      email: 'dimas@gmail.com',
    },
    create: {
      user_id: penghuniUser.id,
      nama: 'Dimas Pratama',
      no_ktp: '3171012345670001',
      no_hp: '081234567890',
      email: 'dimas@gmail.com',
    },
  });

  // 6. Create or reuse active Kontrak
  const startDate = new Date();
  startDate.setDate(1); // Mulai tanggal 1 bulan ini
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 6); // 6 bulan masa sewa

  let kontrak = await prisma.kontrak.findFirst({
    where: {
      kamar_id: kamar1.id,
      penghuni_id: penghuni.id,
      status: StatusKontrak.AKTIF,
    },
  });

  if (!kontrak) {
    kontrak = await prisma.kontrak.create({
      data: {
        kamar_id: kamar1.id,
        penghuni_id: penghuni.id,
        tanggal_mulai: startDate,
        tanggal_selesai: endDate,
        harga_sewa_disepakati: 1500000,
        deposit_awal: 1500000,
        status: StatusKontrak.AKTIF,
      },
    });
  }

  // 7. Upsert Tagihan Bulan Ini (using unique [kontrak_id, periode])
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7); // Jatuh tempo 7 hari ke depan secara dinamis

  await prisma.tagihan.upsert({
    where: {
      kontrak_id_periode: {
        kontrak_id: kontrak.id,
        periode: currentPeriode,
      },
    },
    update: {
      jumlah: 1500000,
      jatuh_tempo: dueDate,
      status: StatusTagihan.BELUM_BAYAR,
    },
    create: {
      kontrak_id: kontrak.id,
      periode: currentPeriode,
      jumlah: 1500000,
      denda: 0,
      jatuh_tempo: dueDate,
      status: StatusTagihan.BELUM_BAYAR,
    },
  });

  // 8. Upsert Default System Settings
  await prisma.pengaturan.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      harga_default: 1500000,
      denda_per_hari: 50000,
      denda_mode: DendaMode.HARIAN,
      batas_reminder_hari: 3,
      wa_template:
        'Halo Sdr/i {NAMA}, Tagihan sewa kamar {KAMAR} periode {PERIODE} sebesar {JUMLAH} akan jatuh tempo pada {JATUH_TEMPO}.',
    },
  });

  console.log('✅ Seeding database berhasil (idempotent, password bcrypt terenkripsi, tanggal dinamis).');
}

main()
  .catch((e) => {
    console.error('❌ Gagal seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
