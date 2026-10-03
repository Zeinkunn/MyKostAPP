import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoleApi } from '@/lib/rbac';
import { Role, StatusTagihan, StatusVerifikasi } from '@prisma/client';
import { logAktivitas } from '@/lib/log';
import { createNotifikasi } from '@/lib/notifikasi';
import { formatRupiah } from '@/lib/utils';
import { handleApiError } from '@/lib/errors';
import { z } from 'zod';

const cashPaymentSchema = z.object({
  tagihan_id: z.string().trim().min(1, 'ID tagihan wajib disertakan'),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireRoleApi([Role.OWNER, Role.ADMIN]);
    const body = await req.json();

    const parseResult = cashPaymentSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0]?.message || 'Input tidak valid' },
        { status: 400 }
      );
    }

    const { tagihan_id } = parseResult.data;

    const tagihan = await prisma.tagihan.findUnique({
      where: { id: tagihan_id },
      include: {
        kontrak: {
          include: {
            kamar: true,
            penghuni: true,
          },
        },
      },
    });

    if (!tagihan) {
      return NextResponse.json({ error: 'Tagihan tidak ditemukan' }, { status: 404 });
    }

    if (tagihan.status === StatusTagihan.LUNAS) {
      return NextResponse.json(
        { error: 'Tagihan ini sudah berstatus LUNAS' },
        { status: 400 }
      );
    }

    const totalBayar = Number(tagihan.jumlah) + Number(tagihan.denda);
    const now = new Date();

    // Atomic transaction: create verified cash payment and set bill to LUNAS
    const result = await prisma.$transaction(async (tx) => {
      const pembayaran = await tx.pembayaran.create({
        data: {
          tagihan_id: tagihan.id,
          jumlah_dibayar: totalBayar,
          metode: 'CASH',
          bukti_url: 'CASH',
          status_verifikasi: StatusVerifikasi.DISETUJUI,
          diverifikasi_oleh: session.id,
          diverifikasi_at: now,
          tanggal_bayar: now,
        },
      });

      const updatedTagihan = await tx.tagihan.update({
        where: { id: tagihan.id },
        data: {
          status: StatusTagihan.LUNAS,
        },
      });

      return { pembayaran, updatedTagihan };
    });

    const kamarNomor = tagihan.kontrak.kamar.nomor_kamar;
    const penghuniNama = tagihan.kontrak.penghuni.nama;

    // Audit log
    await logAktivitas(
      session.id,
      'catat_pembayaran_tunai',
      `Mencatat pembayaran TUNAI sewa Kamar ${kamarNomor} (${penghuniNama}) periode ${tagihan.periode} sebesar ${formatRupiah(totalBayar)}`
    );

    // In-app notification to tenant if registered
    if (tagihan.kontrak.penghuni.user_id) {
      await createNotifikasi({
        user_id: tagihan.kontrak.penghuni.user_id,
        judul: 'Pembayaran Tunai Diterima',
        pesan: `Pembayaran tunai Anda untuk sewa Kamar ${kamarNomor} periode ${tagihan.periode} sebesar ${formatRupiah(totalBayar)} telah diterima dan dinyatakan Lunas.`,
        tipe: 'PEMBAYARAN',
      });
    }

    return NextResponse.json({
      success: true,
      message: `Pembayaran tunai Kamar ${kamarNomor} sebesar ${formatRupiah(totalBayar)} berhasil dicatat & Lunas`,
      data: result,
    });
  } catch (error: any) {
    return handleApiError(error, 'Gagal mencatat pembayaran tunai');
  }
}
