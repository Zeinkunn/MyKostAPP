import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoleApi } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { handleApiError } from '@/lib/errors';

export async function GET() {
  try {
    await requireRoleApi([Role.OWNER, Role.ADMIN]);
    const logs = await prisma.logAktivitas.findMany({
      include: {
        user: { select: { nama: true, email: true, role: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
    return NextResponse.json(logs);
  } catch (error: any) {
    return handleApiError(error, 'Gagal mengambil log aktivitas');
  }
}
