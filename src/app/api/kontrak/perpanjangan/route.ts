import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoleApi } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { logAktivitas } from '@/lib/log';
import { handleApiError } from '@/lib/errors';

export async function POST() {
  try {
    const session = await requireRoleApi([Role.PENGHUNI]);

    // Check active contract for this tenant
    const penghuni = await prisma.penghuni.findUnique({
      where: { user_id: session.id },
      include: {
        kontrak: {
          where: { status: 'AKTIF' },
          include: { kamar: true },
          take: 1,
        },
      },
    });

    const activeKontrak = penghuni?.kontrak[0];
    if (!activeKontrak) {
      return NextResponse.json(
        { error: 'Tidak ditemukan kontrak sewa aktif untuk diajukan perpanjangan.' },
        { status: 400 }
      );
    }

    // Rate limit: 1 submission per 7 days per contract
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentSubmission = await prisma.logAktivitas.findFirst({
      where: {
        user_id: session.id,
        aksi: 'ajukan_perpanjangan_sewa',
        detail: { contains: activeKontrak.id },
        timestamp: { gte: sevenDaysAgo },
      },
    });

    if (recentSubmission) {
      return NextResponse.json(
        {
          error:
            'Anda telah mengajukan perpanjangan sewa dalam 7 hari terakhir. Silakan tunggu konfirmasi dari pengelola kost.',
        },
        { status: 429 }
      );
    }

    // Find all OWNER & ADMIN users to notify
    const managers = await prisma.user.findMany({
      where: { role: { in: [Role.OWNER, Role.ADMIN] } },
      select: { id: true },
    });

    const pesanNotifikasi = `Penghuni ${session.nama} (Kamar ${activeKontrak.kamar.nomor_kamar}) mengajukan perpanjangan sewa`;

    // Create notifications for managers
    if (managers.length > 0) {
      await prisma.$transaction(
        managers.map((mgr) =>
          prisma.notifikasi.create({
            data: {
              user_id: mgr.id,
              judul: 'Pengajuan Perpanjangan Sewa',
              pesan: pesanNotifikasi,
              tipe: 'KONTRAK',
            },
          })
        )
      );
    }

    // Log activity
    await logAktivitas(
      session.id,
      'ajukan_perpanjangan_sewa',
      `Penghuni ${session.nama} (Kamar ${activeKontrak.kamar.nomor_kamar}) mengajukan perpanjangan sewa untuk kontrak ${activeKontrak.id}`
    );

    return NextResponse.json({
      success: true,
      message: 'Pengajuan perpanjangan sewa berhasil dikirimkan ke pengelola kost.',
    });
  } catch (error: any) {
    return handleApiError(error, 'Gagal mengajukan perpanjangan sewa');
  }
}
