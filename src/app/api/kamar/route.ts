import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/rbac';
import { Role, StatusKamar } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const properti_id = searchParams.get('properti_id');
    const status = searchParams.get('status') as StatusKamar | null;

    const whereClause: any = {};
    if (properti_id) whereClause.properti_id = properti_id;
    if (status) whereClause.status = status;

    const kamarList = await prisma.kamar.findMany({
      where: whereClause,
      include: {
        properti: { select: { nama: true } },
        kontrak: {
          where: { status: 'AKTIF' },
          include: { penghuni: { select: { nama: true, no_hp: true } } },
          take: 1,
        },
      },
      orderBy: { nomor_kamar: 'asc' },
    });

    return NextResponse.json(kamarList);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole([Role.OWNER, Role.ADMIN]);
    const { properti_id, nomor_kamar, tipe, harga_sewa, fasilitas, status, foto_url } = await req.json();

    if (!properti_id || !nomor_kamar || !tipe || !harga_sewa) {
      return NextResponse.json({ error: 'Properti, nomor kamar, tipe, dan harga sewa wajib diisi' }, { status: 400 });
    }

    const newKamar = await prisma.kamar.create({
      data: {
        properti_id,
        nomor_kamar,
        tipe,
        harga_sewa: parseFloat(harga_sewa),
        fasilitas: fasilitas || '',
        status: status || StatusKamar.KOSONG,
        foto_url,
      },
    });

    return NextResponse.json(newKamar, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireRole([Role.OWNER, Role.ADMIN]);
    const { id, nomor_kamar, tipe, harga_sewa, fasilitas, status, foto_url } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'ID Kamar wajib disertakan' }, { status: 400 });
    }

    const updatedKamar = await prisma.kamar.update({
      where: { id },
      data: {
        ...(nomor_kamar && { nomor_kamar }),
        ...(tipe && { tipe }),
        ...(harga_sewa !== undefined && { harga_sewa: parseFloat(harga_sewa) }),
        ...(fasilitas !== undefined && { fasilitas }),
        ...(status && { status }),
        ...(foto_url !== undefined && { foto_url }),
      },
    });

    return NextResponse.json(updatedKamar);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal mengupdate kamar' }, { status: 500 });
  }
}
