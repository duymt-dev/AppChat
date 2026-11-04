// Đọc central directory của ZIP bằng tay, KHÔNG giải nén (TIP-045b annex B; trước đây ở documents/security — chuyển xuống kernel để
// upload guard dùng chung, documents dùng lại qua kernel, không có chiều kernel → documents). Từ chối trước khi inflate: ZIP64 / đa đĩa,
// quá nhiều entry, entry / tổng giải nén quá lớn, tỷ lệ nén bất thường (zip bomb), tên entry tuyệt đối / đi ngược thư mục, entry mã hoá.
export interface ZipEntry {
  name: string;
  compressed: number;
  size: number;
  encrypted: boolean;
}

export interface ZipLimits {
  entries: number;
  expanded: number;
  perEntry: number;
  ratio: number;
}

export type ZipRefusal = 'not_zip' | 'zip_bomb' | 'path_traversal' | 'encrypted';

export class ZipRefusedError extends Error {
  constructor(readonly reason: ZipRefusal) {
    super(`zip_refused:${reason}`);
    this.name = 'ZipRefusedError';
  }
}

const EOCD_SIG = 0x06054b50;
const CEN_SIG = 0x02014b50;

/** Central directory (không giải nén). Số entry vượt `maxEntries` → zip_bomb. */
export function zipEntries(buf: Uint8Array, maxEntries: number): ZipEntry[] {
  if (buf.length < 22) throw new ZipRefusedError('not_zip');
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  // EOCD ở cuối, có thể kèm comment ≤ 65535 byte.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 0xffff); i--) {
    if (v.getUint32(i, true) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new ZipRefusedError('not_zip');
  const count = v.getUint16(eocd + 10, true);
  const cdSize = v.getUint32(eocd + 12, true);
  const cdOff = v.getUint32(eocd + 16, true);
  if (count === 0xffff || cdOff === 0xffffffff || cdOff + cdSize > buf.length) throw new ZipRefusedError('not_zip');
  if (count > maxEntries) throw new ZipRefusedError('zip_bomb');
  const out: ZipEntry[] = [];
  let p = cdOff;
  const dec = new TextDecoder('utf-8', { fatal: false });
  for (let n = 0; n < count; n++) {
    if (p + 46 > buf.length || v.getUint32(p, true) !== CEN_SIG) throw new ZipRefusedError('not_zip');
    const flags = v.getUint16(p + 8, true);
    const compressed = v.getUint32(p + 20, true);
    const size = v.getUint32(p + 24, true);
    const nameLen = v.getUint16(p + 28, true);
    const extraLen = v.getUint16(p + 30, true);
    const commentLen = v.getUint16(p + 32, true);
    if (compressed === 0xffffffff || size === 0xffffffff) throw new ZipRefusedError('zip_bomb');
    out.push({ name: dec.decode(buf.subarray(p + 46, p + 46 + nameLen)), compressed, size, encrypted: (flags & 1) === 1 });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

/** Giới hạn trước inflate: tổng / từng entry / tỷ lệ nén / tên entry an toàn / không mã hoá. */
export function checkZipShape(entries: readonly ZipEntry[], l: ZipLimits): void {
  let total = 0;
  for (const e of entries) {
    if (e.name.startsWith('/') || e.name.includes('\\') || /^[a-z]:/i.test(e.name) || e.name.split('/').includes('..')) throw new ZipRefusedError('path_traversal');
    if (e.encrypted) throw new ZipRefusedError('encrypted');
    if (e.size > l.perEntry) throw new ZipRefusedError('zip_bomb');
    if (e.compressed > 0 && e.size / e.compressed > l.ratio) throw new ZipRefusedError('zip_bomb');
    if (e.compressed === 0 && e.size > 0) throw new ZipRefusedError('zip_bomb');
    total += e.size;
    if (total > l.expanded) throw new ZipRefusedError('zip_bomb');
  }
}
