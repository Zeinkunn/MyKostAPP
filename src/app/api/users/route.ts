import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    await requireRole([Role.OWNER]);
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
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole([Role.OWNER]);
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

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal menambahkan user' }, { status: 500 });
  }
}
