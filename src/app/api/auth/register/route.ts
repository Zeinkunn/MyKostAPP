import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { nama, email, no_hp, password } = await req.json();

    if (!nama || !email || !no_hp || !password) {
      return NextResponse.json(
        { error: 'Semua field wajib diisi' },
        { status: 400 }
      );
    }

    // Mandatory business rule 6.1: Verify Phone Number exists in PENGHUNI table (added by admin)
    const existingPenghuni = await prisma.penghuni.findUnique({
      where: { no_hp },
    });

    if (!existingPenghuni) {
      return NextResponse.json(
        {
          error:
            'Nomor HP Anda belum terdaftar dalam kontrak sewa. Silakan hubungi pengelola kost terlebih dahulu.',
        },
        { status: 403 }
      );
    }

    if (existingPenghuni.user_id) {
      return NextResponse.json(
        { error: 'Nomor HP ini sudah memiliki akun aktif. Silakan masuk via halaman Login.' },
        { status: 400 }
      );
    }

    // Check if email already used by another User
    const existingUserEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUserEmail) {
      return NextResponse.json(
        { error: 'Email ini sudah terdaftar. Silakan gunakan email lain atau login.' },
        { status: 400 }
      );
    }

    // Create User record and link to existing Penghuni record
    const hashedPassword = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        nama: existingPenghuni.nama || nama,
        email,
        password_hash: hashedPassword,
        role: 'PENGHUNI',
        penghuni: {
          connect: { id: existingPenghuni.id },
        },
      },
    });

    await setSessionCookie({
      id: newUser.id,
      nama: newUser.nama,
      email: newUser.email,
      role: newUser.role,
      penghuni_id: existingPenghuni.id,
    });

    return NextResponse.json({
      success: true,
      role: newUser.role,
      redirectUrl: '/penghuni/beranda',
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat pendaftaran akun' },
      { status: 500 }
    );
  }
}
