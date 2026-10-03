import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { hashToken } from '@/lib/token';
import { handleApiError } from '@/lib/errors';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, 'Token reset wajib disertakan'),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = resetPasswordSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0]?.message || 'Input tidak valid' },
        { status: 400 }
      );
    }

    const { token, password } = parseResult.data;
    const tokenHash = hashToken(token);

    const tokenRecord = await prisma.aktivasiToken.findUnique({
      where: { token_hash: tokenHash },
      include: {
        penghuni: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!tokenRecord || tokenRecord.tipe !== 'RESET_PASSWORD') {
      return NextResponse.json(
        { error: 'Tautan reset kata sandi tidak valid atau rusak.' },
        { status: 400 }
      );
    }

    if (tokenRecord.used_at !== null) {
      return NextResponse.json(
        { error: 'Tautan reset kata sandi ini sudah pernah digunakan.' },
        { status: 400 }
      );
    }

    if (tokenRecord.expires_at < new Date()) {
      return NextResponse.json(
        { error: 'Tautan reset kata sandi telah kedaluwarsa. Silakan minta tautan baru.' },
        { status: 400 }
      );
    }

    const user = tokenRecord.penghuni.user;
    if (!user) {
      return NextResponse.json(
        { error: 'Pengguna yang terkait dengan token ini tidak ditemukan.' },
        { status: 404 }
      );
    }

    const hashedPassword = await hashPassword(password);

    await prisma.$transaction(async (tx) => {
      // Update password and increment token_version to invalidate all existing sessions
      await tx.user.update({
        where: { id: user.id },
        data: {
          password_hash: hashedPassword,
          token_version: { increment: 1 },
        },
      });

      // Mark token as used
      await tx.aktivasiToken.update({
        where: { id: tokenRecord.id },
        data: { used_at: new Date() },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Kata sandi berhasil diperbarui. Silakan login dengan kata sandi baru Anda.',
    });
  } catch (error: any) {
    return handleApiError(error, 'Gagal mengatur ulang kata sandi');
  }
}
