import { describe, expect, it } from 'vitest';
import { MAX_IMAGE_BYTES, inspectImageBuffer } from './imageService';

function png(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
  buffer.write('IHDR', 12, 'ascii');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

describe('image byte validation', () => {
  it('accepts a valid PNG based on file bytes and reads dimensions', () => {
    expect(inspectImageBuffer(png(640, 480))).toMatchObject({ contentType: 'image/png', width: 640, height: 480, byteSize: 24 });
  });

  it('rejects a non-image even if a browser claims it is an image', () => {
    expect(() => inspectImageBuffer(Buffer.from('not actually an image'))).toThrow(/Unsupported or invalid image/);
  });

  it('rejects images with unsafe dimensions', () => {
    expect(() => inspectImageBuffer(png(12, 12))).toThrow(/dimensions/);
    expect(() => inspectImageBuffer(png(7000, 6000))).toThrow(/dimensions/);
  });

  it('rejects oversized image bodies before inspecting them', () => {
    expect(() => inspectImageBuffer(Buffer.alloc(MAX_IMAGE_BYTES + 1))).toThrow(/too large/i);
  });
});
