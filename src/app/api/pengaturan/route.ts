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

    const { harga_default, denda_per_hari, denda_mode, batas_reminder_hari, wa_template } =
      parseResult.data;

    const updated = await prisma.pengaturan.upsert({
      where: { id: 'default' },
      update: {
        ...(harga_default !== undefined && { harga_default }),
        ...(denda_per_hari !== undefined && { denda_per_hari }),
        ...(denda_mode !== undefined && { denda_mode }),
        ...(batas_reminder_hari !== undefined && { batas_reminder_hari }),
        ...(wa_template !== undefined && { wa_template }),
      },
      create: {
        id: 'default',
        harga_default: harga_default ?? 1500000,
        denda_per_hari: denda_per_hari ?? 50000,
        denda_mode: denda_mode ?? DendaMode.HARIAN,
        batas_reminder_hari: batas_reminder_hari ?? 3,
        wa_template: wa_template || '',
      },
    });

    await logAktivitas(
      session.id,
      'update_pengaturan',
      `Memperbarui pengaturan sistem (Mode denda: ${updated.denda_mode}, Denda: Rp ${updated.denda_per_hari}, Batas reminder: ${updated.batas_reminder_hari} hari)`
    );

    return NextResponse.json(updated);
  } catch (error: any) {
    return handleApiError(error, 'Gagal menyimpan pengaturan');
  }
}
