import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, setSessionCookie } from '@/lib/auth';
import { normalizePhone } from '@/lib/phone';
import { hashToken } from '@/lib/token';
import { handleApiError } from '@/lib/errors';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

const registerSchema = z.object({
  nama: z.string().trim().min(1, 'Nama lengkap wajib diisi'),
  email: z.string().trim().email('Format email tidak valid'),
  no_hp: z.string().trim().min(8, 'Nomor HP minimal 8 digit'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  token: z.string().trim().min(1, 'Token aktivasi wajib disertakan'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = registerSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { nama, email, no_hp, password, token } = parseResult.data;
    const cleanPhone = normalizePhone(no_hp);
    const tokenHash = hashToken(token);

    // Verify token exists and is valid
    const aktivasiRecord = await prisma.aktivasiToken.findUnique({
      where: { token_hash: tokenHash },
      include: { penghuni: true },
    });

    if (!aktivasiRecord || aktivasiRecord.tipe !== 'AKTIVASI') {
      return NextResponse.json(
        { error: 'Token aktivasi tidak valid atau tautan aktivasi rusak.' },
        { status: 400 }
      );
    }

    if (aktivasiRecord.used_at !== null) {
      return NextResponse.json(
        { error: 'Token aktivasi ini sudah pernah digunakan. Silakan masuk via menu Login.' },
        { status: 400 }
      );
    }

    if (aktivasiRecord.expires_at < new Date()) {
      return NextResponse.json(
        { error: 'Masa berlaku token aktivasi telah habis (kedaluwarsa). Silakan minta link baru ke pengelola.' },
        { status: 400 }
      );
    }

    // Match phone number with token recipient
    if (normalizePhone(aktivasiRecord.penghuni.no_hp) !== cleanPhone) {
      return NextResponse.json(
        { error: 'Nomor WhatsApp tidak cocok dengan nomor penerima token aktivasi ini.' },
        { status: 400 }
      );
    }

    // Check if tenant already has an active account
    if (aktivasiRecord.penghuni.user_id) {
      return NextResponse.json(
        { error: 'Nomor HP ini sudah memiliki akun aktif. Silakan masuk via halaman Login.' },
        { status: 409 }
      );
    }

    // Check if email already registered
    const existingUserEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUserEmail) {
      return NextResponse.json(
        { error: 'Email ini sudah terdaftar. Silakan gunakan email lain atau login.' },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    // Atomically create user, link to penghuni, and mark token as used
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          nama: aktivasiRecord.penghuni.nama || nama,
          email,
          password_hash: hashedPassword,
          role: 'PENGHUNI',
          token_version: 0,
          penghuni: {
            connect: { id: aktivasiRecord.penghuni_id },
          },
        },
      });

      await tx.aktivasiToken.update({
        where: { id: aktivasiRecord.id },
        data: { used_at: new Date() },
      });

      return user;
    });

    // Auto-login session cookie
    await setSessionCookie({
      id: newUser.id,
      nama: newUser.nama,
      email: newUser.email,
      role: newUser.role,
      penghuni_id: aktivasiRecord.penghuni_id,
      token_version: newUser.token_version,
    });

    return NextResponse.json({
      success: true,
      role: newUser.role,
      redirectUrl: '/penghuni/beranda',
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Akun atau email ini sudah terdaftar pada sistem.' },
          { status: 409 }
        );
      }
    }
    return handleApiError(error, 'Terjadi kesalahan saat pendaftaran akun');
  }
}
