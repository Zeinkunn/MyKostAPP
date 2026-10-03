import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthApi, requireRoleApi } from '@/lib/rbac';
import { Role, StatusKamar } from '@prisma/client';
import { logAktivitas } from '@/lib/log';
import { handleApiError } from '@/lib/errors';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuthApi();
    const { searchParams } = new URL(req.url);
    const properti_id = searchParams.get('properti_id');
    const rawStatus = searchParams.get('status');

    let status: StatusKamar | undefined;
    if (rawStatus && Object.values(StatusKamar).includes(rawStatus as StatusKamar)) {
      status = rawStatus as StatusKamar;
    }

    const whereClause: any = {};
    if (properti_id) whereClause.properti_id = properti_id;
    if (status) whereClause.status = status;

    // Security: For PENGHUNI, strictly return only public room fields.
    // Do NOT include contract, tenant names, or phone numbers.
    if (session.role === Role.PENGHUNI) {
      const publicKamar = await prisma.kamar.findMany({
        where: whereClause,
        select: {
          id: true,
          nomor_kamar: true,
          tipe: true,
          lantai: true,
          harga_sewa: true,
          fasilitas: true,
          foto_url: true,
          status: true,
          properti: { select: { nama: true } },
        },
        orderBy: { nomor_kamar: 'asc' },
      });
      return NextResponse.json(publicKamar);
    }

    // OWNER & ADMIN get full room management info with active tenant summary
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
    return handleApiError(error, 'Gagal mengambil data kamar');
  }
}

const createKamarSchema = z.object({
  properti_id: z.string().min(1, 'Properti wajib dipilih'),
  nomor_kamar: z.string().trim().min(1, 'Nomor kamar wajib diisi'),
  tipe: z.string().trim().min(1, 'Tipe kamar wajib diisi'),
  lantai: z.coerce.number().int().optional().nullable(),
  harga_sewa: z.coerce.number().positive('Harga sewa harus lebih dari 0'),
  fasilitas: z.string().optional().default(''),
  status: z.nativeEnum(StatusKamar).optional().default(StatusKamar.KOSONG),
  foto_url: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireRoleApi([Role.OWNER, Role.ADMIN]);
    const body = await req.json();

    const parseResult = createKamarSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { properti_id, nomor_kamar, tipe, lantai, harga_sewa, fasilitas, status, foto_url } = parseResult.data;

    const newKamar = await prisma.kamar.create({
      data: {
        properti_id,
        nomor_kamar,
        tipe,
        lantai: lantai ?? null,
        harga_sewa,
        fasilitas,
        status,
        foto_url: foto_url || null,
      },
    });

    await logAktivitas(
      session.id,
      'buat_kamar',
      `Membuat unit Kamar ${newKamar.nomor_kamar} (${newKamar.tipe}${newKamar.lantai ? ` • Lt. ${newKamar.lantai}` : ''})`
    );

    return NextResponse.json(newKamar, { status: 201 });
  } catch (error: any) {
    return handleApiError(error, 'Gagal membuat kamar baru');
  }
}

const updateKamarSchema = z.object({
  id: z.string().min(1, 'ID Kamar wajib disertakan'),
  nomor_kamar: z.string().trim().min(1).optional(),
  tipe: z.string().trim().min(1).optional(),
  lantai: z.coerce.number().int().optional().nullable(),
  harga_sewa: z.coerce.number().positive().optional(),
  fasilitas: z.string().optional(),
  status: z.nativeEnum(StatusKamar).optional(),
  foto_url: z.string().optional().nullable(),
});

export async function PUT(req: NextRequest) {
  try {
    const session = await requireRoleApi([Role.OWNER, Role.ADMIN]);
    const body = await req.json();

    const parseResult = updateKamarSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { id, nomor_kamar, tipe, lantai, harga_sewa, fasilitas, status, foto_url } = parseResult.data;

    const updatedKamar = await prisma.kamar.update({
      where: { id },
      data: {
        ...(nomor_kamar && { nomor_kamar }),
        ...(tipe && { tipe }),
        ...(lantai !== undefined && { lantai: lantai ?? null }),
        ...(harga_sewa !== undefined && { harga_sewa }),
        ...(fasilitas !== undefined && { fasilitas }),
        ...(status && { status }),
        ...(foto_url !== undefined && { foto_url: foto_url || null }),
      },
    });

    await logAktivitas(
      session.id,
      'update_kamar',
      `Mengubah data unit Kamar ${updatedKamar.nomor_kamar} (Status: ${updatedKamar.status})`
    );

    return NextResponse.json(updatedKamar);
  } catch (error: any) {
    return handleApiError(error, 'Gagal mengupdate kamar');
  }
}
