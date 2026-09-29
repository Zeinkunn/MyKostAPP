import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/rbac';
import { Role } from '@prisma/client';

export async function GET() {
  try {
    await requireRole([Role.OWNER, Role.ADMIN]);
    const logs = await prisma.logAktivitas.findMany({
      include: {
        user: { select: { nama: true, email: true, role: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 });
  }
}
