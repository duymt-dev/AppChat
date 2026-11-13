// Ảnh mẫu tối thiểu cho media sản phẩm (TIP-027b) — sinh trong bộ nhớ, không tệp nhị phân trong repo. Chỉ header + khung đủ cho bộ kiểm
// cấu trúc (không giải mã điểm ảnh): PNG (tuỳ chọn APNG `acTL`), JPEG (SOF0), WEBP (VP8X, tuỳ chọn hoạt ảnh).
const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const le32 = (n: number) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
const le24 = (n: number) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255];
const chunk = (type: string, data: number[] = []) => [...be32(data.length), ...Buffer.from(type, 'latin1'), ...data, 0, 0, 0, 0];

export const pngOf = (w: number, h: number, apng = false): Uint8Array =>
  new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...chunk('IHDR', [...be32(w), ...be32(h), 8, 6, 0, 0, 0]), ...(apng ? chunk('acTL', [0, 0, 0, 2, 0, 0, 0, 0]) : []), ...chunk('IDAT', [0x78, 0x9c, 0, 0]), ...chunk('IEND')]);

export const jpegOf = (w: number, h: number): Uint8Array =>
  new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, ...Buffer.from('JFIF\0', 'latin1'), 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xc0, 0, 17, 8, h >> 8, h & 255, w >> 8, w & 255, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1, 0xff, 0xda, 0, 8, 1, 1, 0, 0, 0x3f, 0, 0, 0xff, 0xd9]);

const riff = (body: number[]) => new Uint8Array([...Buffer.from('RIFF', 'latin1'), ...le32(body.length + 4), ...Buffer.from('WEBP', 'latin1'), ...body]);
const sub = (t: string, data: number[]) => [...Buffer.from(t, 'latin1'), ...le32(data.length), ...data, ...(data.length & 1 ? [0] : [])];

export const webpOf = (w: number, h: number, animated = false): Uint8Array =>
  riff([...sub('VP8X', [animated ? 0x02 : 0, 0, 0, 0, ...le24(w - 1), ...le24(h - 1)]), ...(animated ? sub('ANIM', [0, 0, 0, 0, 0, 0]) : []), ...sub('VP8 ', [0, 0, 0, 0x9d, 0x01, 0x2a, w & 255, w >> 8, h & 255, h >> 8])]);
