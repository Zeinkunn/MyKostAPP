import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoleApi } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { handleApiError } from '@/lib/errors';
import { z } from 'zod';

export async function GET() {
  try {
    await requireRoleApi([Role.OWNER, Role.ADMIN]);
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
    return handleApiError(error, 'Gagal mengambil data properti');
  }
}

const createPropertiSchema = z.object({
  nama: z.string().trim().min(1, 'Nama properti wajib diisi'),
  alamat: z.string().trim().min(1, 'Alamat properti wajib diisi'),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireRoleApi([Role.OWNER, Role.ADMIN]);
    const body = await req.json();

    const parseResult = createPropertiSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { nama, alamat } = parseResult.data;

    const newProperti = await prisma.properti.create({
      data: {
        nama,
        alamat,
        user_id: session.id,
      },
    });

    return NextResponse.json(newProperti, { status: 201 });
  } catch (error: any) {
    return handleApiError(error, 'Gagal membuat properti baru');
  }
}
