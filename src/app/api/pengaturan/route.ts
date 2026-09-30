import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiAuthError, requireAuthApi, requireRoleApi } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { logAktivitas } from '@/lib/log';

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
          wa_template:
            'Halo Sdr/i {NAMA},\n\nTagihan sewa kamar {KAMAR} periode {PERIODE} sebesar {JUMLAH} akan jatuh tempo pada {JATUH_TEMPO}.\n\nMohon lakukan pembayaran via aplikasi MyKost. Terima kasih!',
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error: any) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireRoleApi([Role.OWNER, Role.ADMIN]);
    const { harga_default, denda_per_hari, wa_template } = await req.json();

    const updated = await prisma.pengaturan.upsert({
      where: { id: 'default' },
      update: {
        ...(harga_default !== undefined && { harga_default: parseFloat(harga_default) }),
        ...(denda_per_hari !== undefined && { denda_per_hari: parseFloat(denda_per_hari) }),
        ...(wa_template !== undefined && { wa_template }),
      },
      create: {
        id: 'default',
        harga_default: parseFloat(harga_default || '1500000'),
        denda_per_hari: parseFloat(denda_per_hari || '50000'),
        wa_template: wa_template || '',
      },
    });

    await logAktivitas(
      session.id,
      'update_pengaturan',
      `Memperbarui pengaturan sistem (denda per hari: Rp ${updated.denda_per_hari})`
    );

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Gagal menyimpan pengaturan' }, { status: 500 });
  }
}
