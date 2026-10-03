import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiAuthError, requireRoleApi } from '@/lib/rbac';
import { Role, StatusKamar, StatusKontrak, StatusTagihan } from '@prisma/client';
import { normalizePhone } from '@/lib/phone';
import { sendWhatsAppMessage } from '@/lib/fonnte';
import { logAktivitas } from '@/lib/log';
import { z } from 'zod';

const onboardingSchema = z
  .object({
    nama: z.string().trim().min(1, 'Nama wajib diisi'),
    no_ktp: z.string().trim().min(1, 'Nomor KTP wajib diisi'),
    no_hp: z.string().trim().min(8, 'Nomor HP minimal 8 digit'),
    email: z.string().trim().email('Format email tidak valid'),
    kamar_id: z.string().min(1, 'Kamar wajib dipilih'),
    tanggal_mulai: z.string().refine((val) => !isNaN(Date.parse(val)), 'Tanggal mulai tidak valid'),
    tanggal_selesai: z.string().refine((val) => !isNaN(Date.parse(val)), 'Tanggal selesai tidak valid'),
    harga_sewa_disepakati: z.coerce.number().positive('Harga sewa harus lebih dari 0'),
    deposit_awal: z.coerce.number().min(0, 'Deposit tidak boleh negatif').optional().nullable(),
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

    const parseResult = onboardingSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const {
      nama,
      no_ktp,
      no_hp,
      email,
      kamar_id,
      tanggal_mulai,
      tanggal_selesai,
      harga_sewa_disepakati,
      deposit_awal,
      dokumen_url,
    } = parseResult.data;

    const cleanPhone = normalizePhone(no_hp);
    const startDate = new Date(tanggal_mulai);
    const endDate = new Date(tanggal_selesai);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify Kamar exists and is KOSONG
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

      // 2. Find or reuse existing Penghuni by normalized phone
      let penghuni = await tx.penghuni.findUnique({
        where: { no_hp: cleanPhone },
        include: {
          kontrak: {
            where: { status: StatusKontrak.AKTIF },
          },
        },
      });

      if (penghuni) {
        // Prevent tenant with active contract from onboarding into another room concurrently
        if (penghuni.kontrak.length > 0) {
          throw new Error(
            `Penghuni ${penghuni.nama} (${penghuni.no_hp}) masih memiliki kontrak sewa AKTIF. Harap checkout kontrak lama terlebih dahulu.`
          );
        }

        // Reuse existing penghuni and update personal details
        penghuni = await tx.penghuni.update({
          where: { id: penghuni.id },
          data: {
            nama,
            no_ktp,
            email,
          },
          include: { kontrak: { where: { status: StatusKontrak.AKTIF } } },
        });
      } else {
        // Create brand new penghuni
        penghuni = await tx.penghuni.create({
          data: {
            nama,
            no_ktp,
            no_hp: cleanPhone,
            email,
          },
          include: { kontrak: { where: { status: StatusKontrak.AKTIF } } },
        });
      }

      // 3. Create Kontrak
      const kontrak = await tx.kontrak.create({
        data: {
          kamar_id,
          penghuni_id: penghuni.id,
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

      // 4. Update Kamar status to TERISI
      await tx.kamar.update({
        where: { id: kamar_id },
        data: { status: StatusKamar.TERISI },
      });

      // 5. Generate first invoice (Tagihan pertama)
      const year = startDate.getFullYear();
      const month = String(startDate.getMonth() + 1).padStart(2, '0');
      const periode = `${year}-${month}`;

      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + 7); // Due 7 days from start

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

      return { penghuni, kontrak, tagihan, kamar: targetKamar };
    });

    // 6. WhatsApp activation message (sent strictly after transaction commits successfully)
    const phone = result.penghuni.no_hp;
    const namaPenghuni = result.penghuni.nama;
    const nomorKamar = result.kamar.nomor_kamar;

    let activationLinkMsg = '';
    if (!result.penghuni.user_id) {
      const { createAktivasiToken } = await import('@/lib/token');
      const aktivasiToken = await createAktivasiToken(result.penghuni.id, 'AKTIVASI', 7);
      activationLinkMsg = `\n\nSilakan klik tautan berikut untuk aktivasi akun & mengatur kata sandi Anda:\n/login?aktivasi=${aktivasiToken}\n*(Tautan berlaku selama 7 hari)*`;
    }

    const waMessage = `Halo Sdr/i ${namaPenghuni},\n\nKontrak sewa Anda untuk *Kamar ${nomorKamar}* telah aktif!${activationLinkMsg}\n\nTerima kasih,\nPengelola MyKost`;

    await sendWhatsAppMessage({
      target: phone,
      message: waMessage,
    });

    // 7. Audit Log
    await logAktivitas(
      session.id,
      'onboarding_penghuni',
      `Onboarding sewa baru: ${namaPenghuni} di Kamar ${nomorKamar} (Kontrak ID: ${result.kontrak.id})`
    );

    return NextResponse.json(
      {
        success: true,
        message: `Berhasil mendaftarkan ${namaPenghuni} di Kamar ${nomorKamar}`,
        data: result,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const isClientError =
      error.message?.includes('Kamar tidak ditemukan') ||
      error.message?.includes('sedang tidak tersedia') ||
      error.message?.includes('masih memiliki kontrak sewa AKTIF');

    if (isClientError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Onboarding error:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memproses onboarding penghuni' },
      { status: 500 }
    );
  }
}
