import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthApi, requireRoleApi } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { hashPassword, setSessionCookie } from '@/lib/auth';
import { logAktivitas } from '@/lib/log';
import { handleApiError } from '@/lib/errors';
import { z } from 'zod';

export async function GET() {
  try {
    await requireRoleApi([Role.OWNER]);
    const users = await prisma.user.findMany({
      select: {
        id: true,
        nama: true,
        email: true,
        role: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });
    return NextResponse.json(users);
  } catch (error: any) {
    return handleApiError(error, 'Gagal mengambil daftar pengguna');
  }
}

const createUserSchema = z.object({
  nama: z.string().trim().min(1, 'Nama wajib diisi'),
  email: z.string().trim().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  role: z.enum([Role.OWNER, Role.ADMIN], {
    errorMap: () => ({
      message: 'Role tidak valid. Hanya OWNER atau ADMIN yang dapat dibuat lewat endpoint ini.',
    }),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireRoleApi([Role.OWNER]);
    const body = await req.json();

    const parseResult = createUserSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { nama, email, password, role } = parseResult.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'Email ini sudah terdaftar' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    const newUser = await prisma.user.create({
      data: {
        nama,
        email,
        password_hash: hashedPassword,
        role: role as Role,
      },
      select: { id: true, nama: true, email: true, role: true, created_at: true },
    });

    await logAktivitas(
      session.id,
      'tambah_user',
      `Menambahkan user pengelola baru ${newUser.nama} (${newUser.email}) dengan role ${newUser.role}`
    );

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    return handleApiError(error, 'Gagal menambahkan user baru');
  }
}

const updateProfileSchema = z.object({
  nama: z.string().trim().min(1, 'Nama wajib diisi'),
  email: z.string().trim().email('Format email tidak valid'),
});

// Update Self Profile
export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuthApi();
    const body = await req.json();

    const parseResult = updateProfileSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { nama, email } = parseResult.data;

    // Check if email taken by another user
    const existingEmail = await prisma.user.findFirst({
      where: { email, NOT: { id: session.id } },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email ini sudah digunakan oleh pengguna lain' },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.id },
      data: { nama, email },
    });

    if (session.role === Role.PENGHUNI) {
      await prisma.penghuni.updateMany({
        where: { user_id: session.id },
        data: { nama, email },
      });
    }

    // Refresh session cookie and PRESERVE kamar_id and token_version
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
      message: 'Profil berhasil diperbarui',
      user: {
        id: updatedUser.id,
        nama: updatedUser.nama,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    });
  } catch (error: any) {
    return handleApiError(error, 'Gagal mengupdate profil');
  }
}

const resetAdminPasswordSchema = z.object({
  userId: z.string().min(1, 'User ID wajib diisi'),
  newPassword: z.string().min(8, 'Password baru minimal 8 karakter'),
});

// OWNER can reset ADMIN password
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireRoleApi([Role.OWNER]);
    const body = await req.json();

    const parseResult = resetAdminPasswordSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { userId, newPassword } = parseResult.data;

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    if (targetUser.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: 'Hanya kata sandi akun ADMIN yang dapat direset oleh OWNER via menu ini' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password_hash: hashedPassword,
        token_version: { increment: 1 },
      },
    });

    await logAktivitas(
      session.id,
      'reset_password_admin',
      `Owner mereset kata sandi untuk admin ${targetUser.nama} (${targetUser.email})`
    );

    return NextResponse.json({
      success: true,
      message: `Kata sandi untuk ${targetUser.nama} berhasil diatur ulang`,
    });
  } catch (error: any) {
    return handleApiError(error, 'Gagal mereset kata sandi admin');
  }
}

