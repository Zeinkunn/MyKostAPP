import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthApi, requireRoleApi } from '@/lib/rbac';
import { Role, StatusPengaduan } from '@prisma/client';
import { uploadFile } from '@/lib/r2';
import { createNotifikasi, createNotifikasiOwnerAdmin } from '@/lib/notifikasi';
import { logAktivitas } from '@/lib/log';
import { handleApiError } from '@/lib/errors';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuthApi();
    const { searchParams } = new URL(req.url);
    const rawStatus = searchParams.get('status');

    let status: StatusPengaduan | undefined;
    if (rawStatus && Object.values(StatusPengaduan).includes(rawStatus as StatusPengaduan)) {
      status = rawStatus as StatusPengaduan;
    }

    // Security: For PENGHUNI, omit catatan_internal so internal admin notes are never leaked
    if (session.role === Role.PENGHUNI) {
      const listPengaduan = await prisma.pengaduan.findMany({
        where: {
          penghuni: { user_id: session.id },
          ...(status && { status }),
        },
        select: {
          id: true,
          kamar_id: true,
          penghuni_id: true,
          kategori: true,
          deskripsi: true,
          foto_url: true,
          status: true,
          created_at: true,
          resolved_at: true,
          kamar: { select: { nomor_kamar: true } },
          // catatan_internal is intentionally omitted for PENGHUNI
        },
        orderBy: { created_at: 'desc' },
      });
      return NextResponse.json(listPengaduan);
    }

    // Owner / Admin fetch all with full internal notes and tenant details
    const listPengaduan = await prisma.pengaduan.findMany({
      where: status ? { status } : {},
      include: {
        kamar: { select: { nomor_kamar: true, tipe: true } },
        penghuni: { select: { nama: true, no_hp: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json(listPengaduan);
  } catch (error: any) {
    return handleApiError(error, 'Gagal mengambil data pengaduan');
  }
}

// Submit Complaint by Penghuni (Alur 6.3)
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuthApi();
    const formData = await req.formData();

    const kategori = (formData.get('kategori') as string)?.trim() || 'Fasilitas Kamar';
    const deskripsi = (formData.get('deskripsi') as string)?.trim();
    const files = formData.getAll('foto') as File[];

    if (!deskripsi) {
      return NextResponse.json({ error: 'Deskripsi komplain wajib diisi' }, { status: 400 });
    }

    // Security rule 2.4: Limit maximum files to 3 per complaint
    if (files.length > 3) {
      return NextResponse.json(
        { error: 'Maksimal 3 foto lampiran yang diperbolehkan per pengaduan' },
        { status: 400 }
      );
    }

    const penghuni = await prisma.penghuni.findUnique({
      where: { user_id: session.id },
      include: {
        kontrak: {
          where: { status: 'AKTIF' },
          select: { kamar_id: true, kamar: { select: { nomor_kamar: true } } },
          take: 1,
        },
      },
    });

    if (!penghuni || !penghuni.kontrak[0]) {
      return NextResponse.json(
        { error: 'Data kamar aktif tidak ditemukan untuk akun ini' },
        { status: 400 }
      );
    }

    const kamar_id = penghuni.kontrak[0].kamar_id;
    const nomorKamar = penghuni.kontrak[0].kamar.nomor_kamar;

    // Upload photos (max 3)
    const fotoUrls: string[] = [];
    for (const file of files.slice(0, 3)) {
      if (file && file.size > 0) {
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const url = await uploadFile(fileBuffer, file.name, file.type);
        fotoUrls.push(url);
      }
    }

    const newPengaduan = await prisma.pengaduan.create({
      data: {
        kamar_id,
        penghuni_id: penghuni.id,
        kategori,
        deskripsi,
        foto_url: fotoUrls,
        status: StatusPengaduan.BARU,
      },
    });

    // Notify Owner / Admin
    await createNotifikasiOwnerAdmin({
      judul: 'Komplain Baru Masuk',
      pesan: `Penghuni ${penghuni.nama} (Kamar ${nomorKamar}) mengajukan komplain kategori ${kategori}.`,
      tipe: 'PENGADUAN',
    });

    return NextResponse.json(newPengaduan, { status: 201 });
  } catch (error: any) {
    return handleApiError(error, 'Gagal mengajukan komplain');
  }
}

const updatePengaduanSchema = z.object({
  id: z.string().min(1, 'ID komplain wajib disertakan'),
  status: z.nativeEnum(StatusPengaduan, {
    errorMap: () => ({ message: 'Status komplain tidak valid' }),
  }),
  catatan_internal: z.string().optional().nullable(),
});

// Update Status & Internal Notes by Admin
export async function PUT(req: NextRequest) {
  try {
    const session = await requireRoleApi([Role.OWNER, Role.ADMIN]);
    const body = await req.json();

    const parseResult = updatePengaduanSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { id, status, catatan_internal } = parseResult.data;

    const updated = await prisma.pengaduan.update({
      where: { id },
      data: {
        status,
        ...(catatan_internal !== undefined && { catatan_internal: catatan_internal || null }),
        ...(status === StatusPengaduan.SELESAI && { resolved_at: new Date() }),
      },
      include: {
        penghuni: { select: { user_id: true } },
        kamar: { select: { nomor_kamar: true } },
      },
    });

    // Notify Penghuni if linked user exists
    if (updated.penghuni.user_id) {
      await createNotifikasi({
        user_id: updated.penghuni.user_id,
        judul: `Status Komplain: ${status}`,
        pesan: `Komplain Anda mengenai Kamar ${updated.kamar.nomor_kamar} telah diperbarui menjadi ${status}.`,
        tipe: 'PENGADUAN',
      });
    }

    // Audit Log
    await logAktivitas(
      session.id,
      'update_pengaduan',
      `Memperbarui status komplain Kamar ${updated.kamar.nomor_kamar} menjadi ${status}`
    );

    return NextResponse.json(updated);
  } catch (error: any) {
    return handleApiError(error, 'Gagal mengupdate komplain');
  }
}
