import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole } from '@/lib/rbac';
import { Role, StatusTagihan } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as StatusTagihan | null;

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
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 });
  }
}

// Generate monthly bills for all active contracts (Cron / Manual trigger by admin)
export async function POST() {
  try {
    await requireRole([Role.OWNER, Role.ADMIN]);

    const activeContracts = await prisma.kontrak.findMany({
      where: { status: 'AKTIF' },
    });

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const periode = `${year}-${month}`;

    let generatedCount = 0;

    for (const kontrak of activeContracts) {
      // Check if tagihan for this period already exists
      const existing = await prisma.tagihan.findFirst({
        where: {
          kontrak_id: kontrak.id,
          periode,
        },
      });

      if (!existing) {
        const dueDate = new Date(year, now.getMonth(), 10); // Default due date 10th of month

        await prisma.tagihan.create({
          data: {
            kontrak_id: kontrak.id,
            periode,
            jumlah: kontrak.harga_sewa_disepakati,
            denda: 0,
            jatuh_tempo: dueDate,
            status: StatusTagihan.BELUM_BAYAR,
          },
        });
        generatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil membuat ${generatedCount} tagihan baru periode ${periode}`,
      generatedCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal generate tagihan' }, { status: 500 });
  }
}
