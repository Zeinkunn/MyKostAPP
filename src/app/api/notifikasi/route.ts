import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthApi } from '@/lib/rbac';
import { handleApiError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuthApi();
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const [listNotifikasi, total, unreadCount] = await Promise.all([
      prisma.notifikasi.findMany({
        where: { user_id: session.id },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notifikasi.count({
        where: { user_id: session.id },
      }),
      prisma.notifikasi.count({
        where: { user_id: session.id, dibaca: false },
      }),
    ]);

    return NextResponse.json({
      notifikasi: listNotifikasi,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + listNotifikasi.length < total,
      },
    });
  } catch (error: any) {
    return handleApiError(error, 'Gagal mengambil notifikasi');
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuthApi();
    const body = await req.json().catch(() => ({}));

    if (body.id) {
      await prisma.notifikasi.updateMany({
        where: { id: body.id, user_id: session.id },
        data: { dibaca: true },
      });
    } else {
      // Mark all as read
      await prisma.notifikasi.updateMany({
        where: { user_id: session.id, dibaca: false },
        data: { dibaca: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleApiError(error, 'Gagal mengupdate status notifikasi');
  }
}
