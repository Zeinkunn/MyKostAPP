import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiAuthError, requireRoleApi } from '@/lib/rbac';
import { Role, StatusKamar, StatusKontrak, StatusVerifikasi } from '@prisma/client';
import { sendWhatsAppMessage } from '@/lib/fonnte';
import { formatRupiah } from '@/lib/utils';
import { logAktivitas } from '@/lib/log';
import { z } from 'zod';

const checkoutSchema = z.object({
  kontrak_id: z.string().min(1, 'ID Kontrak wajib diisi'),
  potongan_deposit: z.coerce.number().min(0, 'Potongan deposit minimal Rp 0').default(0),
  catatan_potongan: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireRoleApi([Role.OWNER, Role.ADMIN]);
    const body = await req.json();

    const parseResult = checkoutSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { kontrak_id, potongan_deposit, catatan_potongan } = parseResult.data;

    // Execute atomic transaction for checking bills, pending payments, room status, and completing contract
    const result = await prisma.$transaction(async (tx) => {
      const kontrak = await tx.kontrak.findUnique({
        where: { id: kontrak_id },
        include: {
          kamar: true,
          penghuni: true,
          tagihan: {
            include: {
              pembayaran: {
                where: { status_verifikasi: StatusVerifikasi.PENDING },
              },
            },
          },
        },
      });

      if (!kontrak) {
        throw new Error('Kontrak tidak ditemukan');
      }

      // Rule 1: Contract must be AKTIF
      if (kontrak.status !== StatusKontrak.AKTIF) {
        throw new Error(
          `Checkout ditolak! Status kontrak bukan AKTIF (status saat ini: ${kontrak.status}).`
        );
      }

      // Rule 2: Check unpaid bills
      const unpaidBills = kontrak.tagihan.filter((t) =>
        ['BELUM_BAYAR', 'TERLAMBAT', 'SEBAGIAN'].includes(t.status)
      );
      if (unpaidBills.length > 0) {
        throw new Error(
          `Checkout ditolak! Penghuni masih memiliki ${unpaidBills.length} tagihan tertunggak yang belum dilunasi.`
        );
      }

      // Rule 3: Check pending payments
      const hasPendingPayments = kontrak.tagihan.some((t) => t.pembayaran.length > 0);
      if (hasPendingPayments) {
        throw new Error(
          'Checkout ditolak! Masih terdapat bukti pembayaran berstatus PENDING yang menunggu verifikasi admin.'
        );
      }

      // Rule 4: Validate deposit deduction
      const depositAwalNum = kontrak.deposit_awal ? Number(kontrak.deposit_awal) : 0;
      if (kontrak.deposit_awal !== null && potongan_deposit > depositAwalNum) {
        throw new Error(
          `Potongan deposit (${formatRupiah(potongan_deposit)}) tidak boleh melebihi deposit awal (${formatRupiah(depositAwalNum)}).`
        );
      }

      // Rule 5: Complete contract
      const updatedKontrak = await tx.kontrak.update({
        where: { id: kontrak_id },
        data: {
          status: StatusKontrak.SELESAI,
          potongan_deposit,
          catatan_potongan: catatan_potongan || null,
          tanggal_checkout: new Date(),
        },
      });

      // Rule 6: Reset room to KOSONG only if current status is TERISI
      if (kontrak.kamar.status === StatusKamar.TERISI) {
        await tx.kamar.update({
          where: { id: kontrak.kamar_id },
          data: { status: StatusKamar.KOSONG },
        });
      }

      return {
        updatedKontrak,
        kontrak,
        depositAwalNum,
        sisaDeposit: Math.max(0, depositAwalNum - potongan_deposit),
      };
    });

    // Send WA notification with deposit details
    const phone = result.kontrak.penghuni.no_hp;
    const nama = result.kontrak.penghuni.nama;
    const nomorKamar = result.kontrak.kamar.nomor_kamar;
    const depositAwalNum = result.depositAwalNum;
    const sisaDeposit = result.sisaDeposit;

    let depositMsg = '';
    if (depositAwalNum > 0) {
      depositMsg = `\n\n*Rincian Deposit:*\n- Deposit Awal: ${formatRupiah(depositAwalNum)}\n- Potongan Deposit: ${formatRupiah(potongan_deposit)}${catatan_potongan ? ` (${catatan_potongan})` : ''}\n- *Sisa Deposit Dikembalikan: ${formatRupiah(sisaDeposit)}*`;
    } else if (potongan_deposit > 0) {
      depositMsg = `\n\n*Potongan Biaya Checkout:* ${formatRupiah(potongan_deposit)}${catatan_potongan ? ` (${catatan_potongan})` : ''}`;
    }

    const waMsg = `Halo Sdr/i ${nama},\n\nProses checkout untuk *Kamar ${nomorKamar}* telah selesai dan kontrak sewa Anda telah diakhiri.${depositMsg}\n\nTerima kasih telah menyewa di MyKost!`;
    await sendWhatsAppMessage({ target: phone, message: waMsg });

    // Audit Log
    await logAktivitas(
      session.id,
      'proses_checkout',
      `Memproses checkout Kamar ${nomorKamar} untuk penghuni ${nama}. Potongan deposit: ${formatRupiah(potongan_deposit)}`
    );

    return NextResponse.json({
      success: true,
      message: `Proses checkout Kamar ${nomorKamar} selesai. Kontrak diakhiri.`,
      result: result.updatedKontrak,
    });
  } catch (error: any) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const isClientError =
      error.message?.includes('Checkout ditolak') ||
      error.message?.includes('Kontrak tidak ditemukan') ||
      error.message?.includes('tidak boleh melebihi deposit awal');

    if (isClientError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Checkout error:', error);
    return NextResponse.json({ error: error.message || 'Gagal memproses checkout' }, { status: 500 });
  }
}
