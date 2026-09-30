import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiAuthError, requireRoleApi } from '@/lib/rbac';
import { Role, StatusKamar, StatusKontrak, StatusTagihan } from '@prisma/client';
import { sendWhatsAppMessage } from '@/lib/fonnte';
import { logAktivitas } from '@/lib/log';

export async function GET() {
  try {
    await requireRoleApi([Role.OWNER, Role.ADMIN]);
    const listKontrak = await prisma.kontrak.findMany({
      include: {
        kamar: { select: { nomor_kamar: true, tipe: true, harga_sewa: true } },
        penghuni: { select: { nama: true, no_hp: true, email: true } },
        tagihan: { orderBy: { created_at: 'desc' }, take: 1 },
      },
      orderBy: { tanggal_mulai: 'desc' },
    });

    return NextResponse.json(listKontrak);
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
    const {
      kamar_id,
      penghuni_id,
      tanggal_mulai,
      tanggal_selesai,
      harga_sewa_disepakati,
      deposit_awal,
      dokumen_url,
    } = await req.json();

    if (!kamar_id || !penghuni_id || !tanggal_mulai || !tanggal_selesai || !harga_sewa_disepakati) {
      return NextResponse.json(
        { error: 'Kamar, Penghuni, Tanggal Mulai/Selesai, dan Harga Sewa wajib diisi' },
        { status: 400 }
      );
    }

    const startDate = new Date(tanggal_mulai);
    const endDate = new Date(tanggal_selesai);
    const hargaDecimal = parseFloat(harga_sewa_disepakati);
    const depositDecimal = deposit_awal ? parseFloat(deposit_awal) : null;

    // Business Rule 6.1 Steps:
    // 1. Transaction to check room status, create Kontrak, update Kamar to TERISI, & generate first Tagihan
    const result = await prisma.$transaction(async (tx) => {
      // Priority 4: Check if room is KOSONG before booking
      const targetKamar = await tx.kamar.findUnique({
        where: { id: kamar_id },
      });

      if (!targetKamar) {
        throw new Error('Kamar tidak ditemukan');
      }

      if (targetKamar.status !== StatusKamar.KOSONG) {
        throw new Error(
          `Kamar ini sedang tidak tersedia (status saat ini: ${targetKamar.status}), tidak bisa membuat kontrak baru.`
        );
      }

      // Create Kontrak
      const kontrak = await tx.kontrak.create({
        data: {
          kamar_id,
          penghuni_id,
          tanggal_mulai: startDate,
          tanggal_selesai: endDate,
          harga_sewa_disepakati: hargaDecimal,
          deposit_awal: depositDecimal,
          status: StatusKontrak.AKTIF,
          dokumen_url,
        },
        include: {
          kamar: true,
          penghuni: true,
        },
      });

      // Update Kamar status to TERISI
      await tx.kamar.update({
        where: { id: kamar_id },
        data: { status: StatusKamar.TERISI },
      });

      // Generate First Tagihan automatically
      const year = startDate.getFullYear();
      const month = String(startDate.getMonth() + 1).padStart(2, '0');
      const periode = `${year}-${month}`;

      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + 7); // 7 days from start

      const tagihan = await tx.tagihan.create({
        data: {
          kontrak_id: kontrak.id,
          periode,
          jumlah: hargaDecimal,
          denda: 0,
          jatuh_tempo: dueDate,
          status: StatusTagihan.BELUM_BAYAR,
        },
      });

      return { kontrak, tagihan };
    });

    // Send WhatsApp activation message to Penghuni (Alur 6.1 step 6)
    const phone = result.kontrak.penghuni.no_hp;
    const namaPenghuni = result.kontrak.penghuni.nama;
    const nomorKamar = result.kontrak.kamar.nomor_kamar;

    const waMessage = `Halo Sdr/i ${namaPenghuni},\n\nKontrak sewa Anda untuk *Kamar ${nomorKamar}* telah aktif!\n\nSilakan buka aplikasi MyKost dan lakukan *Daftar Akun* menggunakan nomor WhatsApp ini (${phone}) untuk mengakses tagihan & layanan kamar Anda.\n\nTerima kasih,\nPengelola MyKost`;

    await sendWhatsAppMessage({
      target: phone,
      message: waMessage,
    });

    // Audit Log (Priority 6)
    await logAktivitas(
      session.id,
      'buat_kontrak',
      `Membuat kontrak sewa baru untuk ${namaPenghuni} di Kamar ${nomorKamar}`
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const isValidationError =
      error.message?.includes('Kamar ini sedang tidak tersedia') ||
      error.message?.includes('Kamar tidak ditemukan');

    if (isValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Create kontrak error:', error);
    return NextResponse.json({ error: error.message || 'Gagal membuat kontrak sewa' }, { status: 500 });
  }
}
