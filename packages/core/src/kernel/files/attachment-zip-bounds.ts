// Giới hạn gói Office cho tệp đính kèm bản ghi (TIP-032d §2.1): kiểm central directory TRƯỚC khi giải nén (≤ 2000 entry, ≤ 50 MiB giải nén,
// tỷ lệ ≤ 100, không đi ngược thư mục / symlink / mã hoá / macro / quan hệ ngoài / entry chồng lấn), rồi giải nén THẬT từng entry bằng
// pizzip và đếm byte quan sát được — không tin số trong header. Thuần (không mạng / đĩa), chạy trong tiến trình con cô lập.
import { zipEntries, checkZipShape, ZipRefusedError } from './zip-guard';

export const ATTACHMENT_ZIP = { entries: 2000, expanded: 50 * 1024 * 1024, perEntry: 50 * 1024 * 1024, ratio: 100 } as const;

const MACRO = /(^|\/)vbaProject\.bin$|(^|\/)vbaData\.xml$|(^|\/)activeX\//i;
// Quan hệ ngoài NẠP nội dung (template, OLE, ảnh / khung liên kết…) bị chặn; hyperlink chỉ là địa chỉ hiển thị, không tự tải → cho qua.
const REL = /<Relationship\b[^>]*>/gi;
const externalLoad = (xml: string) => (xml.match(REL) ?? []).some((r) => /TargetMode\s*=\s*"External"/i.test(r) && !/Type\s*=\s*"[^"]*\/hyperlink"/i.test(r));
const S_IFLNK = 0o120000;

export type ZipBoundsReason = 'zip_bomb' | 'path_traversal' | 'encrypted' | 'macro' | 'external_relationship' | 'symlink' | 'corrupt';

/** Thuộc tính ngoài của entry (unix mode ở 16 bit cao) + offset local header — đọc thẳng central directory. */
function centralMeta(buf: Uint8Array): { mode: number; local: number; compressed: number }[] {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 0xffff); i--)
    if (v.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const out: { mode: number; local: number; compressed: number }[] = [];
  for (let n = 0; n < count; n++) {
    const madeBy = v.getUint16(p + 4, true) >> 8;
    const ext = v.getUint32(p + 38, true);
    out.push({ mode: madeBy === 3 ? ext >>> 16 : 0, local: v.getUint32(p + 42, true), compressed: v.getUint32(p + 20, true) });
    p += 46 + v.getUint16(p + 28, true) + v.getUint16(p + 30, true) + v.getUint16(p + 32, true);
  }
  return out;
}

/** Kiểm một gói OOXML. `inflate(name)` trả bytes đã giải nén của entry (pizzip ở tiến trình con). Trả lý do từ chối hoặc null. */
export function checkOfficeZip(buf: Uint8Array, inflate: (name: string) => Uint8Array | null): ZipBoundsReason | null {
  let entries;
  try {
    entries = zipEntries(buf, ATTACHMENT_ZIP.entries);
    checkZipShape(entries, ATTACHMENT_ZIP);
  } catch (e) {
    if (e instanceof ZipRefusedError) return e.reason === 'not_zip' ? 'corrupt' : e.reason;
    throw e;
  }
  const meta = centralMeta(buf);
  // Entry chồng lấn (hai entry trỏ cùng / đè vùng dữ liệu nhau — kỹ thuật bom ZIP chồng lớp).
  const spans = meta.map((m) => [m.local, m.local + 30 + m.compressed] as const).sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < spans.length; i++) if (spans[i]![0] < spans[i - 1]![1]) return 'zip_bomb';
  if (meta.some((m) => (m.mode & 0o170000) === S_IFLNK)) return 'symlink';
  if (entries.some((e) => MACRO.test(e.name))) return 'macro';
  let seen = 0;
  for (const e of entries) {
    if (e.name.endsWith('/')) continue;
    const body = inflate(e.name);
    if (!body) return 'corrupt';
    seen += body.length;
    if (body.length > e.size || seen > ATTACHMENT_ZIP.expanded) return 'zip_bomb';
    if (e.name.endsWith('.rels') && externalLoad(new TextDecoder().decode(body))) return 'external_relationship';
  }
  return null;
}
