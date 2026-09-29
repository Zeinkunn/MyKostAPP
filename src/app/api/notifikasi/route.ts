import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiAuthError, requireAuthApi } from '@/lib/rbac';

export async function GET() {
  try {
    const session = await requireAuthApi();
    const listNotifikasi = await prisma.notifikasi.findMany({
      where: { user_id: session.id },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notifikasi.count({
      where: { user_id: session.id, dibaca: false },
    });

    return NextResponse.json({
      notifikasi: listNotifikasi,
      unreadCount,
    });
  } catch (error: any) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Gagal mengambil notifikasi' }, { status: 500 });
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
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Gagal mengupdate notifikasi' }, { status: 500 });
  }
}
