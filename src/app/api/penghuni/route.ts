import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoleApi } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { logAktivitas } from '@/lib/log';
import { normalizePhone } from '@/lib/phone';
import { handleApiError } from '@/lib/errors';
import { z } from 'zod';

export async function GET() {
  try {
    await requireRoleApi([Role.OWNER, Role.ADMIN]);
    const listPenghuni = await prisma.penghuni.findMany({
      include: {
        kontrak: {
          include: {
            kamar: { select: { nomor_kamar: true, tipe: true } },
            pengajuan_perpanjangan: {
              where: { status: 'PENDING' },
              take: 1,
            },
          },
          orderBy: { tanggal_mulai: 'desc' },
        },
        user: { select: { email: true, created_at: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json(listPenghuni);
  } catch (error: any) {
    return handleApiError(error, 'Gagal mengambil data penghuni');
  }
}

const createPenghuniSchema = z.object({
  nama: z.string().trim().min(1, 'Nama penghuni wajib diisi'),
  no_ktp: z.string().trim().min(1, 'Nomor KTP wajib diisi'),
  no_hp: z.string().trim().min(8, 'Nomor HP minimal 8 digit'),
  email: z.string().trim().email('Format email tidak valid'),
  foto_ktp_url: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireRoleApi([Role.OWNER, Role.ADMIN]);
    const body = await req.json();

    const parseResult = createPenghuniSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { nama, no_ktp, no_hp, email, foto_ktp_url } = parseResult.data;
    const cleanPhone = normalizePhone(no_hp);

    // Check duplicate phone number
    const existingPenghuni = await prisma.penghuni.findUnique({
      where: { no_hp: cleanPhone },
    });

    if (existingPenghuni) {
      return NextResponse.json(
        { error: 'Nomor HP ini sudah terdaftar untuk penghuni lain' },
        { status: 400 }
      );
    }

    const newPenghuni = await prisma.penghuni.create({
      data: {
        nama,
        no_ktp,
        no_hp: cleanPhone,
        email,
        foto_ktp_url: foto_ktp_url || null,
      },
    });

    await logAktivitas(
      session.id,
      'tambah_penghuni',
      `Menambahkan data penghuni baru ${newPenghuni.nama} (No HP: ${newPenghuni.no_hp})`
    );

    return NextResponse.json(newPenghuni, { status: 201 });
  } catch (error: any) {
    return handleApiError(error, 'Gagal menambahkan penghuni');
  }
}
