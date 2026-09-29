import { PrismaClient, Role, StatusKamar, StatusKontrak, StatusTagihan } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial database...');

  // Hash default password
  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create Owner User
  const ownerUser = await prisma.user.upsert({
    where: { email: 'owner@mykost.com' },
    update: {},
    create: {
      nama: 'Bapak Hendra (Owner)',
      email: 'owner@mykost.com',
      password_hash: passwordHash,
      role: Role.OWNER,
    },
  });

  // 2. Create Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@mykost.com' },
    update: {},
    create: {
      nama: 'Mbak Siti (Admin)',
      email: 'admin@mykost.com',
      password_hash: passwordHash,
      role: Role.ADMIN,
    },
  });

  // 3. Create Properti
  const properti = await prisma.properti.create({
    data: {
      nama: 'Kost Cempaka Indah',
      alamat: 'Jl. Cempaka No. 12, Jakarta Selatan',
      user_id: ownerUser.id,
    },
  });

  // 4. Create Kamar
  const kamar1 = await prisma.kamar.create({
    data: {
      properti_id: properti.id,
      nomor_kamar: '204',
      tipe: 'Deluxe AC',
      harga_sewa: 1500000,
      status: StatusKamar.TERISI,
      fasilitas: 'AC, Kamar Mandi Dalam, Kasur Springbed, Lemari, WiFi',
    },
  });

  const kamar2 = await prisma.kamar.create({
    data: {
      properti_id: properti.id,
      nomor_kamar: '205',
      tipe: 'Standard Fan',
      harga_sewa: 1000000,
      status: StatusKamar.KOSONG,
      fasilitas: 'Kipas Angin, Kasur, Lemari, WiFi',
    },
  });

  // 5. Create Penghuni with Phone Number
  const penghuniUser = await prisma.user.upsert({
    where: { email: 'dimas@gmail.com' },
    update: {},
    create: {
      nama: 'Dimas Pratama',
      email: 'dimas@gmail.com',
      password_hash: passwordHash,
      role: Role.PENGHUNI,
    },
  });

  const penghuni = await prisma.penghuni.create({
    data: {
      user_id: penghuniUser.id,
      nama: 'Dimas Pratama',
      no_ktp: '3171012345670001',
      no_hp: '081234567890',
      email: 'dimas@gmail.com',
    },
  });

  // 6. Create Kontrak
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 6);

  const kontrak = await prisma.kontrak.create({
    data: {
      kamar_id: kamar1.id,
      penghuni_id: penghuni.id,
      tanggal_mulai: startDate,
      tanggal_selesai: endDate,
      harga_sewa_disepakati: 1500000,
      status: StatusKontrak.AKTIF,
    },
  });

  // 7. Create Tagihan Bulan Ini
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);

  await prisma.tagihan.create({
    data: {
      kontrak_id: kontrak.id,
      periode: '2026-10',
      jumlah: 1500000,
      denda: 0,
      jatuh_tempo: dueDate,
      status: StatusTagihan.BELUM_BAYAR,
    },
  });

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
