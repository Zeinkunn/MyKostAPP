import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthApi, requireRoleApi } from '@/lib/rbac';
import { Role, StatusTagihan } from '@prisma/client';
import { generateMonthlyBills } from '@/lib/tagihan';
import { handleApiError } from '@/lib/errors';

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
