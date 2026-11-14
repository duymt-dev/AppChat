// uuidv7 (RFC 9562): 48 bit ms + 74 bit ngẫu nhiên — id bảng hot và traceId (Blueprint §2.1, ops §1.3).
import { randomBytes } from 'node:crypto';

let lastMs = -1;
let seq = 0;

/** Trong cùng 1 ms, 12 bit `rand_a` làm bộ đếm để id sinh trong một tiến trình tăng dần đơn điệu. */
export function uuidv7(nowMs: number = Date.now()): string {
  const b = randomBytes(16);
  if (nowMs <= lastMs) {
    seq = (seq + 1) & 0xfff;
    if (seq === 0) lastMs += 1;
    nowMs = lastMs;
  } else {
    lastMs = nowMs;
    seq = b.readUInt16BE(6) & 0x7ff;
  }
  b.writeUIntBE(nowMs, 0, 6);
  b[6] = 0x70 | (seq >> 8);
  b[7] = seq & 0xff;
  b[8] = 0x80 | (b[8]! & 0x3f);
  const h = b.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
