import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthApi, requireRoleApi } from '@/lib/rbac';
import { Role, DendaMode } from '@prisma/client';
import { logAktivitas } from '@/lib/log';
import { handleApiError } from '@/lib/errors';
import { z } from 'zod';

export async function GET() {
  try {
    await requireAuthApi();
    let settings = await prisma.pengaturan.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      settings = await prisma.pengaturan.create({
        data: {
          id: 'default',
          harga_default: 1500000,
          denda_per_hari: 50000,
          denda_mode: DendaMode.HARIAN,
          batas_reminder_hari: 3,
          wa_template:
            'Halo Sdr/i {NAMA},\n\nTagihan sewa kamar {KAMAR} periode {PERIODE} sebesar {JUMLAH} akan jatuh tempo pada {JATUH_TEMPO}.\n\nMohon lakukan pembayaran via aplikasi MyKost. Terima kasih!',
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error: any) {
    return handleApiError(error, 'Gagal mengambil pengaturan sistem');
  }
}

const updatePengaturanSchema = z.object({
  harga_default: z.coerce.number().positive().optional(),
  denda_per_hari: z.coerce.number().min(0).optional(),
  denda_mode: z.enum([DendaMode.HARIAN, DendaMode.TETAP]).optional(),
  batas_reminder_hari: z.coerce.number().int().min(1).max(30).optional(),
  wa_template: z.string().optional(),
  bank_nama: z.string().trim().max(100).optional().nullable(),
  bank_no_rekening: z.string().trim().max(100).optional().nullable(),
  bank_atas_nama: z.string().trim().max(150).optional().nullable(),
  kontak_pengelola_wa: z.string().trim().max(30).optional().nullable(),
});

export async function PUT(req: NextRequest) {
  try {
    const session = await requireRoleApi([Role.OWNER, Role.ADMIN]);
    const body = await req.json();

    const parseResult = updatePengaturanSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const {
      harga_default,
      denda_per_hari,
      denda_mode,
      batas_reminder_hari,
      wa_template,
      bank_nama,
      bank_no_rekening,
      bank_atas_nama,
      kontak_pengelola_wa,
    } = parseResult.data;

    const updated = await prisma.pengaturan.upsert({
      where: { id: 'default' },
      update: {
        ...(harga_default !== undefined && { harga_default }),
        ...(denda_per_hari !== undefined && { denda_per_hari }),
        ...(denda_mode !== undefined && { denda_mode }),
        ...(batas_reminder_hari !== undefined && { batas_reminder_hari }),
        ...(wa_template !== undefined && { wa_template }),
        ...(bank_nama !== undefined && { bank_nama: bank_nama || null }),
        ...(bank_no_rekening !== undefined && { bank_no_rekening: bank_no_rekening || null }),
        ...(bank_atas_nama !== undefined && { bank_atas_nama: bank_atas_nama || null }),
        ...(kontak_pengelola_wa !== undefined && { kontak_pengelola_wa: kontak_pengelola_wa || null }),
      },
      create: {
        id: 'default',
        harga_default: harga_default ?? 1500000,
        denda_per_hari: denda_per_hari ?? 50000,
        denda_mode: denda_mode ?? DendaMode.HARIAN,
        batas_reminder_hari: batas_reminder_hari ?? 3,
        wa_template: wa_template || '',
        bank_nama: bank_nama || null,
        bank_no_rekening: bank_no_rekening || null,
        bank_atas_nama: bank_atas_nama || null,
        kontak_pengelola_wa: kontak_pengelola_wa || null,
      },
    });

    await logAktivitas(
      session.id,
      'update_pengaturan',
      `Memperbarui pengaturan sistem & rekening (${updated.bank_nama || 'Tanpa Bank'}, Denda: ${updated.denda_mode})`
    );

    return NextResponse.json(updated);
  } catch (error: any) {
    return handleApiError(error, 'Gagal menyimpan pengaturan');
  }
}
