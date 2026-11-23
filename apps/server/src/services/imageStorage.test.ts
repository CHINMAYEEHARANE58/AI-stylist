import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ upload: vi.fn(), configure: vi.fn() }));
vi.mock('../config/env', () => ({ env: { NODE_ENV: 'test', CLOUDINARY_CLOUD_NAME: 'test-cloud',
  CLOUDINARY_API_KEY: '123456', CLOUDINARY_API_SECRET: 'test-secret', IMAGE_STORAGE_VISIBILITY: 'public' } }));
vi.mock('cloudinary', () => ({ v2: { config: mocks.configure, uploader: { upload_stream: mocks.upload } } }));
import { uploadToCloudinary } from './imageService';

const metadata = { width: 128, height: 128, byteSize: 128, contentType: 'image/png' as const, extension: 'png' as const };

describe('Cloudinary upload errors', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([401, 403])('reports HTTP %s as a storage authentication failure without leaking provider details', async (http_code) => {
    mocks.upload.mockImplementation((_options, callback) => ({ end: () => callback({ http_code,
      message: 'api_secret mismatch: private-provider-details' }, null) }));
    const error = await uploadToCloudinary(Buffer.from('test'), 'disposable-test-key', metadata).catch((value: Error) => value);
    expect(error).toMatchObject({ statusCode: 503, code: 'STORAGE_AUTH_FAILED' });
    expect((error as Error).message).not.toContain('private-provider-details');
  });

  it('keeps other provider failures distinct from credential errors', async () => {
    mocks.upload.mockImplementation((_options, callback) => ({ end: () => callback({ http_code: 500 }, null) }));
    await expect(uploadToCloudinary(Buffer.from('test'), 'disposable-test-key', metadata))
      .rejects.toMatchObject({ statusCode: 502, code: 'IMAGE_UPLOAD_FAILED' });
  });
});
