import { NextRequest, NextResponse } from 'next/server';
import { requireAuthApi } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getFileSignedUrl, s3Client } from '@/lib/r2';
import { handleApiError } from '@/lib/errors';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuthApi();
    const key = req.nextUrl.searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Parameter key wajib disertakan' }, { status: 400 });
    }

    // Fallback: If legacy full URL is passed, redirect directly
    if (key.startsWith('http://') || key.startsWith('https://') || key.startsWith('/uploads/')) {
      return NextResponse.redirect(key);
    }

    // Prevent path traversal
    const sanitizedKey = path.basename(key);
    if (!sanitizedKey || sanitizedKey !== key) {
      return NextResponse.json({ error: 'Format key file tidak valid' }, { status: 400 });
    }

    // Role-based Authorization
    if (session.role === Role.PENGHUNI) {
      // 1. Check if it's tenant's own payment proof
      const payment = await prisma.pembayaran.findFirst({
        where: {
          bukti_url: key,
          tagihan: {
            kontrak: {
              penghuni: {
                user_id: session.id,
              },
            },
          },
        },
      });

      let isAuthorized = Boolean(payment);

      // 2. Check if it's attached to tenant's own complaint
      if (!isAuthorized) {
        const complaints = await prisma.pengaduan.findMany({
          where: {
            penghuni: {
              user_id: session.id,
            },
          },
          select: { foto_url: true },
        });

        isAuthorized = complaints.some((c) => {
          if (Array.isArray(c.foto_url)) {
            return (c.foto_url as string[]).includes(key);
          }
          return false;
        });
      }

      // 3. Check if it's a general room photo (accessible by all tenants)
      if (!isAuthorized) {
        const roomPhoto = await prisma.kamar.findFirst({
          where: { foto_url: key },
          select: { id: true },
        });
        isAuthorized = Boolean(roomPhoto);
      }

      if (!isAuthorized) {
        return NextResponse.json(
          { error: 'Forbidden: Anda tidak memiliki akses untuk melihat berkas ini' },
          { status: 403 }
        );
      }
    }

    // Authorized (OWNER, ADMIN, or authorized PENGHUNI)
    if (s3Client) {
      const signedUrl = await getFileSignedUrl(key, 900); // 15 minutes validity
      return NextResponse.redirect(signedUrl, 302);
    }

    // Local dev fallback
    return NextResponse.redirect(new URL(`/uploads/${key}`, req.url));
  } catch (error: any) {
    return handleApiError(error, 'Gagal memproses permintaan berkas');
  }
}
