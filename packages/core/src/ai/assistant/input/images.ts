// Ảnh PNG/JPEG đầu vào (TIP-023f §2.5): kiểm loại / header / kích thước TRƯỚC khi gửi provider — ≤ 4096 px mỗi cạnh, ≤ 16 MP; SVG /
// GIF / ảnh động / loại khác bị từ chối (không fallback giải mã tuỳ ý). Không hứa xoá / ẩn danh pixel hay metadata ảnh.
import { INPUT_MAX_IMAGE_PIXELS, INPUT_MAX_IMAGE_SIDE } from '@appchat/shared/input-limits';
import { InputParseError } from './parse-bounds';

export interface ImageInfo {
  kind: 'png' | 'jpeg';
  width: number;
  height: number;
}

function pngSize(b: Buffer): { width: number; height: number; animated: boolean } {
  if (b.length < 33 || b.toString('latin1', 12, 16) !== 'IHDR') throw new InputParseError('corrupt');
  // acTL trước IDAT → PNG động (APNG).
  const idat = b.indexOf('IDAT', 8, 'latin1');
  const actl = b.indexOf('acTL', 8, 'latin1');
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), animated: actl > 0 && (idat < 0 || actl < idat) };
}

function jpegSize(b: Buffer): { width: number; height: number } {
  let p = 2;
  while (p + 9 < b.length) {
    if (b[p] !== 0xff) throw new InputParseError('corrupt');
    const marker = b[p + 1]!;
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      p += 2;
      continue;
    }
    const len = b.readUInt16BE(p + 2);
    // SOF0..SOF15 trừ DHT(C4) / JPG(C8) / DAC(CC).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return { height: b.readUInt16BE(p + 5), width: b.readUInt16BE(p + 7) };
    p += 2 + len;
  }
  throw new InputParseError('corrupt');
}

export function inspectImage(kind: 'png' | 'jpeg', body: Buffer): ImageInfo {
  const s = kind === 'png' ? pngSize(body) : { ...jpegSize(body), animated: false };
  if (s.animated) throw new InputParseError('unsupported_type');
  if (!s.width || !s.height) throw new InputParseError('corrupt');
  if (s.width > INPUT_MAX_IMAGE_SIDE || s.height > INPUT_MAX_IMAGE_SIDE || s.width * s.height > INPUT_MAX_IMAGE_PIXELS) throw new InputParseError('image_bounds');
  return { kind, width: s.width, height: s.height };
}
