import { NextRequest, NextResponse } from 'next/server';
import { requireAuthApi } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getFileSignedUrl, s3Client } from '@/lib/r2';
import { handleApiError } from '@/lib/errors';
import { canAccessFile } from '@/lib/file-auth';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuthApi();
    const key = req.nextUrl.searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Parameter key wajib disertakan' }, { status: 400 });
    }

    // Reject external URLs to prevent open redirect vulnerabilities
    if (key.startsWith('http://') || key.startsWith('https://') || key.startsWith('//')) {
      return NextResponse.json({ error: 'Format key file tidak valid' }, { status: 400 });
    }

    const rawKey = key.startsWith('/uploads/') ? key.slice('/uploads/'.length) : key;

    // Prevent path traversal
    const sanitizedKey = path.basename(rawKey);
    if (!sanitizedKey || sanitizedKey !== rawKey) {
      return NextResponse.json({ error: 'Format key file tidak valid' }, { status: 400 });
    }

    // Role-based Authorization
    if (session.role === Role.PENGHUNI) {
      // 1. Check if it's tenant's own profile avatar
      const ownUser = await prisma.user.findFirst({
        where: { id: session.id, foto_url: sanitizedKey },
        select: { id: true, foto_url: true },
      });

      let isAuthorized = canAccessFile(session.role, session.id, sanitizedKey, {
        userFotoUrl: ownUser?.foto_url,
      });

      // 2. Check if it's tenant's own payment proof
      if (!isAuthorized) {
        const payment = await prisma.pembayaran.findFirst({
          where: {
            bukti_url: sanitizedKey,
            tagihan: {
              kontrak: {
                penghuni: {
                  user_id: session.id,
                },
              },
            },
          },
          select: {
            tagihan: {
              select: {
                kontrak: {
                  select: {
                    penghuni: {
                      select: { user_id: true },
                    },
                  },
                },
              },
            },
          },
        });

        const paymentUserId = payment?.tagihan?.kontrak?.penghuni?.user_id;
        if (paymentUserId) {
          isAuthorized = canAccessFile(session.role, session.id, sanitizedKey, {
            paymentUserIds: [paymentUserId],
          });
        }
      }

      // 3. Check if it's attached to tenant's own complaint
      if (!isAuthorized) {
        const complaints = await prisma.pengaduan.findMany({
          where: {
            penghuni: {
              user_id: session.id,
            },
          },
          select: { foto_url: true },
        });

        const hasComplaintPhoto = complaints.some((c) => {
          if (Array.isArray(c.foto_url)) {
            return (c.foto_url as string[]).includes(sanitizedKey);
          }
          return false;
        });

        if (hasComplaintPhoto) {
          isAuthorized = canAccessFile(session.role, session.id, sanitizedKey, {
            complaintUserIds: [session.id],
          });
        }
      }

      // 4. Check if it's a general room photo (accessible by all tenants)
      if (!isAuthorized) {
        const roomPhoto = await prisma.kamar.findFirst({
          where: { foto_url: sanitizedKey },
          select: { id: true },
        });
        if (roomPhoto) {
          isAuthorized = canAccessFile(session.role, session.id, sanitizedKey, {
            isRoomPhoto: true,
          });
        }
      }

      if (!isAuthorized) {
        return NextResponse.json(
          { error: 'Forbidden: Anda tidak memiliki akses untuk melihat berkas ini' },
          { status: 403 }
        );
      }
    }

    // Authorized (OWNER, ADMIN, or authorized PENGHUNI)
    const cacheHeaders = {
      'Cache-Control': 'private, max-age=600',
    };

    if (s3Client) {
      const signedUrl = await getFileSignedUrl(sanitizedKey, 900); // 15 minutes validity
      return NextResponse.redirect(signedUrl, { status: 302, headers: cacheHeaders });
    }

    // Local dev fallback
    return NextResponse.redirect(new URL(`/uploads/${sanitizedKey}`, req.url), {
      status: 302,
      headers: cacheHeaders,
    });
  } catch (error: any) {
    return handleApiError(error, 'Gagal memproses permintaan berkas');
  }
}
