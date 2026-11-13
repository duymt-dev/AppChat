// Kiểm cấu trúc tệp đính kèm bản ghi (TIP-032d §2.1) — chạy trong tiến trình con cô lập (bundle `dist/attachment-validator.cjs` của worker,
// `node --permission`, không mạng / không ghi / không env bí mật). CHỈ kiểm chữ ký + hình dạng gói: PDF (header + %%EOF), ảnh (chữ ký + kích
// thước hợp lý), TXT / CSV (UTF-8, không markup), DOCX / XLSX (giới hạn ZIP + giải nén thật có đếm). KHÔNG quét mã độc, không trích nội dung.
// Không import AI parser / KB ingest — module trung lập của kernel.
import PizZip from 'pizzip';
import { sniff, type Sniffed } from './magic';
import { checkOfficeZip, type ZipBoundsReason } from './attachment-zip-bounds';

export const VALIDATOR_VERSION = 1;

/** Loại được nhận cho tệp đính kèm bản ghi — HTML / SVG / script / thực thi / EML / ZIP rời không bao giờ nhận. */
export const RECORD_ATTACHMENT_KINDS: readonly Sniffed[] = ['pdf', 'docx', 'xlsx', 'png', 'jpeg', 'webp', 'text'];

const EXT_OF: Record<string, Sniffed> = { pdf: 'pdf', docx: 'docx', xlsx: 'xlsx', png: 'png', jpg: 'jpeg', jpeg: 'jpeg', webp: 'webp', txt: 'text', csv: 'text' };

export type ValidationReason = 'unsupported_type' | 'type_mismatch' | 'corrupt' | 'empty' | ZipBoundsReason;
export type ValidationResult = { ok: true; kind: Sniffed } | { ok: false; reason: ValidationReason };

function pdfShape(b: Uint8Array): boolean {
  const head = new TextDecoder('latin1').decode(b.subarray(0, 1024));
  const tail = new TextDecoder('latin1').decode(b.subarray(Math.max(0, b.length - 2048)));
  return head.startsWith('%PDF-') && /%%EOF\s*$/.test(tail);
}

function imageShape(kind: Sniffed, b: Uint8Array): boolean {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (kind === 'png') {
    if (b.length < 33) return false;
    const w = v.getUint32(16);
    const h = v.getUint32(20);
    return w > 0 && h > 0 && w <= 20_000 && h <= 20_000;
  }
  if (kind === 'webp') return b.length >= 16 && v.getUint32(4, true) + 8 <= b.length + 1;
  // JPEG: kết thúc FFD9 (bỏ qua đệm cuối nhỏ).
  return kind === 'jpeg' && b.length > 4 && [...b.subarray(Math.max(0, b.length - 16))].some((x, i, a) => x === 0xff && a[i + 1] === 0xd9);
}

/** Kiểm một tệp (thuần — chạy ở tiến trình con). `name` chỉ để đối chiếu đuôi. */
export function validateAttachment(body: Uint8Array, name: string): ValidationResult {
  if (!body.length) return { ok: false, reason: 'empty' };
  const kind = sniff(body);
  if (!RECORD_ATTACHMENT_KINDS.includes(kind)) return { ok: false, reason: 'unsupported_type' };
  const ext = name.includes('.') ? name.toLowerCase().split('.').pop()! : '';
  if (EXT_OF[ext] !== kind) return { ok: false, reason: 'type_mismatch' };
  if (kind === 'pdf') return pdfShape(body) ? { ok: true, kind } : { ok: false, reason: 'corrupt' };
  if (kind === 'png' || kind === 'jpeg' || kind === 'webp') return imageShape(kind, body) ? { ok: true, kind } : { ok: false, reason: 'corrupt' };
  if (kind === 'docx' || kind === 'xlsx') {
    let zip: PizZip;
    try {
      zip = new PizZip(body);
    } catch {
      return { ok: false, reason: 'corrupt' };
    }
    const r = checkOfficeZip(body, (n) => {
      try {
        return zip.file(n)?.asUint8Array() ?? null;
      } catch {
        return null;
      }
    });
    return r ? { ok: false, reason: r } : { ok: true, kind };
  }
  return { ok: true, kind };
}
