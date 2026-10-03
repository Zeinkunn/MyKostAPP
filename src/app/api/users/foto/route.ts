import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthApi } from '@/lib/rbac';
import { uploadFile, deleteFile, detectImageFromBytes, FileValidationError } from '@/lib/r2';
import { logAktivitas } from '@/lib/log';
import { handleApiError } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuthApi();

    const formData = await req.formData();
    const rawFile = formData.get('foto');

    // 1. Verify that 'foto' is provided and is an actual File instance (not string/null)
    if (!rawFile || !(rawFile instanceof File)) {
      return NextResponse.json(
        { error: 'Berkas foto tidak valid atau tidak dipilih' },
        { status: 400 }
      );
    }

    // 2. Validate file size BEFORE reading arrayBuffer to prevent memory exhaustion
    const MAX_PHOTO_SIZE = 2 * 1024 * 1024; // 2MB
    if (rawFile.size > MAX_PHOTO_SIZE) {
      return NextResponse.json(
        { error: 'Ukuran berkas foto melebihi batas maksimal 2MB' },
        { status: 400 }
      );
    }

    // 3. Read buffer into memory
    const arrayBuffer = await rawFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Validate magic bytes from buffer as sole source of truth (do NOT trust client file.type)
    const detected = detectImageFromBytes(buffer);
    const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

    if (!detected || !ALLOWED_MIMES.includes(detected.mime)) {
      return NextResponse.json(
        {
          error:
            'Format berkas tidak valid. Harap unggah berkas gambar asli bertipe JPEG, PNG, atau WEBP.',
        },
        { status: 400 }
      );
    }

    // 5. Upload file using detected mime type and validated magic bytes
    const key = await uploadFile(buffer, rawFile.name, detected.mime);

    // 6. Retrieve existing avatar key to clean up after successful update
    const existingUser = await prisma.user.findUnique({
      where: { id: session.id },
      select: { foto_url: true },
    });

    // 7. Update user record in database
    const updatedUser = await prisma.user.update({
      where: { id: session.id },
      data: { foto_url: key },
      select: { id: true, foto_url: true, nama: true },
    });

    // 8. Clean up old avatar from storage (best-effort)
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
