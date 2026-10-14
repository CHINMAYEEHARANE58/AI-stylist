import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { generateSafeStorageKey, inspectImageBuffer } from './imageService';
import { AppError } from '../utils/AppError';

const LOCAL_KEY = /^[a-f0-9]{48}\.webp$/;

export interface PreparedInspirationImage {
  bytes: Buffer;
  contentType: 'image/webp';
  byteSize: number;
  width: number;
  height: number;
  imageHash: string;
}

export interface StoredInspirationImage {
  storageProvider: 'local' | 'cloudinary';
  storageKey: string;
  imageProviderId: string;
}

function localDirectory(): string {
  return path.resolve(env.INSPIRATION_LOCAL_DIR ?? path.join(process.cwd(), '.local-uploads'));
}

function localPath(key: string): string {
  if (!LOCAL_KEY.test(key)) {
    throw new AppError('Stored inspiration image is unavailable.', 404);
  }
  return path.join(localDirectory(), key);
}

/** Decode and re-encode on the server; this strips image metadata and rejects malformed pixels. */
export async function prepareInspirationImage(buffer: Buffer): Promise<PreparedInspirationImage> {
  inspectImageBuffer(buffer);
  try {
    const result = await sharp(buffer, { limitInputPixels: 24_000_000, failOn: 'error' })
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 88 })
      .toBuffer({ resolveWithObject: true });
    return {
      bytes: result.data,
      contentType: 'image/webp',
      byteSize: result.data.length,
      width: result.info.width,
      height: result.info.height,
      imageHash: crypto.createHash('sha256').update(result.data).digest('hex'),
    };
  } catch {
    throw new AppError('The image could not be decoded. Upload a valid JPEG, PNG, or WebP image.', 422, true, 'INVALID_IMAGE');
  }
}

async function cloudinaryClient() {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new AppError('Inspiration image storage is not configured.', 503, true, 'STORAGE_NOT_CONFIGURED');
  }
  const { v2: cloudinary } = await import('cloudinary');
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary;
}

export async function storeInspirationImage(image: PreparedInspirationImage, userId: string): Promise<StoredInspirationImage> {
  if (env.INSPIRATION_STORAGE_PROVIDER === 'local') {
    if (env.NODE_ENV !== 'development' && env.NODE_ENV !== 'test') {
      throw new AppError('Local inspiration storage is development-only.', 503, true, 'LOCAL_STORAGE_DISABLED');
    }
    const key = `${crypto.randomBytes(24).toString('hex')}.webp`;
    await fs.mkdir(localDirectory(), { recursive: true, mode: 0o700 });
    await fs.writeFile(localPath(key), image.bytes, { flag: 'wx', mode: 0o600 });
    return { storageProvider: 'local', storageKey: key, imageProviderId: key };
  }

  const cloudinary = await cloudinaryClient();
  const publicId = generateSafeStorageKey(userId, 'inspiration');
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      public_id: publicId,
      resource_type: 'image',
      type: 'authenticated',
      overwrite: false,
      format: 'webp',
    }, (error, result) => {
      if (error || !result) {
        reject(new AppError('Inspiration image upload failed. Please retry.', 502, true, 'IMAGE_UPLOAD_FAILED'));
        return;
      }
      resolve({ storageProvider: 'cloudinary', storageKey: result.public_id, imageProviderId: result.public_id });
    });
    stream.end(image.bytes);
  });
}

export async function readLocalInspirationImage(key: string): Promise<Buffer> {
  try {
    return await fs.readFile(localPath(key));
  } catch {
    throw new AppError('Stored inspiration image is unavailable.', 404);
  }
}

export async function cloudinaryInspirationDownloadUrl(publicId: string): Promise<string> {
  if (!publicId.startsWith('closetai/inspiration/')) {
    throw new AppError('Stored inspiration image is unavailable.', 404);
  }
  const cloudinary = await cloudinaryClient();
  return cloudinary.utils.private_download_url(publicId, 'webp', {
    type: 'authenticated',
    expires_at: Math.floor(Date.now() / 1000) + 60,
    attachment: false,
  });
}

export async function deleteStoredInspirationImage(asset: Pick<StoredInspirationImage, 'storageProvider' | 'storageKey'>): Promise<void> {
  if (asset.storageProvider === 'local') {
    try {
      await fs.unlink(localPath(asset.storageKey));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') { throw error; }
    }
    return;
  }
  const cloudinary = await cloudinaryClient();
  const result = await cloudinary.uploader.destroy(asset.storageKey, { resource_type: 'image', type: 'authenticated', invalidate: true });
  if (result.result !== 'ok' && result.result !== 'not found') {
    logger.warn('Cloudinary inspiration cleanup did not confirm deletion.');
  }
}
