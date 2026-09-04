import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ujmegfvicbldyutpbers.supabase.co';
const SUPABASE_S3_ENDPOINT = process.env.SUPABASE_S3_ENDPOINT || 'https://ujmegfvicbldyutpbers.storage.supabase.co/storage/v1/s3';
const SUPABASE_REGION = process.env.SUPABASE_REGION || 'ap-northeast-1';
const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'product-images';

const accessKeyId = process.env.SUPABASE_S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.SUPABASE_S3_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY || '';

let s3Client: S3Client | null = null;

if (accessKeyId && secretAccessKey) {
  s3Client = new S3Client({
    forcePathStyle: true,
    region: SUPABASE_REGION,
    endpoint: SUPABASE_S3_ENDPOINT,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
  console.log('[StorageService] Supabase S3 Client configured with endpoint:', SUPABASE_S3_ENDPOINT);
} else {
  console.log('[StorageService] Notice: SUPABASE_S3_ACCESS_KEY_ID and SUPABASE_S3_SECRET_KEY not set in .env.');
}

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
}

export const storageService = {
  async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string = 'image/jpeg'
  ): Promise<UploadResult> {
    const timestamp = Date.now();
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `items/${timestamp}_${sanitizedName}`;

    // Standard public URL for Supabase storage bucket
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${key}`;

    if (s3Client) {
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
      });

      await s3Client.send(command);
      console.log(`[StorageService] Uploaded ${key} to Supabase S3`);
    } else {
      console.log(`[StorageService] S3 credentials pending. Generated public object URL: ${publicUrl}`);
    }

    return {
      url: publicUrl,
      key,
      bucket: BUCKET_NAME,
    };
  },

  async deleteFile(key: string): Promise<boolean> {
    if (!s3Client) return true;
    try {
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });
      await s3Client.send(command);
      return true;
    } catch (err) {
      console.error('[StorageService] Delete error:', err);
      return false;
    }
  },
};
