import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiAuthError, requireAuthApi, requireRoleApi } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { hashPassword, setSessionCookie } from '@/lib/auth';
import { logAktivitas } from '@/lib/log';

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
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRoleApi([Role.OWNER]);
    const { nama, email, password, role } = await req.json();

    if (!nama || !email || !password || !role) {
      return NextResponse.json({ error: 'Nama, Email, Password, dan Role wajib diisi' }, { status: 400 });
    }

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
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Gagal menambahkan user' }, { status: 500 });
  }
}

// Update Self Profile
export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuthApi();
    const { nama, email } = await req.json();

    if (!nama || !email) {
      return NextResponse.json({ error: 'Nama dan Email wajib diisi' }, { status: 400 });
    }

    // Check if email taken by another user
    const existingEmail = await prisma.user.findFirst({
      where: { email, NOT: { id: session.id } },
    });

    if (existingEmail) {
      return NextResponse.json({ error: 'Email ini sudah digunakan oleh pengguna lain' }, { status: 400 });
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

    // Refresh session cookie
    await setSessionCookie({
      id: updatedUser.id,
      nama: updatedUser.nama,
      email: updatedUser.email,
      role: updatedUser.role,
      penghuni_id: session.penghuni_id,
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
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Gagal mengupdate profil' }, { status: 500 });
  }
}
