import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthApi } from '@/lib/rbac';
import { hashPassword, setSessionCookie } from '@/lib/auth';
import { handleApiError } from '@/lib/errors';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const changePasswordSchema = z.object({
  old_password: z.string().min(1, 'Kata sandi lama wajib diisi'),
  new_password: z.string().min(8, 'Kata sandi baru minimal 8 karakter'),
});

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuthApi();
    const body = await req.json();

    const parseResult = changePasswordSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { old_password, new_password } = parseResult.data;

    const user = await prisma.user.findUnique({
      where: { id: session.id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(old_password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Kata sandi lama yang Anda masukkan salah' },
        { status: 400 }
      );
    }

    const newHashedPassword = await hashPassword(new_password);
    
    // Increment token_version so all old active sessions across other devices are invalidated
    const updatedUser = await prisma.user.update({
      where: { id: session.id },
      data: {
        password_hash: newHashedPassword,
        token_version: { increment: 1 },
      },
    });

    // Re-issue cookie with updated token_version for the current browser
    await setSessionCookie({
      id: updatedUser.id,
      nama: updatedUser.nama,
      email: updatedUser.email,
      role: updatedUser.role,
      penghuni_id: session.penghuni_id,
      kamar_id: session.kamar_id,
      token_version: updatedUser.token_version,
    });

    return NextResponse.json({
      success: true,
      message: 'Kata sandi berhasil diperbarui. Sesi pada perangkat lain telah dinonaktifkan.',
    });
  } catch (error: any) {
    return handleApiError(error, 'Gagal mengubah kata sandi');
  }
}
