import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiAuthError, requireRoleApi } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { logAktivitas } from '@/lib/log';

export async function GET() {
  try {
    await requireRoleApi([Role.OWNER, Role.ADMIN]);
    const listPenghuni = await prisma.penghuni.findMany({
      include: {
        kontrak: {
          include: { kamar: { select: { nomor_kamar: true, tipe: true } } },
          orderBy: { tanggal_mulai: 'desc' },
        },
        user: { select: { email: true, created_at: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json(listPenghuni);
  } catch (error: any) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRoleApi([Role.OWNER, Role.ADMIN]);
    const { nama, no_ktp, no_hp, email, foto_ktp_url } = await req.json();

    if (!nama || !no_ktp || !no_hp || !email) {
      return NextResponse.json({ error: 'Nama, No KTP, No HP, dan Email wajib diisi' }, { status: 400 });
    }

    // Format No HP to standard 08...
    let cleanPhone = no_hp.trim().replace(/\D/g, '');
    if (cleanPhone.startsWith('62')) {
      cleanPhone = '0' + cleanPhone.substring(2);
    }

    // Check duplicate phone number
    const existingPenghuni = await prisma.penghuni.findUnique({
      where: { no_hp: cleanPhone },
    });

    if (existingPenghuni) {
      return NextResponse.json({ error: 'Nomor HP ini sudah terdaftar untuk penghuni lain' }, { status: 400 });
    }

    const newPenghuni = await prisma.penghuni.create({
      data: {
        nama,
        no_ktp,
        no_hp: cleanPhone,
        email,
        foto_ktp_url,
      },
    });

    await logAktivitas(
      session.id,
      'tambah_penghuni',
      `Menambahkan data penghuni baru ${newPenghuni.nama} (No HP: ${newPenghuni.no_hp})`
    );

    return NextResponse.json(newPenghuni, { status: 201 });
  } catch (error: any) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan' }, { status: 500 });
  }
}
