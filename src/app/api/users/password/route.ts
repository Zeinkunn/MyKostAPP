import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiAuthError, requireAuthApi } from '@/lib/rbac';
import { hashPassword } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuthApi();
    const { old_password, new_password } = await req.json();

    if (!old_password || !new_password) {
      return NextResponse.json(
        { error: 'Kata sandi lama dan kata sandi baru wajib diisi' },
        { status: 400 }
      );
    }

    if (new_password.length < 6) {
      return NextResponse.json(
        { error: 'Kata sandi baru minimal 6 karakter' },
        { status: 400 }
      );
    }

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
    await prisma.user.update({
      where: { id: session.id },
      data: { password_hash: newHashedPassword },
    });

    return NextResponse.json({ success: true, message: 'Kata sandi berhasil diperbarui' });
  } catch (error: any) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Gagal mengubah kata sandi' }, { status: 500 });
  }
}
