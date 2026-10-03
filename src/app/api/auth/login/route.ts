import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, setSessionCookie } from '@/lib/auth';
import { normalizePhone } from '@/lib/phone';
import { handleApiError } from '@/lib/errors';
import { z } from 'zod';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Email/No HP wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = loginSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { identifier, password } = parseResult.data;

    // Normalization: email lowercase or phone normalized
    const isEmail = identifier.includes('@');
    const normalizedIdentifier = isEmail
      ? identifier.toLowerCase().trim()
      : normalizePhone(identifier);

    // Extract client IP address
    const forwardedFor = req.headers.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : req.headers.get('x-real-ip') || '127.0.0.1';

    // Shared Database Rate Limiting Key: IP + Identifier
    const rateLimitKey = `${clientIp}:${normalizedIdentifier}`;
    const now = new Date();

    // Check existing rate limit in DB
    const existingAttempt = await prisma.loginAttempt.findUnique({
      where: { key: rateLimitKey },
    });

    if (existingAttempt) {
      const timeDiff = now.getTime() - existingAttempt.updated_at.getTime();
      if (timeDiff <= WINDOW_MS && existingAttempt.attempts >= MAX_ATTEMPTS) {
        const remainingMinutes = Math.ceil((WINDOW_MS - timeDiff) / 60000);
        return NextResponse.json(
          {
            error: `Terlalu banyak percobaan login gagal. Silakan coba lagi dalam ${remainingMinutes} menit.`,
          },
          { status: 429 }
        );
      }
    }

    // Helper to increment failed attempts
    const recordFailedAttempt = async () => {
      try {
        if (!existingAttempt || now.getTime() - existingAttempt.updated_at.getTime() > WINDOW_MS) {
          await prisma.loginAttempt.upsert({
            where: { key: rateLimitKey },
            update: { attempts: 1, updated_at: now },
            create: { key: rateLimitKey, attempts: 1 },
          });
        } else {
          await prisma.loginAttempt.update({
            where: { key: rateLimitKey },
            data: { attempts: { increment: 1 }, updated_at: now },
          });
        }
      } catch (err) {
        console.error('Failed to record login attempt:', err);
      }
    };

    // Find user by normalized email OR normalized phone via Penghuni relation
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedIdentifier },
          { penghuni: { no_hp: normalizedIdentifier } },
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
      await recordFailedAttempt();
      return NextResponse.json(
        { error: 'Email/No HP atau password salah' },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      await recordFailedAttempt();
      return NextResponse.json(
        { error: 'Email/No HP atau password salah' },
        { status: 401 }
      );
    }

    // Login successful -> Clean rate limit entry
    try {
      await prisma.loginAttempt.deleteMany({
        where: { key: rateLimitKey },
      });
    } catch {
      // Ignore if already deleted
    }

    const activeKontrak = user.penghuni?.kontrak[0];

    // Set session cookie including token_version for revocation support
    await setSessionCookie({
      id: user.id,
      nama: user.nama,
      email: user.email,
      role: user.role,
      penghuni_id: user.penghuni?.id,
      kamar_id: activeKontrak?.kamar_id,
      token_version: user.token_version,
    });

    const redirectUrl = user.role === 'PENGHUNI' ? '/penghuni/beranda' : '/owner/dashboard';

    return NextResponse.json({
      success: true,
      role: user.role,
      redirectUrl,
    });
  } catch (error) {
    return handleApiError(error, 'Terjadi kesalahan saat proses login');
  }
}
