import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiAuthError, requireAuthApi, requireRoleApi } from '@/lib/rbac';
import { Role, StatusPengaduan } from '@prisma/client';
import { uploadFile } from '@/lib/r2';
import { createNotifikasi, createNotifikasiOwnerAdmin } from '@/lib/notifikasi';
import { logAktivitas } from '@/lib/log';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuthApi();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as StatusPengaduan | null;

    if (session.role === Role.PENGHUNI) {
      const listPengaduan = await prisma.pengaduan.findMany({
        where: {
          penghuni: { user_id: session.id },
          ...(status && { status }),
        },
        include: { kamar: { select: { nomor_kamar: true } } },
        orderBy: { created_at: 'desc' },
      });
      return NextResponse.json(listPengaduan);
    }

    // Owner / Admin fetch all
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
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 });
  }
}

// Submit Complaint by Penghuni (Alur 6.3)
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuthApi();
    const formData = await req.formData();

    const kategori = (formData.get('kategori') as string) || 'Fasilitas Kamar';
    const deskripsi = formData.get('deskripsi') as string;
    const files = formData.getAll('foto') as File[];

    if (!deskripsi) {
      return NextResponse.json({ error: 'Deskripsi komplain wajib diisi' }, { status: 400 });
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
      return NextResponse.json({ error: 'Data kamar aktif tidak ditemukan' }, { status: 400 });
    }

    const kamar_id = penghuni.kontrak[0].kamar_id;
    const nomorKamar = penghuni.kontrak[0].kamar.nomor_kamar;

    // Upload photos if present
    const fotoUrls: string[] = [];
    for (const file of files) {
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
    if (error instanceof ApiAuthError || error.status) {
      return NextResponse.json({ error: error.message }, { status: error.status || 400 });
    }
    console.error('Submit pengaduan error:', error);
    return NextResponse.json({ error: error.message || 'Gagal mengajukan komplain' }, { status: 500 });
  }
}

// Update Status & Internal Notes by Admin (Alur 6.3 Step 4)
export async function PUT(req: NextRequest) {
  try {
    await requireRoleApi([Role.OWNER, Role.ADMIN]);
    const { id, status, catatan_internal } = await req.json();

    if (!id || !status) {
      return NextResponse.json({ error: 'ID dan status komplain wajib disertakan' }, { status: 400 });
    }

    const updated = await prisma.pengaduan.update({
      where: { id },
      data: {
        status,
        ...(catatan_internal !== undefined && { catatan_internal }),
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

    // Audit Log (Priority 6)
    const session = await requireRoleApi([Role.OWNER, Role.ADMIN]);
    await logAktivitas(
      session.id,
      'update_pengaduan',
      `Memperbarui status komplain Kamar ${updated.kamar.nomor_kamar} menjadi ${status}`
    );

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Gagal mengupdate komplain' }, { status: 500 });
  }
}
