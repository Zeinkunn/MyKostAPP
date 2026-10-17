import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizePhone } from '@/lib/phone';
import { createAktivasiToken } from '@/lib/token';
import { sendWhatsAppMessage } from '@/lib/fonnte';
import { handleApiError } from '@/lib/errors';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(3, 'Email atau Nomor HP wajib diisi'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = forgotPasswordSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Input tidak valid' },
        { status: 400 }
      );
    }

    const { identifier } = parseResult.data;
    let penghuni = null;

    if (identifier.includes('@')) {
      const user = await prisma.user.findUnique({
        where: { email: identifier.toLowerCase() },
        include: { penghuni: true },
      });
      if (user && user.penghuni) {
        penghuni = user.penghuni;
      }
    } else {
      const cleanPhone = normalizePhone(identifier);
      penghuni = await prisma.penghuni.findUnique({
        where: { no_hp: cleanPhone },
      });
    }

    // If penghuni exists and has user account, generate token and send WA (with 3-minute cooldown protection)
    if (penghuni && penghuni.user_id) {
      const cooldownThreshold = new Date(Date.now() - 3 * 60 * 1000);
      const recentToken = await prisma.aktivasiToken.findFirst({
        where: {
          penghuni_id: penghuni.id,
          tipe: 'RESET_PASSWORD',
          used_at: null,
          created_at: { gte: cooldownThreshold },
        },
        select: { id: true },
      });

      if (!recentToken) {
        const rawToken = await createAktivasiToken(penghuni.id, 'RESET_PASSWORD', 1);
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin || 'http://localhost:3000';
        const resetLink = `${appUrl}/reset-password?token=${rawToken}`;

        const pesan = `Halo ${penghuni.nama},\n\nKami menerima permintaan pengaturan ulang kata sandi untuk akun MyKost Anda. Silakan klik tautan berikut untuk membuat kata sandi baru:\n\n${resetLink}\n\nTautan ini hanya berlaku 24 jam dan hanya dapat digunakan 1 kali. Jika Anda tidak merasa meminta ini, abaikan pesan ini.`;

        await sendWhatsAppMessage({
          target: penghuni.no_hp,
          message: pesan,
        });
      }
    }


    // Always respond with success to avoid account enumeration
    return NextResponse.json({
      success: true,
      message: 'Jika akun terdaftar, instruksi reset kata sandi telah dikirim ke nomor WhatsApp Anda.',
    });
  } catch (error: any) {
    return handleApiError(error, 'Gagal memproses permintaan reset kata sandi');
  }
}
