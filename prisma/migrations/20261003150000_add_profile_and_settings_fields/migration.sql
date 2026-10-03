-- AlterTable User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "foto_url" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "no_hp" TEXT;

-- AlterTable Kamar
ALTER TABLE "Kamar" ADD COLUMN IF NOT EXISTS "lantai" INTEGER;

-- AlterTable Penghuni
ALTER TABLE "Penghuni" ADD COLUMN IF NOT EXISTS "kontak_darurat_nama" TEXT;
ALTER TABLE "Penghuni" ADD COLUMN IF NOT EXISTS "kontak_darurat_hp" TEXT;

-- AlterTable Pengaturan
ALTER TABLE "Pengaturan" ADD COLUMN IF NOT EXISTS "bank_nama" TEXT;
ALTER TABLE "Pengaturan" ADD COLUMN IF NOT EXISTS "bank_no_rekening" TEXT;
ALTER TABLE "Pengaturan" ADD COLUMN IF NOT EXISTS "bank_atas_nama" TEXT;
ALTER TABLE "Pengaturan" ADD COLUMN IF NOT EXISTS "kontak_pengelola_wa" TEXT;
