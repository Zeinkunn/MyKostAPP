import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthApi } from '@/lib/rbac';
import { uploadFile, deleteFile, FileValidationError } from '@/lib/r2';
import { logAktivitas } from '@/lib/log';
import { handleApiError } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuthApi();

    const formData = await req.formData();
    const file = formData.get('foto') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Berkas foto wajib dipilih' },
        { status: 400 }
      );
    }

    // Maximum 2MB server-side limit
    const MAX_PHOTO_SIZE = 2 * 1024 * 1024;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > MAX_PHOTO_SIZE) {
      return NextResponse.json(
        { error: 'Ukuran berkas foto melebihi batas maksimal 2MB' },
        { status: 400 }
      );
    }

    // Validate magic bytes and store via R2/local storage
    const key = await uploadFile(buffer, file.name, file.type);

    // Retrieve existing avatar to clean up later
    const existingUser = await prisma.user.findUnique({
      where: { id: session.id },
      select: { foto_url: true },
    });

    // Update user record
    const updatedUser = await prisma.user.update({
      where: { id: session.id },
      data: { foto_url: key },
      select: { id: true, foto_url: true, nama: true },
    });

    // Clean up old avatar from storage (best-effort)
    if (existingUser?.foto_url && existingUser.foto_url !== key) {
      try {
        await deleteFile(existingUser.foto_url);
      } catch (cleanupErr) {
        console.warn('Gagal membersihkan foto profil lama:', cleanupErr);
      }
    }

    await logAktivitas(
      session.id,
      'upload_foto_profil',
      `User ${updatedUser.nama} memperbarui foto profil`
    );

    return NextResponse.json({
      success: true,
      message: 'Foto profil berhasil diperbarui',
      foto_url: key,
    });
  } catch (error: any) {
    if (error instanceof FileValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return handleApiError(error, 'Gagal mengunggah foto profil');
  }
}
