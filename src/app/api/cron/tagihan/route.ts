import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { StatusTagihan } from '@prisma/client';
import { sendWhatsAppMessage } from '@/lib/fonnte';
import { formatDateIndonesian, formatRupiah } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const now = new Date();

    // Fetch dynamic settings (late fee rate & template) from Supabase
    let settings = await prisma.pengaturan.findUnique({ where: { id: 'default' } });
    if (!settings) {
      settings = await prisma.pengaturan.create({
        data: { id: 'default', harga_default: 1500000, denda_per_hari: 50000, wa_template: '' },
      });
    }

    const dendaDynamic = Number(settings.denda_per_hari || 50000);

    // Fetch unpaid or late bills
    const unpaidBills = await prisma.tagihan.findMany({
      where: {
        status: { in: [StatusTagihan.BELUM_BAYAR, StatusTagihan.TERLAMBAT] },
      },
      include: {
        kontrak: {
          include: {
            kamar: { select: { nomor_kamar: true } },
            penghuni: { select: { nama: true, no_hp: true } },
          },
        },
      },
    });

    let sentCount = 0;

    for (const tagihan of unpaidBills) {
      const dueDate = new Date(tagihan.jatuh_tempo);
      const isOverdue = now > dueDate;

      // Calculate dynamic late fee based on settings if overdue
      if (isOverdue && tagihan.status === StatusTagihan.BELUM_BAYAR) {
        await prisma.tagihan.update({
          where: { id: tagihan.id },
          data: {
            status: StatusTagihan.TERLAMBAT,
            denda: dendaDynamic, // Dynamic late fee from database settings
          },
        });
      }

      const currentDenda = isOverdue && Number(tagihan.denda) === 0 ? dendaDynamic : Number(tagihan.denda);
      const totalJumlah = Number(tagihan.jumlah) + currentDenda;
      const phone = tagihan.kontrak.penghuni.no_hp;
      const nama = tagihan.kontrak.penghuni.nama;
      const nomorKamar = tagihan.kontrak.kamar.nomor_kamar;

      const waMessage = isOverdue
        ? `*[REMINDER TERLAMBAT - MYKOST]*\n\nHalo Sdr/i ${nama},\n\nTagihan sewa *Kamar ${nomorKamar}* periode *${tagihan.periode}* telah MELEWATI JATUH TEMPO (${formatDateIndonesian(dueDate)}).\n\nTotal Tagihan (+Denda ${formatRupiah(currentDenda)}): *${formatRupiah(totalJumlah)}*.\n\nMohon segera lakukan pembayaran via aplikasi MyKost.\n\nTerima kasih,\nPengelola MyKost`
        : `*[REMINDER TAGIHAN SEWA - MYKOST]*\n\nHalo Sdr/i ${nama},\n\nTagihan sewa *Kamar ${nomorKamar}* periode *${tagihan.periode}* sebesar *${formatRupiah(totalJumlah)}* akan jatuh tempo pada *${formatDateIndonesian(dueDate)}*.\n\nSilakan lakukan pembayaran via aplikasi MyKost.\n\nTerima kasih,\nPengelola MyKost`;

      const success = await sendWhatsAppMessage({
        target: phone,
        message: waMessage,
      });

      if (success) sentCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Pekerjaan Cron selesai. Menggunakan denda dinamis ${formatRupiah(dendaDynamic)}. Berhasil mengirim ${sentCount} WA.`,
      sentCount,
    });
  } catch (error: any) {
    console.error('Cron WA error:', error);
    return NextResponse.json({ error: error.message || 'Gagal menjalankan cron WA' }, { status: 500 });
  }
}
