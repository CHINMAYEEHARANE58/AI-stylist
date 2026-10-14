import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { prepareInspirationImage } from './inspirationStorage';

describe('inspiration upload preparation', () => {
  it('decodes a real image and strips it into bounded WebP bytes', async () => {
    const source = await sharp({ create: { width: 80, height: 64, channels: 3, background: '#eedfcc' } }).png().toBuffer();
    const prepared = await prepareInspirationImage(source);
    expect(prepared.contentType).toBe('image/webp');
    expect(prepared.width).toBe(80);
    expect(prepared.height).toBe(64);
    expect(prepared.bytes.toString('ascii', 8, 12)).toBe('WEBP');
    expect(prepared.imageHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects invalid and oversized input before storage or AI calls', async () => {
    await expect(prepareInspirationImage(Buffer.from('not an image'))).rejects.toThrow(/Unsupported or invalid image/);
    await expect(prepareInspirationImage(Buffer.alloc(10 * 1024 * 1024 + 1))).rejects.toThrow(/too large/i);
  });

  it('rejects spoofed PNG headers whose pixels cannot be decoded', async () => {
    const fake = Buffer.alloc(24);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(fake);
    fake.write('IHDR', 12);
    fake.writeUInt32BE(64, 16);
    fake.writeUInt32BE(64, 20);
    await expect(prepareInspirationImage(fake)).rejects.toThrow(/could not be decoded/);
  });
});
