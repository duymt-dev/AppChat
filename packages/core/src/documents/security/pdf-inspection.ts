// Kiểm PDF hợp đồng tải lên (TIP-030b spec 5): ≤ 25MB, bytes thật bắt đầu `%PDF-`, ≤ 200 trang, phân tích ≤ 10 giây; từ chối PDF mã hoá
// và nội dung chủ động (JavaScript, OpenAction / AA tự chạy, Launch, tệp nhúng EmbeddedFiles, XFA, RichMedia) — KHÔNG tự viết lại bản
// gốc để "làm sạch" (bản gốc là chứng cứ, phải giữ nguyên bytes). PDF quét / không có chữ vẫn hợp lệ — trích xuất chỉ báo "không đọc
// được" (extraction.ts), không bịa giá trị.
import { AppError } from '@appchat/shared';

export const PDF_LIMITS = { maxBytes: 25 * 1024 * 1024, pages: 200, parseMs: 10_000 } as const;

export type PdfRefusal = 'too_large' | 'not_pdf' | 'encrypted' | 'too_many_pages' | 'active_content' | 'embedded_file' | 'parse_timeout';

const refuse = (reason: PdfRefusal): never => {
  throw new AppError('VALIDATION_FAILED', 422, { file: reason });
};

// Khoá tên PDF cho nội dung chủ động — dò trên bytes (tên PDF có thể viết dạng #xx; chuẩn hoá trước khi dò).
const ACTIVE = /\/(JavaScript|JS|OpenAction|AA|Launch|XFA|RichMedia|SubmitForm|ImportData|GoToR)\b/;
const EMBEDDED = /\/(EmbeddedFiles|EmbeddedFile|FileAttachment)\b/;
const NAME_HEX = /#([0-9a-fA-F]{2})/g;

const latin1 = (b: Uint8Array) => {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return s;
};

export interface PdfInfo {
  pages: number;
}

// Dò thứ hai trên đối tượng đã phân tích: khoá nằm trong object stream nén (ObjStm / FlateDecode) không lộ trên bytes thô; pdf-lib đã
// giải nén ObjStm khi load nên duyệt mọi dict (kể cả dict của stream) theo khoá + giá trị tên (`/S /JavaScript`).
async function walkObjects(doc: import('pdf-lib').PDFDocument) {
  const { PDFDict, PDFName, PDFStream } = await import('pdf-lib');
  const nameOf = (n: unknown) => (n instanceof PDFName ? n.decodeText() : null);
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    const dict = obj instanceof PDFStream ? obj.dict : obj instanceof PDFDict ? obj : null;
    if (!dict) continue;
    for (const [k, v] of dict.entries()) {
      for (const n of [nameOf(k), nameOf(v)]) {
        if (!n) continue;
        if (EMBEDDED.test(`/${n}`)) refuse('embedded_file');
        if (ACTIVE.test(`/${n}`)) refuse('active_content');
      }
    }
  }
}

/** Kiểm PDF; trả số trang. Mọi từ chối → 422 `{ file: <lý do> }`. */
export async function inspectPdf(body: Uint8Array, limits: { maxBytes: number; pages: number; parseMs: number } = PDF_LIMITS): Promise<PdfInfo> {
  if (body.length > limits.maxBytes) refuse('too_large');
  if (latin1(body.subarray(0, 1024)).indexOf('%PDF-') < 0) refuse('not_pdf');
  // Tên PDF dạng `/Java#53cript` = `/JavaScript` — chuẩn hoá #xx rồi dò khoá nội dung chủ động / tệp nhúng.
  const raw = latin1(body).replace(NAME_HEX, (_m, h: string) => String.fromCharCode(parseInt(h, 16)));
  if (/\/Encrypt\b/.test(raw)) refuse('encrypted');
  if (EMBEDDED.test(raw)) refuse('embedded_file');
  if (ACTIVE.test(raw)) refuse('active_content');
  const { PDFDocument } = await import('pdf-lib');
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_r, reject) => {
    timer = setTimeout(() => reject(new AppError('VALIDATION_FAILED', 422, { file: 'parse_timeout' })), limits.parseMs);
  });
  try {
    const doc = await Promise.race([PDFDocument.load(body, { updateMetadata: false, throwOnInvalidObject: false }), timeout]);
    if (doc.isEncrypted) refuse('encrypted');
    await walkObjects(doc);
    const pages = doc.getPageCount();
    if (pages < 1) refuse('not_pdf');
    if (pages > limits.pages) refuse('too_many_pages');
    return { pages };
  } catch (e) {
    if (e instanceof AppError) throw e;
    return refuse('not_pdf');
  } finally {
    clearTimeout(timer);
  }
}
