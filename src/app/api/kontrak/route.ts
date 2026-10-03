import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiAuthError, requireRoleApi } from '@/lib/rbac';
import { Role, StatusKamar, StatusKontrak, StatusTagihan } from '@prisma/client';
import { sendWhatsAppMessage } from '@/lib/fonnte';
import { logAktivitas } from '@/lib/log';

export async function GET() {
  try {
    await requireRoleApi([Role.OWNER, Role.ADMIN]);
    const listKontrak = await prisma.kontrak.findMany({
      include: {
        kamar: { select: { nomor_kamar: true, tipe: true, harga_sewa: true } },
        penghuni: { select: { nama: true, no_hp: true, email: true } },
        tagihan: { orderBy: { created_at: 'desc' }, take: 1 },
      },
      orderBy: { tanggal_mulai: 'desc' },
    });

    return NextResponse.json(listKontrak);
  } catch (error: any) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 });
  }
}

import { z } from 'zod';

const createKontrakSchema = z
  .object({
    kamar_id: z.string().min(1, 'ID Kamar wajib diisi'),
    penghuni_id: z.string().min(1, 'ID Penghuni wajib diisi'),
    tanggal_mulai: z.string().refine((val) => !isNaN(Date.parse(val)), 'Tanggal mulai tidak valid'),
    tanggal_selesai: z.string().refine((val) => !isNaN(Date.parse(val)), 'Tanggal selesai tidak valid'),
    harga_sewa_disepakati: z.coerce.number().positive('Harga sewa harus lebih dari 0'),
    deposit_awal: z.coerce.number().min(0, 'Deposit tidak boleh bernilai negatif').optional().nullable(),
    dokumen_url: z.string().optional().nullable(),
  })
  .refine(
    (data) => new Date(data.tanggal_selesai) > new Date(data.tanggal_mulai),
    { message: 'Tanggal selesai harus setelah tanggal mulai', path: ['tanggal_selesai'] }
  );

export async function POST(req: NextRequest) {
  try {
    const session = await requireRoleApi([Role.OWNER, Role.ADMIN]);
    const body = await req.json();

    const parseResult = createKontrakSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const {
      kamar_id,
      penghuni_id,
      tanggal_mulai,
      tanggal_selesai,
      harga_sewa_disepakati,
      deposit_awal,
      dokumen_url,
    } = parseResult.data;

    const startDate = new Date(tanggal_mulai);
    const endDate = new Date(tanggal_selesai);

    // Business Rule Steps:
    // Transaction to verify room & tenant, create Kontrak, update Kamar to TERISI, & generate first Tagihan
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check if Penghuni exists and has no other active contracts
      const targetPenghuni = await tx.penghuni.findUnique({
        where: { id: penghuni_id },
        include: {
          kontrak: {
            where: { status: StatusKontrak.AKTIF },
          },
        },
      });

      if (!targetPenghuni) {
        throw new Error('Data penghuni tidak ditemukan');
      }

      if (targetPenghuni.kontrak.length > 0) {
        throw new Error(
          `Penghuni ${targetPenghuni.nama} masih memiliki kontrak sewa AKTIF. Selesaikan kontrak lama terlebih dahulu.`
        );
      }

      // 2. Check if room is KOSONG before booking
      const targetKamar = await tx.kamar.findUnique({
        where: { id: kamar_id },
      });

      if (!targetKamar) {
        throw new Error('Kamar tidak ditemukan');
      }

      if (targetKamar.status !== StatusKamar.KOSONG) {
        throw new Error(
          `Kamar ${targetKamar.nomor_kamar} sedang tidak tersedia (status: ${targetKamar.status}), tidak bisa membuat kontrak baru.`
        );
      }

      // 3. Create Kontrak
      const kontrak = await tx.kontrak.create({
        data: {
          kamar_id,
          penghuni_id,
          tanggal_mulai: startDate,
          tanggal_selesai: endDate,
          harga_sewa_disepakati,
          deposit_awal: deposit_awal ?? null,
          status: StatusKontrak.AKTIF,
          dokumen_url: dokumen_url ?? null,
        },
        include: {
          kamar: true,
          penghuni: true,
        },
      });

      // 4. Update Kamar status to TERISI atomically to prevent race condition
      const kamarUpdate = await tx.kamar.updateMany({
        where: { id: kamar_id, status: StatusKamar.KOSONG },
        data: { status: StatusKamar.TERISI },
      });

      if (kamarUpdate.count === 0) {
        const conflictErr = new Error('Kamar baru saja dipesan oleh transaksi lain');
        (conflictErr as any).status = 409;
        throw conflictErr;
      }


      // 5. Generate First Tagihan automatically
      const year = startDate.getFullYear();
      const month = String(startDate.getMonth() + 1).padStart(2, '0');
      const periode = `${year}-${month}`;

      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + 7); // 7 days from start

      const tagihan = await tx.tagihan.create({
        data: {
          kontrak_id: kontrak.id,
          periode,
          jumlah: harga_sewa_disepakati,
          denda: 0,
          jatuh_tempo: dueDate,
          status: StatusTagihan.BELUM_BAYAR,
        },
      });

      return { kontrak, tagihan };
    });

    // Send WhatsApp activation message to Penghuni
    const phone = result.kontrak.penghuni.no_hp;
    const namaPenghuni = result.kontrak.penghuni.nama;
    const nomorKamar = result.kontrak.kamar.nomor_kamar;

    let activationLinkMsg = '';
    if (!result.kontrak.penghuni.user_id) {
      const { createAktivasiToken } = await import('@/lib/token');
      const aktivasiToken = await createAktivasiToken(result.kontrak.penghuni.id, 'AKTIVASI', 7);
      activationLinkMsg = `\n\nSilakan klik tautan berikut untuk aktivasi akun & mengatur kata sandi Anda:\n/login?aktivasi=${aktivasiToken}\n*(Tautan berlaku selama 7 hari)*`;
    }

    const waMessage = `Halo Sdr/i ${namaPenghuni},\n\nKontrak sewa Anda untuk *Kamar ${nomorKamar}* telah aktif!${activationLinkMsg}\n\nTerima kasih,\nPengelola MyKost`;

    await sendWhatsAppMessage({
      target: phone,
      message: waMessage,
    });

    // Audit Log
    await logAktivitas(
      session.id,
      'buat_kontrak',
      `Membuat kontrak sewa baru untuk ${namaPenghuni} di Kamar ${nomorKamar}`
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error?.status === 409 || error.message?.includes('Kamar baru saja dipesan')) {
      return NextResponse.json(
        { error: 'Kamar baru saja dipesan oleh transaksi lain' },
        { status: 409 }
      );
    }
    const isValidationError =

      error.message?.includes('Kamar ini sedang tidak tersedia') ||
      error.message?.includes('sedang tidak tersedia') ||
      error.message?.includes('Kamar tidak ditemukan') ||
      error.message?.includes('Data penghuni tidak ditemukan') ||
      error.message?.includes('masih memiliki kontrak sewa AKTIF');

    if (isValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Create kontrak error:', error);
    return NextResponse.json({ error: error.message || 'Gagal membuat kontrak sewa' }, { status: 500 });
  }
}
