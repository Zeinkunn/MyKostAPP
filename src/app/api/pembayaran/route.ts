import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiAuthError, requireAuthApi, requireRoleApi } from '@/lib/rbac';
import { Role, StatusTagihan, StatusVerifikasi } from '@prisma/client';
import { uploadFile, deleteFile } from '@/lib/r2';
import { sendWhatsAppMessage } from '@/lib/fonnte';
import { createNotifikasi, createNotifikasiOwnerAdmin } from '@/lib/notifikasi';
import { logAktivitas } from '@/lib/log';
import { handleApiError } from '@/lib/errors';
import { z } from 'zod';

export async function GET() {
  try {
    await requireRoleApi([Role.OWNER, Role.ADMIN]);
    const listPembayaran = await prisma.pembayaran.findMany({
      include: {
        tagihan: {
          include: {
            kontrak: {
              include: {
                kamar: { select: { nomor_kamar: true, tipe: true } },
                penghuni: { select: { nama: true, no_hp: true } },
              },
            },
          },
        },
      },
      orderBy: { tanggal_bayar: 'desc' },
    });

    return NextResponse.json(listPembayaran);
  } catch (error: any) {
    return handleApiError(error, 'Gagal mengambil daftar pembayaran');
  }
}

const verifyPaymentSchema = z.object({
  id: z.string().min(1, 'ID Pembayaran wajib diisi'),
  status_verifikasi: z.enum([StatusVerifikasi.DISETUJUI, StatusVerifikasi.DITOLAK], {
    message: 'Status verifikasi harus DISETUJUI atau DITOLAK',
  }),
});

// Upload or replace proof of payment by Penghuni
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuthApi();
    const formData = await req.formData();

    const tagihan_id = (formData.get('tagihan_id') as string)?.trim();
    const metode = ((formData.get('metode') as string)?.trim()) || 'Transfer Bank';
    const file = formData.get('bukti') as File | null;

    if (!tagihan_id || !file) {
      return NextResponse.json(
        { error: 'ID Tagihan dan file Bukti Pembayaran wajib disertakan' },
        { status: 400 }
      );
    }

    const tagihan = await prisma.tagihan.findUnique({
      where: { id: tagihan_id },
      include: {
        kontrak: { include: { kamar: true, penghuni: true } },
        pembayaran: {
          where: { status_verifikasi: StatusVerifikasi.PENDING },
          orderBy: { tanggal_bayar: 'desc' },
        },
      },
    });

    if (!tagihan) {
      return NextResponse.json({ error: 'Tagihan tidak ditemukan' }, { status: 404 });
    }

    // Rule: Reject if bill is already paid
    if (tagihan.status === StatusTagihan.LUNAS) {
      return NextResponse.json(
        { error: 'Tagihan ini sudah berstatus LUNAS. Tidak dapat melakukan pembayaran ulang.' },
        { status: 400 }
      );
    }

    // IDOR Protection: Verify tenant owns this bill
    if (session.role === Role.PENGHUNI) {
      if (tagihan.kontrak.penghuni.user_id !== session.id) {
        throw new ApiAuthError('Anda tidak memiliki akses untuk membayar tagihan ini', 403);
      }
    }

    // Server-side calculation: Ignore client-supplied jumlah_dibayar.
    // Server computes exactly = jumlah tagihan + denda keterlambatan.
    const calculatedAmount = Number(tagihan.jumlah) + Number(tagihan.denda);

    // Upload to Cloudflare R2 (or local fallback in dev)
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const buktiUrl = await uploadFile(fileBuffer, file.name, file.type);

    const existingPending = tagihan.pembayaran[0];
    let pembayaran;

    if (existingPending) {
      // Replace existing PENDING payment proof instead of rejecting or creating duplicate rows
      pembayaran = await prisma.pembayaran.update({
        where: { id: existingPending.id },
        data: {
          jumlah_dibayar: calculatedAmount,
          metode,
          bukti_url: buktiUrl,
          tanggal_bayar: new Date(),
        },
      });

      if (existingPending.bukti_url && existingPending.bukti_url !== 'CASH') {
        await deleteFile(existingPending.bukti_url);
      }
    } else {
      pembayaran = await prisma.pembayaran.create({
        data: {
          tagihan_id,
          jumlah_dibayar: calculatedAmount,
          metode,
          bukti_url: buktiUrl,
          status_verifikasi: StatusVerifikasi.PENDING,
        },
      });
    }

    // Send In-App Notification to Owner/Admin
    await createNotifikasiOwnerAdmin({
      judul: existingPending ? 'Bukti Pembayaran Diperbarui' : 'Pembayaran Baru Perlu Verifikasi',
      pesan: `Penghuni ${tagihan.kontrak.penghuni.nama} (Kamar ${tagihan.kontrak.kamar.nomor_kamar}) telah ${existingPending ? 'memperbarui' : 'mengunggah'} bukti pembayaran periode ${tagihan.periode}.`,
      tipe: 'PEMBAYARAN',
    });

    return NextResponse.json(pembayaran, { status: existingPending ? 200 : 201 });
  } catch (error: any) {
    return handleApiError(error, 'Gagal mengirim bukti pembayaran');
  }
}

