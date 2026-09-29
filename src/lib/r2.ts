import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';
import fs from 'fs/promises';

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

export async function uploadFile(
  fileBuffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const uniqueFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

  if (s3Client) {
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: uniqueFilename,
          Body: fileBuffer,
          ContentType: contentType,
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
