import crypto from 'node:crypto';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { AppError } from '../utils/AppError';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_DIMENSION = 6000;
const MAX_PIXELS = 24_000_000;
const MIN_DIMENSION = 32;

export interface ImageMetadata {
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  extension: 'jpg' | 'png' | 'webp';
  width: number;
  height: number;
  byteSize: number;
}

export interface UploadResult extends ImageMetadata {
  url: string;
  providerId: string;
  storageKey: string;
  provider: 'cloudinary';
}

function requireRange(buffer: Buffer, offset: number, length: number): void {
  if (offset < 0 || offset + length > buffer.length) {
    throw new AppError('The image file is malformed.', 422, true, 'INVALID_IMAGE');
  }
}

function dimensionsFromPng(buffer: Buffer): { width: number; height: number } {
  requireRange(buffer, 0, 24);
  if (buffer.toString('ascii', 12, 16) !== 'IHDR') {
    throw new AppError('The PNG image is malformed.', 422, true, 'INVALID_IMAGE');
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function dimensionsFromJpeg(buffer: Buffer): { width: number; height: number } {
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset++];
    if (marker === undefined || marker === 0xd9 || marker === 0xda) break;
    requireRange(buffer, offset, 2);
    const length = buffer.readUInt16BE(offset);
    if (length < 2) break;
    const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isStartOfFrame) {
      requireRange(buffer, offset, 7);
      return { height: buffer.readUInt16BE(offset + 3), width: buffer.readUInt16BE(offset + 5) };
    }
    offset += length;
  }
  throw new AppError('The JPEG image is malformed.', 422, true, 'INVALID_IMAGE');
}

function dimensionsFromWebp(buffer: Buffer): { width: number; height: number } {
  requireRange(buffer, 0, 16);
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunk = buffer.toString('ascii', offset, offset + 4);
    const length = buffer.readUInt32LE(offset + 4);
    const data = offset + 8;
    requireRange(buffer, data, length);
    if (chunk === 'VP8X') {
      requireRange(buffer, data, 10);
      return { width: 1 + buffer.readUIntLE(data + 4, 3), height: 1 + buffer.readUIntLE(data + 7, 3) };
    }
    if (chunk === 'VP8 ') {
      requireRange(buffer, data, 10);
      if (buffer[data + 3] !== 0x9d || buffer[data + 4] !== 0x01 || buffer[data + 5] !== 0x2a) break;
      return { width: buffer.readUInt16LE(data + 6) & 0x3fff, height: buffer.readUInt16LE(data + 8) & 0x3fff };
    }
    if (chunk === 'VP8L') {
      requireRange(buffer, data, 5);
      if (buffer[data] !== 0x2f) break;
      const first = buffer[data + 1];
      const second = buffer[data + 2];
      const third = buffer[data + 3];
      const fourth = buffer[data + 4];
      return { width: 1 + (first | ((second & 0x3f) << 8)), height: 1 + ((second >> 6) | (third << 2) | ((fourth & 0x0f) << 10)) };
    }
    offset = data + length + (length % 2);
  }
  throw new AppError('The WebP image is malformed.', 422, true, 'INVALID_IMAGE');
}

/** Validates actual bytes, never filename or client-declared MIME type. */
export function inspectImageBuffer(buffer: Buffer): ImageMetadata {
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
    throw new AppError(`File too large. Maximum size is ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`, 422, true, 'IMAGE_TOO_LARGE');
  }
  let metadata: Omit<ImageMetadata, 'byteSize'>;
  if (buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    metadata = { ...dimensionsFromPng(buffer), contentType: 'image/png', extension: 'png' };
  } else if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    metadata = { ...dimensionsFromJpeg(buffer), contentType: 'image/jpeg', extension: 'jpg' };
  } else if (buffer.length >= 16 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    metadata = { ...dimensionsFromWebp(buffer), contentType: 'image/webp', extension: 'webp' };
  } else {
    throw new AppError('Unsupported or invalid image. Upload a JPEG, PNG, or WebP file.', 422, true, 'INVALID_IMAGE');
  }
  if (metadata.width < MIN_DIMENSION || metadata.height < MIN_DIMENSION || metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION || metadata.width * metadata.height > MAX_PIXELS) {
    throw new AppError(`Image dimensions must be between ${MIN_DIMENSION}px and ${MAX_DIMENSION}px.`, 422, true, 'INVALID_IMAGE_DIMENSIONS');
  }
  return { ...metadata, byteSize: buffer.length };
}

/** Generates a server-controlled, non-guessable provider key. */
export function generateSafeStorageKey(userId: string, folder: 'wardrobe' | 'inspiration' | 'profile'): string {
  return `closetai/${folder}/${userId}/${crypto.randomBytes(24).toString('hex')}`;
}

function isCloudinaryConfigured(): boolean {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

let cloudinaryConfigured = false;

async function ensureCloudinary(): Promise<void> {
  if (cloudinaryConfigured) return;
  if (!isCloudinaryConfigured()) {
    throw new AppError('Image storage is not configured. Configure Cloudinary credentials before uploading.', 503, true, 'STORAGE_NOT_CONFIGURED');
  }
  if (env.IMAGE_STORAGE_VISIBILITY === 'private') {
    throw new AppError('Private image delivery is not configured. Refusing upload to prevent accidental exposure.', 503, true, 'PRIVATE_IMAGE_DELIVERY_NOT_CONFIGURED');
  }
  const { v2: cloudinary } = await import('cloudinary');
  cloudinary.config({ cloud_name: env.CLOUDINARY_CLOUD_NAME, api_key: env.CLOUDINARY_API_KEY, api_secret: env.CLOUDINARY_API_SECRET, secure: true });
  cloudinaryConfigured = true;
}

export async function uploadToCloudinary(buffer: Buffer, storageKey: string, metadata: ImageMetadata): Promise<UploadResult> {
  await ensureCloudinary();
  const { v2: cloudinary } = await import('cloudinary');
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ public_id: storageKey, resource_type: 'image', overwrite: false, invalidate: true, format: metadata.extension, transformation: [{ width: 1200, height: 1600, crop: 'limit', quality: 'auto:good' }] }, (error, result) => {
      if (error || !result) {
        reject(new AppError('Image upload failed. Your item was not changed.', 502, true, 'IMAGE_UPLOAD_FAILED'));
        return;
      }
      resolve({ url: result.secure_url, providerId: result.public_id, storageKey: result.public_id, provider: 'cloudinary', contentType: metadata.contentType, extension: metadata.extension, width: result.width ?? metadata.width, height: result.height ?? metadata.height, byteSize: result.bytes ?? metadata.byteSize });
    });
    stream.end(buffer);
  });
}

export async function deleteFromCloudinary(providerId: string): Promise<void> {
  if (!isCloudinaryConfigured()) return;
  try {
    if (!cloudinaryConfigured) await ensureCloudinary();
    const { v2: cloudinary } = await import('cloudinary');
    await cloudinary.uploader.destroy(providerId, { resource_type: 'image', invalidate: true });
  } catch {
    logger.warn('Cloud image cleanup failed. The asset may need manual cleanup.');
  }
}

export async function uploadImage(buffer: Buffer, userId: string, folder: 'wardrobe' | 'inspiration' | 'profile'): Promise<UploadResult> {
  const metadata = inspectImageBuffer(buffer);
  return uploadToCloudinary(buffer, generateSafeStorageKey(userId, folder), metadata);
}
