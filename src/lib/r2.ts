import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';

export class FileValidationError extends Error {
  status: number;
  constructor(message: string, status: number = 400) {
    super(message);
    this.name = 'FileValidationError';
    this.status = status;
  }
}

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'mykost-storage';

export const isR2Configured = Boolean(
  R2_ACCOUNT_ID &&
  R2_ACCOUNT_ID !== 'mock-account-id' &&
  R2_ACCESS_KEY_ID &&
  R2_SECRET_ACCESS_KEY
);

export const s3Client = isR2Configured
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    })
  : null;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function detectImageFromBytes(buffer: Buffer): { ext: string; mime: string } | null {
  // JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { ext: 'png', mime: 'image/png' };
  }
  // WebP: RIFF .... WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { ext: 'webp', mime: 'image/webp' };
  }
  return null;
}

export async function uploadFile(
  fileBuffer: Buffer,
  _filename?: string,
  _contentType?: string
): Promise<string> {
  // 1. Validate magic bytes from buffer
  const detected = detectImageFromBytes(fileBuffer);
  if (!detected) {
    throw new FileValidationError(
      'Format file tidak valid. Harap unggah berkas gambar asli bertipe JPEG, PNG, atau WEBP.',
      400
    );
  }

  // 2. Validate max size (5MB)
  if (fileBuffer.length > MAX_FILE_SIZE) {
    throw new FileValidationError('Ukuran file melebihi batas maksimal 5MB.', 400);
  }

  // 3. Generate randomUUID key with detected extension (ignore original file extension)
  const key = `${crypto.randomUUID()}.${detected.ext}`;

  // 4. Production check: reject if R2 is not configured
  if (process.env.NODE_ENV === 'production' && !isR2Configured) {
    throw new FileValidationError(
      'Layanan Cloudflare R2 belum dikonfigurasi di lingkungan production.',
      500
    );
  }

  // 5. Upload to Cloudflare R2 if configured
  if (s3Client) {
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: key,
          Body: fileBuffer,
          ContentType: detected.mime,
        })
      );
      return key;
    } catch (error) {
      console.error('R2 upload failed:', error);
      if (process.env.NODE_ENV === 'production') {
        throw new FileValidationError('Gagal mengunggah file ke penyimpanan Cloudflare R2.', 500);
      }
    }
  }

  // 6. Local storage fallback strictly for local development / testing
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, key), fileBuffer);
  return key;
}

export async function getFileSignedUrl(key: string, expiresIn = 900): Promise<string> {
  if (s3Client) {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });
    return await getSignedUrl(s3Client, command, { expiresIn });
  }
  // Local fallback
  return `/uploads/${key}`;
}

export async function deleteFile(key?: string | null): Promise<void> {
  if (!key) return;
  const sanitizedKey = path.basename(key);
  if (!sanitizedKey) return;

  if (s3Client) {
    try {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: sanitizedKey,
        })
      );
    } catch (err) {
      console.warn('Gagal menghapus file dari Cloudflare R2:', err);
    }
  }

  // Also clean up local file if present
  try {
    const localPath = path.join(process.cwd(), 'public', 'uploads', sanitizedKey);
    await fs.unlink(localPath);
  } catch {
    // Ignore if file doesn't exist
  }
}

