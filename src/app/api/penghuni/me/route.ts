import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoleApi } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { normalizePhone } from '@/lib/phone';
import { handleApiError } from '@/lib/errors';
import { logAktivitas } from '@/lib/log';
import { z } from 'zod';

const updateEmergencyContactSchema = z.object({
  kontak_darurat_nama: z.string().trim().max(100).optional().nullable(),
  kontak_darurat_hp: z.string().trim().max(30).optional().nullable(),
});

export async function PUT(req: NextRequest) {
  try {
    const session = await requireRoleApi([Role.PENGHUNI]);
    const body = await req.json();

    const parseResult = updateEmergencyContactSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { kontak_darurat_nama, kontak_darurat_hp } = parseResult.data;

    let normalizedHp = kontak_darurat_hp;
    if (kontak_darurat_hp) {
      normalizedHp = normalizePhone(kontak_darurat_hp);
    }

    const updatedPenghuni = await prisma.penghuni.update({
      where: { user_id: session.id },
      data: {
        kontak_darurat_nama: kontak_darurat_nama || null,
        kontak_darurat_hp: normalizedHp || null,
      },
    });

    await logAktivitas(
      session.id,
      'update_kontak_darurat',
      `Penghuni ${session.nama} memperbarui kontak darurat`
    );

    return NextResponse.json({
      success: true,
      message: 'Kontak darurat berhasil disimpan',
      penghuni: {
        id: updatedPenghuni.id,
        kontak_darurat_nama: updatedPenghuni.kontak_darurat_nama,
        kontak_darurat_hp: updatedPenghuni.kontak_darurat_hp,
      },
    });
  } catch (error: any) {
    return handleApiError(error, 'Gagal memperbarui kontak darurat');
  }
}
