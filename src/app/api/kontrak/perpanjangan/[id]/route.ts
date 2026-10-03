import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoleApi } from '@/lib/rbac';
import { Role, StatusPengajuanPerpanjangan } from '@prisma/client';
import { logAktivitas } from '@/lib/log';
import { handleApiError } from '@/lib/errors';
import { z } from 'zod';

const updatePengajuanSchema = z.object({
  status: z.enum([StatusPengajuanPerpanjangan.DISETUJUI, StatusPengajuanPerpanjangan.DITOLAK]),
  catatan: z.string().trim().optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRoleApi([Role.OWNER, Role.ADMIN]);
    const { id } = await params;

    const body = await req.json();
    const parseResult = updatePengajuanSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { status, catatan } = parseResult.data;

    // Verify existence of pengajuan
    const pengajuan = await prisma.pengajuanPerpanjangan.findUnique({
      where: { id },
      include: {
        penghuni: {
          select: {
            id: true,
            nama: true,
            user_id: true,
          },
        },
        kontrak: {
          include: {
            kamar: { select: { nomor_kamar: true } },
          },
        },
      },
    });

    if (!pengajuan) {
      return NextResponse.json(
        { error: 'Pengajuan perpanjangan tidak ditemukan' },
        { status: 404 }
      );
    }

    if (pengajuan.status !== StatusPengajuanPerpanjangan.PENDING) {
      return NextResponse.json(
        { error: `Pengajuan ini sudah berstatus ${pengajuan.status} dan tidak dapat diubah lagi.` },
        { status: 409 }
      );
    }

    // Update status in atomic transaction with tenant notification
    const [updated] = await prisma.$transaction([
      prisma.pengajuanPerpanjangan.update({
        where: { id },
        data: {
          status,
          catatan: catatan || null,
        },
      }),
      ...(pengajuan.penghuni.user_id
        ? [
            prisma.notifikasi.create({
              data: {
                user_id: pengajuan.penghuni.user_id,
                judul:
                  status === StatusPengajuanPerpanjangan.DISETUJUI
                    ? 'Pengajuan Perpanjangan Sewa Disetujui'
                    : 'Pengajuan Perpanjangan Sewa Ditolak',
                pesan:
                  status === StatusPengajuanPerpanjangan.DISETUJUI
                    ? `Pengajuan perpanjangan sewa kamar ${pengajuan.kontrak.kamar.nomor_kamar} telah disetujui pengelola kost.`
                    : `Pengajuan perpanjangan sewa kamar ${pengajuan.kontrak.kamar.nomor_kamar} ditolak pengelola kost.${catatan ? ` Catatan: ${catatan}` : ''}`,
                tipe: 'KONTRAK',
              },
            }),
          ]
        : []),
    ]);

    await logAktivitas(
      session.id,
      'verifikasi_perpanjangan_sewa',
      `${session.role} ${session.nama} memverifikasi perpanjangan sewa (Kamar ${pengajuan.kontrak.kamar.nomor_kamar}) menjadi ${status}`
    );

    return NextResponse.json({
      success: true,
      message: `Pengajuan perpanjangan berhasil ditandai ${status}.`,
      pengajuan: updated,
    });
  } catch (error: any) {
    return handleApiError(error, 'Gagal memproses verifikasi perpanjangan');
  }
}
