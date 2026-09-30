import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN || 'http://localhost:3000/uploads';

const isR2Configured =
  R2_ACCOUNT_ID &&
  R2_ACCOUNT_ID !== 'mock-account-id' &&
  R2_ACCESS_KEY_ID &&
  R2_SECRET_ACCESS_KEY;

const s3Client = isR2Configured
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
const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export async function uploadFile(
  fileBuffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  // Validate file size (max 5MB)
  if (fileBuffer.length > MAX_FILE_SIZE) {
    throw new FileValidationError('Ukuran file melebihi batas maksimal 5MB.', 400);
  }

  // Validate file content type
  const normalizedType = contentType.toLowerCase().trim();
  if (!ALLOWED_CONTENT_TYPES.includes(normalizedType)) {
    throw new FileValidationError(
      'Format file tidak didukung. Harap unggah gambar (JPEG, PNG, WEBP).',
      400
    );
  }

  const uniqueFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

  if (s3Client) {
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: uniqueFilename,
          Body: fileBuffer,
          ContentType: normalizedType,
        })
      );
      return `${R2_PUBLIC_DOMAIN}/${uniqueFilename}`;
    } catch (error) {
      console.error('R2 upload failed, falling back to local:', error);
    }
  }

  // Local storage fallback for dev / testing
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(uploadDir, { recursive: true });
  const localFilePath = path.join(uploadDir, uniqueFilename);
  await fs.writeFile(localFilePath, fileBuffer);
  return `/uploads/${uniqueFilename}`;
}
