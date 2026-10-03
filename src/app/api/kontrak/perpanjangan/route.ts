import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthApi, requireRoleApi } from '@/lib/rbac';
import { Role, StatusPengajuanPerpanjangan } from '@prisma/client';
import { logAktivitas } from '@/lib/log';
import { handleApiError } from '@/lib/errors';
import { checkPerpanjanganEligibility } from '@/lib/perpanjangan';

export async function GET() {
  try {
    const session = await requireAuthApi();

    if (session.role === Role.PENGHUNI) {
      // Find active contract for this tenant
      const penghuni = await prisma.penghuni.findUnique({
        where: { user_id: session.id },
        include: {
          kontrak: {
            where: { status: 'AKTIF' },
            take: 1,
          },
        },
      });

      const activeKontrak = penghuni?.kontrak[0];
      if (!activeKontrak) {
        return NextResponse.json({ pengajuan: null });
      }

      const latestPengajuan = await prisma.pengajuanPerpanjangan.findFirst({
        where: { kontrak_id: activeKontrak.id },
        orderBy: { created_at: 'desc' },
      });

      return NextResponse.json({ pengajuan: latestPengajuan });
    }

    // OWNER / ADMIN: list pending extension submissions
    await requireRoleApi([Role.OWNER, Role.ADMIN]);
    const pengajuanList = await prisma.pengajuanPerpanjangan.findMany({
      where: { status: StatusPengajuanPerpanjangan.PENDING },
      include: {
        penghuni: { select: { id: true, nama: true, no_hp: true } },
        kontrak: {
          include: {
            kamar: { select: { id: true, nomor_kamar: true, tipe: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json(pengajuanList);
  } catch (error: any) {
    return handleApiError(error, 'Gagal mengambil data pengajuan perpanjangan');
  }
}

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

    // Retrieve all previous extension requests for this contract to check rate limit and duplicates
    const previousSubmissions = await prisma.pengajuanPerpanjangan.findMany({
      where: { kontrak_id: activeKontrak.id },
      select: { status: true, created_at: true },
    });

    const eligibility = checkPerpanjanganEligibility(previousSubmissions);
    if (!eligibility.allowed) {
      return NextResponse.json(
        { error: eligibility.message },
        { status: eligibility.statusCode || 400 }
      );
    }

    // Find all OWNER & ADMIN users to notify
    const managers = await prisma.user.findMany({
      where: { role: { in: [Role.OWNER, Role.ADMIN] } },
      select: { id: true },
    });

    const pesanNotifikasi = `Penghuni ${session.nama} (Kamar ${activeKontrak.kamar.nomor_kamar}) mengajukan perpanjangan sewa`;

    // Atomic transaction: create PengajuanPerpanjangan record & notifications for managers
    const [pengajuan] = await prisma.$transaction([
      prisma.pengajuanPerpanjangan.create({
        data: {
          kontrak_id: activeKontrak.id,
          penghuni_id: penghuni.id,
          status: StatusPengajuanPerpanjangan.PENDING,
        },
      }),
      ...managers.map((mgr) =>
        prisma.notifikasi.create({
          data: {
            user_id: mgr.id,
            judul: 'Pengajuan Perpanjangan Sewa',
            pesan: pesanNotifikasi,
            tipe: 'KONTRAK',
          },
        })
      ),
    ]);

    // Log activity
    await logAktivitas(
      session.id,
      'ajukan_perpanjangan_sewa',
      `Penghuni ${session.nama} (Kamar ${activeKontrak.kamar.nomor_kamar}) mengajukan perpanjangan sewa untuk kontrak ${activeKontrak.id}`
    );

    return NextResponse.json({
      success: true,
      message: 'Pengajuan perpanjangan sewa berhasil dikirimkan ke pengelola kost.',
      pengajuan,
    });
  } catch (error: any) {
    return handleApiError(error, 'Gagal mengajukan perpanjangan sewa');
  }
}
