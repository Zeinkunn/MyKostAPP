import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, setSessionCookie } from '@/lib/auth';

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
}

// In-memory rate limiting map (resets on server restart)
const loginAttempts = new Map<string, RateLimitEntry>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(req: NextRequest) {
  try {
    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Email/No HP dan Password wajib diisi' },
        { status: 400 }
      );
    }

    const key = identifier.toLowerCase().trim();
    const now = Date.now();
    const rateRecord = loginAttempts.get(key);

    // Rate Limit check
    if (rateRecord) {
      if (now - rateRecord.firstAttempt > WINDOW_MS) {
        loginAttempts.delete(key);
      } else if (rateRecord.attempts >= MAX_ATTEMPTS) {
        const remainingMinutes = Math.ceil((WINDOW_MS - (now - rateRecord.firstAttempt)) / 60000);
        return NextResponse.json(
          {
            error: `Terlalu banyak percobaan login gagal. Silakan coba lagi dalam ${remainingMinutes} menit.`,
          },
          { status: 429 }
        );
      }
    }

    // Helper to record failed attempt
    const recordFailedAttempt = () => {
      const current = loginAttempts.get(key);
      if (!current || now - current.firstAttempt > WINDOW_MS) {
        loginAttempts.set(key, { attempts: 1, firstAttempt: now });
      } else {
        current.attempts += 1;
      }
    };

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
      recordFailedAttempt();
      return NextResponse.json(
        { error: 'Email/No HP atau password salah' },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      recordFailedAttempt();
      return NextResponse.json(
        { error: 'Email/No HP atau password salah' },
        { status: 401 }
      );
    }

    // Successful login -> Reset rate limit counter
    loginAttempts.delete(key);

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
