import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthApi, requireRoleApi } from '@/lib/rbac';
import { Role, StatusTagihan } from '@prisma/client';
import { generateMonthlyBills } from '@/lib/tagihan';
import { handleApiError } from '@/lib/errors';
import { logAktivitas } from '@/lib/log';
import { formatRupiah } from '@/lib/utils';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuthApi();
    const { searchParams } = new URL(req.url);
    const rawStatus = searchParams.get('status');

    let status: StatusTagihan | undefined;
    if (rawStatus && Object.values(StatusTagihan).includes(rawStatus as StatusTagihan)) {
      status = rawStatus as StatusTagihan;
    }

    if (session.role === Role.PENGHUNI) {
      // Fetch only bills for current Penghuni
      const listTagihan = await prisma.tagihan.findMany({
        where: {
          kontrak: {
            penghuni: { user_id: session.id },
          },
          ...(status && { status }),
        },
        include: {
          kontrak: {
            include: { kamar: { select: { nomor_kamar: true, tipe: true } } },
          },
          pembayaran: { orderBy: { tanggal_bayar: 'desc' } },
        },
        orderBy: { created_at: 'desc' },
      });
      return NextResponse.json(listTagihan);
    }

    // Owner / Admin fetch all
    const listTagihan = await prisma.tagihan.findMany({
      where: status ? { status } : {},
      include: {
        kontrak: {
          include: {
            kamar: { select: { nomor_kamar: true, tipe: true } },
            penghuni: { select: { nama: true, no_hp: true } },
          },
        },
        pembayaran: { orderBy: { tanggal_bayar: 'desc' } },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json(listTagihan);
  } catch (error: any) {
    return handleApiError(error, 'Gagal mengambil data tagihan');
  }
}

// Generate monthly bills for all active contracts (Cron / Manual trigger by admin)
export async function POST() {
  try {
    await requireRoleApi([Role.OWNER, Role.ADMIN]);

    const result = await generateMonthlyBills();

    return NextResponse.json({
      success: true,
      message: `Berhasil membuat ${result.generatedCount} tagihan baru periode ${result.periode}`,
      generatedCount: result.generatedCount,
    });
  } catch (error: any) {
    return handleApiError(error, 'Gagal generate tagihan');
  }
}

const penyesuaianSchema = z.object({
  tagihan_id: z.string().trim().min(1, 'ID tagihan wajib disertakan'),
  jumlah: z.number().min(0, 'Jumlah tagihan tidak boleh negatif').optional(),
  denda: z.number().min(0, 'Denda tidak boleh negatif').optional(),
  alasan: z.string().trim().min(3, 'Alasan penyesuaian wajib diisi (minimal 3 karakter)'),
});

// Sesuaikan Tagihan (koreksi jumlah / denda) with mandatory audit logging
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireRoleApi([Role.OWNER, Role.ADMIN]);
    const body = await req.json();

    const parseResult = penyesuaianSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { tagihan_id, jumlah, denda, alasan } = parseResult.data;

    if (jumlah === undefined && denda === undefined) {
      return NextResponse.json(
        { error: 'Setidaknya salah satu dari jumlah atau denda harus diubah' },
        { status: 400 }
      );
    }

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
        { error: 'Tagihan yang sudah LUNAS tidak dapat disesuaikan kembali' },
        { status: 400 }
      );
    }

    const oldJumlah = Number(tagihan.jumlah);
    const oldDenda = Number(tagihan.denda);
    const newJumlah = jumlah !== undefined ? jumlah : oldJumlah;
    const newDenda = denda !== undefined ? denda : oldDenda;

    const updatedTagihan = await prisma.tagihan.update({
      where: { id: tagihan_id },
      data: {
        ...(jumlah !== undefined && { jumlah: newJumlah }),
        ...(denda !== undefined && { denda: newDenda }),
      },
    });

    // Mandatory Audit Logging
    await logAktivitas(
      session.id,
      'sesuaikan_tagihan',
      `Penyesuaian tagihan Kamar ${tagihan.kontrak.kamar.nomor_kamar} (${tagihan.kontrak.penghuni.nama}) periode ${tagihan.periode}. Sebelum: [Pokok: ${formatRupiah(oldJumlah)}, Denda: ${formatRupiah(oldDenda)}]. Sesudah: [Pokok: ${formatRupiah(newJumlah)}, Denda: ${formatRupiah(newDenda)}]. Alasan: ${alasan}`
    );

    return NextResponse.json({
      success: true,
      message: `Tagihan periode ${tagihan.periode} berhasil disesuaikan`,
      data: updatedTagihan,
    });
  } catch (error: any) {
    return handleApiError(error, 'Gagal menyesuaikan tagihan');
  }
}
