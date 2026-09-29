import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/rbac';
import { Role, StatusKamar, StatusKontrak } from '@prisma/client';
import { sendWhatsAppMessage } from '@/lib/fonnte';

export async function POST(req: NextRequest) {
  try {
    await requireRole([Role.OWNER, Role.ADMIN]);
    const { kontrak_id, potongan_deposit, catatan_potongan } = await req.json();

    if (!kontrak_id) {
      return NextResponse.json({ error: 'ID Kontrak wajib diisi' }, { status: 400 });
    }

    const kontrak = await prisma.kontrak.findUnique({
      where: { id: kontrak_id },
      include: {
        kamar: true,
        penghuni: true,
        tagihan: {
          where: { status: { in: ['BELUM_BAYAR', 'TERLAMBAT', 'SEBAGIAN'] } },
        },
      },
    });

    if (!kontrak) {
      return NextResponse.json({ error: 'Kontrak tidak ditemukan' }, { status: 404 });
    }

    // Alur 6.4 Step 2: Check unpaid bills
    if (kontrak.tagihan.length > 0) {
      return NextResponse.json(
        {
          error:
            'Checkout ditolak! Penghuni masih memiliki tagihan tertunggak yang belum dilunasi.',
        },
        { status: 400 }
      );
    }

    // Step 3-5: Complete contract & reset room to KOSONG
    const result = await prisma.$transaction(async (tx) => {
      // Set Kontrak to SELESAI
      const updatedKontrak = await tx.kontrak.update({
        where: { id: kontrak_id },
        data: { status: StatusKontrak.SELESAI },
      });

      // Set Kamar status to KOSONG
      await tx.kamar.update({
        where: { id: kontrak.kamar_id },
        data: { status: StatusKamar.KOSONG },
      });

      return updatedKontrak;
    });

    // Send WA notification
    const phone = kontrak.penghuni.no_hp;
    const nama = kontrak.penghuni.nama;
    const nomorKamar = kontrak.kamar.nomor_kamar;

    const waMsg = `Halo Sdr/i ${nama},\n\nProses checkout untuk *Kamar ${nomorKamar}* telah selesai dan kontrak sewa Anda telah diakhiri.\n\nTerima kasih telah menyewa di MyKost!`;
    await sendWhatsAppMessage({ target: phone, message: waMsg });

    return NextResponse.json({
      success: true,
      message: `Proses checkout Kamar ${nomorKamar} selesai. Kamar kembali KOSONG.`,
      result,
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: error.message || 'Gagal memproses checkout' }, { status: 500 });
  }
}
