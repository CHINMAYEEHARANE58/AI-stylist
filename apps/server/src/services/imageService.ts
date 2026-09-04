/**
 * Image upload service.
 * Uses Cloudinary when credentials are configured, otherwise stores a reference
 * to the original URL (dev fallback — no binary stored in DB).
 */
import path from 'node:path';
import crypto from 'node:crypto';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { AppError } from '../utils/AppError';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_EXT  = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_FILES      = 5;

export interface UploadResult {
  url: string;
  providerId?: string;
  provider: 'cloudinary' | 'local-dev';
}

// ── Validation ────────────────────────────────────────────────────────

export function validateImageFile(
  mimetype: string,
  originalname: string,
  size: number,
): void {
  if (!ALLOWED_MIME.has(mimetype)) {
    throw new AppError(`File type not allowed. Accepted: JPEG, PNG, WEBP, GIF.`, 422);
  }
  const ext = path.extname(originalname).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    throw new AppError(`File extension not allowed.`, 422);
  }
  if (size > MAX_FILE_BYTES) {
    throw new AppError(`File too large. Maximum size is 10 MB.`, 422);
  }
}

export function validateFileCount(count: number): void {
  if (count > MAX_FILES) {
    throw new AppError(`Too many files. Maximum ${MAX_FILES} files per request.`, 422);
  }
}

// Generate a safe, unpredictable server-side filename
export function generateSafeFilename(userId: string, folder: string): string {
  const random = crypto.randomBytes(16).toString('hex');
  return `closetai/${folder}/${userId}/${random}`;
}

// ── Cloudinary upload ─────────────────────────────────────────────────

let cloudinaryConfigured = false;

async function ensureCloudinary() {
  if (cloudinaryConfigured) return;
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new AppError('Image storage not configured on server.', 500);
  }
  const { v2: cloudinary } = await import('cloudinary');
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  cloudinaryConfigured = true;
}

export async function uploadToCloudinary(
  buffer: Buffer,
  publicId: string,
  mimeType: string,
): Promise<UploadResult> {
  await ensureCloudinary();
  const { v2: cloudinary } = await import('cloudinary');

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: 'image',
        overwrite: false,
        invalidate: true,
        format: mimeType === 'image/png' ? 'png' : 'jpg',
        transformation: [
          { width: 1200, height: 1600, crop: 'limit', quality: 'auto:good' },
        ],
      },
      (error, result) => {
        if (error || !result) {
          reject(new AppError('Image upload failed.', 500));
          return;
        }
        resolve({ url: result.secure_url, providerId: result.public_id, provider: 'cloudinary' });
      },
    );
    stream.end(buffer);
  });
}

export async function deleteFromCloudinary(providerId: string): Promise<void> {
  if (!env.CLOUDINARY_CLOUD_NAME) return;
  try {
    await ensureCloudinary();
    const { v2: cloudinary } = await import('cloudinary');
    await cloudinary.uploader.destroy(providerId);
  } catch (err) {
    logger.warn(`Failed to delete image ${providerId} from Cloudinary: ${err}`);
  }
}

// ── Upload dispatcher ─────────────────────────────────────────────────

export async function uploadImage(
  buffer: Buffer,
  originalname: string,
  mimetype: string,
  size: number,
  userId: string,
  folder: 'wardrobe' | 'inspiration' | 'profile',
): Promise<UploadResult> {
  validateImageFile(mimetype, originalname, size);

  if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
    const publicId = generateSafeFilename(userId, folder);
    return uploadToCloudinary(buffer, publicId, mimetype);
  }

  // Dev fallback: return a placeholder URL (no binary stored)
  logger.warn('Image upload: Cloudinary not configured — returning dev placeholder.');
  return {
    url: `https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=600&q=80`,
    provider: 'local-dev',
  };
}