// Verification by Admin (Approve / Reject)
export async function PUT(req: NextRequest) {
  try {
    const session = await requireRoleApi([Role.OWNER, Role.ADMIN]);
    const body = await req.json();

    const parseResult = verifyPaymentSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((e) => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { id, status_verifikasi } = parseResult.data;

    // Rule: Fetch current payment to ensure it is currently PENDING
    const existingPembayaran = await prisma.pembayaran.findUnique({
      where: { id },
      include: {
        tagihan: {
          include: {
            kontrak: {
              include: {
                penghuni: true,
                kamar: true,
              },
            },
          },
        },
      },
    });

    if (!existingPembayaran) {
      return NextResponse.json({ error: 'Data pembayaran tidak ditemukan' }, { status: 404 });
    }

    if (existingPembayaran.status_verifikasi !== StatusVerifikasi.PENDING) {
      return NextResponse.json(
        {
          error: `Pembayaran ini sudah pernah diproses sebelumnya (status saat ini: ${existingPembayaran.status_verifikasi}).`,
        },
        { status: 409 }
      );
    }

    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const pembayaran = await tx.pembayaran.update({
        where: { id },
        data: {
          status_verifikasi,
          diverifikasi_oleh: session.id,
          diverifikasi_at: now,
        },
      });

      if (status_verifikasi === StatusVerifikasi.DISETUJUI) {
        await tx.tagihan.update({
          where: { id: existingPembayaran.tagihan_id },
          data: { status: StatusTagihan.LUNAS },
        });
      }
      // If DITOLAK, tagihan status remains unchanged (BELUM_BAYAR / TERLAMBAT)

      return pembayaran;
    });

    // Send notifications strictly after transaction commits
    const phone = existingPembayaran.tagihan.kontrak.penghuni.no_hp;
    const nama = existingPembayaran.tagihan.kontrak.penghuni.nama;
    const nomorKamar = existingPembayaran.tagihan.kontrak.kamar.nomor_kamar;
    const periode = existingPembayaran.tagihan.periode;
    const statusText = status_verifikasi === StatusVerifikasi.DISETUJUI ? 'LUNAS & DISETUJUI' : 'DITOLAK';

    const waMsg = `Halo Sdr/i ${nama},\n\nStatus pembayaran tagihan kamar ${nomorKamar} periode ${periode} telah: *${statusText}*.\n\nTerima kasih,\nMyKost Management`;
    await sendWhatsAppMessage({ target: phone, message: waMsg });

    if (existingPembayaran.tagihan.kontrak.penghuni.user_id) {
      await createNotifikasi({
        user_id: existingPembayaran.tagihan.kontrak.penghuni.user_id,
        judul: `Pembayaran ${statusText}`,
        pesan: `Pembayaran Anda untuk periode ${periode} telah ${statusText.toLowerCase()} oleh pengelola kost.`,
        tipe: 'PEMBAYARAN',
      });
    }

    // Audit Log
    await logAktivitas(
      session.id,
      'verifikasi_pembayaran',
      `Verifikasi pembayaran (${statusText}) periode ${periode} untuk Kamar ${nomorKamar} (${nama})`
    );

    return NextResponse.json({
      success: true,
      message: `Pembayaran berhasil diubah menjadi ${status_verifikasi}`,
      result,
    });
  } catch (error: any) {
    return handleApiError(error, 'Gagal memverifikasi pembayaran');
  }
}
