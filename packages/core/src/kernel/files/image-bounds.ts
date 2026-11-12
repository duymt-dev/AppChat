// Giới hạn ảnh đọc từ header (TIP-027b §1.2) — thuần, không giải mã điểm ảnh, chạy trong bundle kiểm cấu trúc cô lập (không kiểm ở trình
// duyệt). PNG (IHDR + chặn APNG `acTL`), JPEG (SOFn đầu tiên trước SOS), WEBP (VP8 / VP8L / VP8X + chặn ANIM / ANMF / cờ hoạt ảnh). Cạnh
// ≤ 8000 px, tổng ≤ 40 megapixel. Không hứa đã gỡ EXIF hay không có mã độc — chỉ là hình dạng hợp lệ trong giới hạn.
export const IMAGE_LIMITS = { maxSide: 8000, maxPixels: 40_000_000 } as const;

export type ImageBoundsReason = 'image_too_large' | 'animated' | 'corrupt';
export type ImageBounds = { ok: true; width: number; height: number } | { ok: false; reason: ImageBoundsReason };

const ascii = (b: Uint8Array, at: number, n: number) => String.fromCharCode(...b.subarray(at, at + n));
const u16be = (b: Uint8Array, at: number) => (b[at]! << 8) | b[at + 1]!;
const u16le = (b: Uint8Array, at: number) => b[at]! | (b[at + 1]! << 8);
const u24le = (b: Uint8Array, at: number) => b[at]! | (b[at + 1]! << 8) | (b[at + 2]! << 16);
const u32be = (b: Uint8Array, at: number) => ((b[at]! << 24) | (b[at + 1]! << 16) | (b[at + 2]! << 8) | b[at + 3]!) >>> 0;
const u32le = (b: Uint8Array, at: number) => (b[at]! | (b[at + 1]! << 8) | (b[at + 2]! << 16) | (b[at + 3]! << 24)) >>> 0;

function png(b: Uint8Array): ImageBounds {
  if (b.length < 33 || ascii(b, 12, 4) !== 'IHDR') return { ok: false, reason: 'corrupt' };
  // Duyệt chunk tới IDAT: có `acTL` → APNG (hoạt ảnh).
  for (let at = 8; at + 8 <= b.length; ) {
    const len = u32be(b, at);
    const type = ascii(b, at + 4, 4);
    if (type === 'acTL') return { ok: false, reason: 'animated' };
    if (type === 'IDAT' || type === 'IEND') break;
    if (len > b.length) return { ok: false, reason: 'corrupt' };
    at += 12 + len;
  }
  return { ok: true, width: u32be(b, 16), height: u32be(b, 20) };
}

function jpeg(b: Uint8Array): ImageBounds {
  for (let at = 2; at + 9 < b.length; ) {
    if (b[at] !== 0xff) return { ok: false, reason: 'corrupt' };
    const m = b[at + 1]!;
    if (m === 0xff) {
      at++;
      continue;
    }
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) {
      at += 2;
      continue;
    }
    if (m === 0xd9 || m === 0xda) break;
    // SOF0..SOF15 trừ DHT (C4), JPG (C8), DAC (CC): cao ở +5, rộng ở +7.
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { ok: true, width: u16be(b, at + 7), height: u16be(b, at + 5) };
    at += 2 + u16be(b, at + 2);
  }
  return { ok: false, reason: 'corrupt' };
}

function webp(b: Uint8Array): ImageBounds {
  if (b.length < 30 || ascii(b, 0, 4) !== 'RIFF' || ascii(b, 8, 4) !== 'WEBP') return { ok: false, reason: 'corrupt' };
  for (let at = 12; at + 8 <= b.length; ) {
    const t = ascii(b, at, 4);
    if (t === 'ANIM' || t === 'ANMF') return { ok: false, reason: 'animated' };
    const size = u32le(b, at + 4);
    if (size > b.length) return { ok: false, reason: 'corrupt' };
    at += 8 + size + (size & 1);
  }
  const kind = ascii(b, 12, 4);
  if (kind === 'VP8X') {
    if (b[20]! & 0x02) return { ok: false, reason: 'animated' };
    return { ok: true, width: 1 + u24le(b, 24), height: 1 + u24le(b, 27) };
  }
  if (kind === 'VP8 ') {
    if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return { ok: false, reason: 'corrupt' };
    return { ok: true, width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff };
  }
  if (kind === 'VP8L') {
    if (b[20] !== 0x2f) return { ok: false, reason: 'corrupt' };
    return { ok: true, width: 1 + (((b[22]! & 0x3f) << 8) | b[21]!), height: 1 + (((b[24]! & 0x0f) << 10) | (b[23]! << 2) | ((b[22]! & 0xc0) >> 6)) };
  }
  return { ok: false, reason: 'corrupt' };
}

/** Kích thước + chặn hoạt ảnh + giới hạn cạnh / điểm ảnh cho ảnh đã nhận diện loại. */
export function imageBounds(kind: 'png' | 'jpeg' | 'webp', b: Uint8Array): ImageBounds {
  const r = kind === 'png' ? png(b) : kind === 'jpeg' ? jpeg(b) : webp(b);
  if (!r.ok) return r;
  if (!r.width || !r.height) return { ok: false, reason: 'corrupt' };
  if (r.width > IMAGE_LIMITS.maxSide || r.height > IMAGE_LIMITS.maxSide || r.width * r.height > IMAGE_LIMITS.maxPixels) return { ok: false, reason: 'image_too_large' };
  return r;
}
