import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/rbac';
import { Role } from '@prisma/client';

export async function GET() {
  try {
    const session = await requireRole([Role.OWNER, Role.ADMIN]);
    const propertiList = await prisma.properti.findMany({
      include: {
        _count: {
          select: { kamar: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
    return NextResponse.json(propertiList);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole([Role.OWNER, Role.ADMIN]);
    const { nama, alamat } = await req.json();

    if (!nama || !alamat) {
      return NextResponse.json({ error: 'Nama dan alamat properti wajib diisi' }, { status: 400 });
    }

    const newProperti = await prisma.properti.create({
      data: {
        nama,
        alamat,
        user_id: session.id,
      },
    });

    return NextResponse.json(newProperti, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan' }, { status: 500 });
  }
}
