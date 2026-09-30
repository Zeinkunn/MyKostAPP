import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiAuthError, requireRoleApi } from '@/lib/rbac';
import { Role, StatusKamar, StatusKontrak } from '@prisma/client';
import { sendWhatsAppMessage } from '@/lib/fonnte';
import { formatRupiah } from '@/lib/utils';
import { logAktivitas } from '@/lib/log';

export async function POST(req: NextRequest) {
  try {
    const session = await requireRoleApi([Role.OWNER, Role.ADMIN]);
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

    const potonganNum = parseFloat(potongan_deposit || '0');
    const depositAwalNum = kontrak.deposit_awal ? Number(kontrak.deposit_awal) : 0;
    const sisaDeposit = Math.max(0, depositAwalNum - potonganNum);

    // Step 3-5: Complete contract & reset room to KOSONG
    const result = await prisma.$transaction(async (tx) => {
      // Set Kontrak to SELESAI and store deposit deduction details
      const updatedKontrak = await tx.kontrak.update({
        where: { id: kontrak_id },
        data: {
          status: StatusKontrak.SELESAI,
          potongan_deposit: potonganNum,
          catatan_potongan: catatan_potongan || null,
          tanggal_checkout: new Date(),
        },
      });

      // Set Kamar status to KOSONG
      await tx.kamar.update({
        where: { id: kontrak.kamar_id },
        data: { status: StatusKamar.KOSONG },
      });

      return updatedKontrak;
    });

    // Send WA notification with deposit details
    const phone = kontrak.penghuni.no_hp;
    const nama = kontrak.penghuni.nama;
    const nomorKamar = kontrak.kamar.nomor_kamar;

    let depositMsg = '';
    if (depositAwalNum > 0) {
      depositMsg = `\n\n*Rincian Deposit:*\n- Deposit Awal: ${formatRupiah(depositAwalNum)}\n- Potongan Deposit: ${formatRupiah(potonganNum)}${catatan_potongan ? ` (${catatan_potongan})` : ''}\n- *Sisa Deposit Dikembalikan: ${formatRupiah(sisaDeposit)}*`;
    } else if (potonganNum > 0) {
      depositMsg = `\n\n*Potongan Biaya Checkout:* ${formatRupiah(potonganNum)}${catatan_potongan ? ` (${catatan_potongan})` : ''}`;
    }

    const waMsg = `Halo Sdr/i ${nama},\n\nProses checkout untuk *Kamar ${nomorKamar}* telah selesai dan kontrak sewa Anda telah diakhiri.${depositMsg}\n\nTerima kasih telah menyewa di MyKost!`;
    await sendWhatsAppMessage({ target: phone, message: waMsg });

    // Audit Log (Priority 6)
    await logAktivitas(
      session.id,
      'proses_checkout',
      `Memproses checkout Kamar ${nomorKamar} untuk penghuni ${nama}. Potongan deposit: ${formatRupiah(potonganNum)}`
    );

    return NextResponse.json({
      success: true,
      message: `Proses checkout Kamar ${nomorKamar} selesai. Kamar kembali KOSONG.`,
      result,
    });
  } catch (error: any) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Checkout error:', error);
    return NextResponse.json({ error: error.message || 'Gagal memproses checkout' }, { status: 500 });
  }
}
