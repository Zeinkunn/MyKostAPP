import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiAuthError, requireAuthApi, requireRoleApi } from '@/lib/rbac';
import { Role, StatusTagihan, StatusVerifikasi } from '@prisma/client';
import { uploadFile } from '@/lib/r2';
import { sendWhatsAppMessage } from '@/lib/fonnte';
import { createNotifikasi, createNotifikasiOwnerAdmin } from '@/lib/notifikasi';

export async function GET() {
  try {
    await requireRoleApi([Role.OWNER, Role.ADMIN]);
    const listPembayaran = await prisma.pembayaran.findMany({
      include: {
        tagihan: {
          include: {
            kontrak: {
              include: {
                kamar: { select: { nomor_kamar: true, tipe: true } },
                penghuni: { select: { nama: true, no_hp: true } },
              },
            },
          },
        },
      },
      orderBy: { tanggal_bayar: 'desc' },
    });

    return NextResponse.json(listPembayaran);
  } catch (error: any) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan' }, { status: 500 });
  }
}

// Upload proof of payment by Penghuni
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuthApi();
    const formData = await req.formData();

    const tagihan_id = formData.get('tagihan_id') as string;
    const jumlah_dibayar = formData.get('jumlah_dibayar') as string;
    const metode = (formData.get('metode') as string) || 'Transfer Bank';
    const file = formData.get('bukti') as File;

    if (!tagihan_id || !file) {
      return NextResponse.json({ error: 'Tagihan dan Bukti Pembayaran wajib dikirim' }, { status: 400 });
    }

    const tagihan = await prisma.tagihan.findUnique({
      where: { id: tagihan_id },
      include: { kontrak: { include: { kamar: true, penghuni: true } } },
    });

    if (!tagihan) {
      return NextResponse.json({ error: 'Tagihan tidak ditemukan' }, { status: 404 });
    }

    // IDOR Protection: Verify tenant owns this bill
    if (session.role === Role.PENGHUNI) {
      if (tagihan.kontrak.penghuni.user_id !== session.id) {
        throw new ApiAuthError('Anda tidak memiliki akses untuk membayar tagihan ini', 403);
      }
    }

    // Upload to Cloudflare R2 (or local fallback)
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const buktiUrl = await uploadFile(fileBuffer, file.name, file.type);

    const pembayaran = await prisma.pembayaran.create({
      data: {
        tagihan_id,
        jumlah_dibayar: parseFloat(jumlah_dibayar || String(tagihan.jumlah)),
        metode,
        bukti_url: buktiUrl,
        status_verifikasi: StatusVerifikasi.PENDING,
      },
    });

    // Send In-App Notification to Owner/Admin
    await createNotifikasiOwnerAdmin({
      judul: 'Pembayaran Baru Perlu Verifikasi',
      pesan: `Penghuni ${tagihan.kontrak.penghuni.nama} (Kamar ${tagihan.kontrak.kamar.nomor_kamar}) telah mengunggah bukti pembayaran periode ${tagihan.periode}.`,
      tipe: 'PEMBAYARAN',
    });

    return NextResponse.json(pembayaran, { status: 201 });
  } catch (error: any) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Upload pembayaran error:', error);
    return NextResponse.json({ error: error.message || 'Gagal mengirim bukti pembayaran' }, { status: 500 });
  }
}

// Verification by Admin (Approve / Reject)
export async function PUT(req: NextRequest) {
  try {
    await requireRoleApi([Role.OWNER, Role.ADMIN]);
    const { id, status_verifikasi } = await req.json();

    if (!id || !status_verifikasi) {
      return NextResponse.json({ error: 'ID dan status verifikasi wajib diisi' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const pembayaran = await tx.pembayaran.update({
        where: { id },
        data: { status_verifikasi },
        include: {
          tagihan: {
            include: { kontrak: { include: { penghuni: true, kamar: true } } },
          },
        },
      });

      if (status_verifikasi === StatusVerifikasi.DISETUJUI) {
        await tx.tagihan.update({
          where: { id: pembayaran.tagihan_id },
          data: { status: StatusTagihan.LUNAS },
        });
      }

      return pembayaran;
    });

    // Send WA notification to Penghuni (Alur 6.2 Step 5)
    const phone = result.tagihan.kontrak.penghuni.no_hp;
    const nama = result.tagihan.kontrak.penghuni.nama;
    const statusText = status_verifikasi === 'DISETUJUI' ? 'LUNAS & DISETUJUI' : 'DITOLAK';

    const waMsg = `Halo Sdr/i ${nama},\n\nStatus pembayaran tagihan kamar ${result.tagihan.kontrak.kamar.nomor_kamar} periode ${result.tagihan.periode} telah: *${statusText}*.\n\nTerima kasih,\nMyKost Management`;

    await sendWhatsAppMessage({ target: phone, message: waMsg });

    // Send In-App Notification to Penghuni if user_id linked
    if (result.tagihan.kontrak.penghuni.user_id) {
      await createNotifikasi({
        user_id: result.tagihan.kontrak.penghuni.user_id,
        judul: `Pembayaran ${statusText}`,
        pesan: `Pembayaran Anda untuk periode ${result.tagihan.periode} telah ${statusText.toLowerCase()} oleh pengelola.`,
        tipe: 'PEMBAYARAN',
      });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Gagal memverifikasi pembayaran' }, { status: 500 });
  }
}
