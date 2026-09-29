import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Email/No HP dan Password wajib diisi' },
        { status: 400 }
      );
    }

    // Search by email or no_hp via Penghuni relation
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { penghuni: { no_hp: identifier } },
        ],
      },
      include: {
        penghuni: {
          include: {
            kontrak: {
              where: { status: 'AKTIF' },
              include: { kamar: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Email/No HP atau password salah' },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Email/No HP atau password salah' },
        { status: 401 }
      );
    }

    const activeKontrak = user.penghuni?.kontrak[0];

    await setSessionCookie({
      id: user.id,
      nama: user.nama,
      email: user.email,
      role: user.role,
      penghuni_id: user.penghuni?.id,
      kamar_id: activeKontrak?.kamar_id,
    });

    const redirectUrl = user.role === 'PENGHUNI' ? '/penghuni/beranda' : '/owner/dashboard';

    return NextResponse.json({
      success: true,
      role: user.role,
      redirectUrl,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
