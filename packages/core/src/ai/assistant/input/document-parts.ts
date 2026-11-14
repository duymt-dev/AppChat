// Phần văn bản có vị trí thật (TIP-023f §2.3): PDF theo TRANG thật của pdf-parse (pagerender gom chữ từng trang, trần trang chặn lúc
// đọc — không suy trang từ dòng trống); PDF rỗng chữ (scan) / mã hoá / hỏng → lý do tường minh, không OCR giả. DOCX / HTML theo đoạn /
// đề mục thật (không bịa số trang); script / ảnh / font / link ngoài không chạy, không tải. Văn bản thuần / Markdown theo đoạn.
import { INPUT_MAX_PAGES } from '@appchat/shared/input-limits';
import { htmlBlocks, markdownBlocks } from '../../kb/parse';
import { InputParseError, preflightArchive, segment, type ParsedPart } from './parse-bounds';

type PageData = { getTextContent: (o: object) => Promise<{ items: { str: string; transform: number[] }[] }> };

function pageText(items: { str: string; transform: number[] }[]): string {
  let lastY: number | undefined;
  let text = '';
  for (const it of items) {
    text += lastY === undefined || lastY === it.transform[5] ? it.str : `\n${it.str}`;
    lastY = it.transform[5];
  }
  return text;
}

type PdfJs = { disableWorker: boolean; getDocument(d: Uint8Array): Promise<PdfDoc> };

interface PdfDoc {
  numPages: number;
  getPage(n: number): Promise<PageData>;
  destroy(): void;
}

export async function pdfParts(body: Buffer): Promise<ParsedPart[]> {
  // Một bản pdf.js cố định (pdf-parse 1.1.4 mặc định v1.10.100) — import tĩnh để bundle parser không gộp cả 4 phiên bản.
  const mod = (await import('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js' as string)) as { default?: PdfJs } & PdfJs;
  const pdfjs = mod.default ?? mod;
  pdfjs.disableWorker = true;
  let doc: PdfDoc;
  try {
    doc = await pdfjs.getDocument(new Uint8Array(body));
  } catch (e) {
    const name = (e as { name?: string }).name ?? '';
    throw new InputParseError(/Password/i.test(name) || /password|encrypt/i.test(String((e as Error).message)) ? 'encrypted' : 'corrupt');
  }
  try {
    // Trần trang chặn TRƯỚC khi dựng chữ — không đọc 500+ trang rồi mới từ chối.
    if (doc.numPages > INPUT_MAX_PAGES) throw new InputParseError('too_large');
    const parts: ParsedPart[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const text = pageText((await page.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false })).items);
      parts.push(...segment({ kind: 'page', page: n }, text));
    }
    if (!parts.length) throw new InputParseError('scanned_no_text');
    return parts;
  } finally {
    doc.destroy();
  }
}

/** Khối HTML (DOCX qua mammoth / trang HTML) → đoạn có số thứ tự thật; bảng thành dòng chữ ngăn bằng " | ". */
export function htmlParts(html: string): ParsedPart[] {
  return htmlBlocks(html).flatMap((b, i) => {
    const text = b.type === 'table' ? [b.header, ...b.rows].map((r) => r.join(' | ')).join('\n') : 'text' in b ? b.text : '';
    return segment({ kind: 'paragraph', paragraph: i + 1 }, text);
  });
}

export async function docxParts(body: Buffer): Promise<ParsedPart[]> {
  preflightArchive(body);
  const mammoth = await import('mammoth');
  let html: string;
  try {
    // Ảnh nhúng bỏ qua (không data URI, không tải); mammoth không chạy macro / không theo link ngoài.
    html = (await mammoth.convertToHtml({ buffer: body }, { convertImage: mammoth.images.imgElement(async () => ({ src: '' })) })).value;
  } catch {
    throw new InputParseError('corrupt');
  }
  return htmlParts(html);
}

export function textParts(text: string, markdown: boolean): ParsedPart[] {
  const blocks = markdown ? markdownBlocks(text) : text.replace(/\r\n/g, '\n').split(/\n\s*\n/).map((t) => ({ type: 'para' as const, text: t }));
  return blocks.flatMap((b, i) => segment({ kind: 'paragraph', paragraph: i + 1 }, b.type === 'table' ? [b.header, ...b.rows].map((r) => r.join(' | ')).join('\n') : 'text' in b ? b.text : ''));
}
