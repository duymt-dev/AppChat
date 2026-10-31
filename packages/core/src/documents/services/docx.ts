// Mẫu Word của DN (templates.md §2 `docx`, §8): kiểm tệp (≤ 10MB, đúng gói OOXML, không macro / không phải .docm), đọc đoạn văn để
// AI nhận diện vị trí → biến, và điền biến bằng docxtemplater sau khi chèn thẻ `{{biến}}` vào đúng các vị trí người dùng đã xác nhận.
// Không chạy field code: thẻ chỉ là chữ, docxtemplater không thực thi gì trong tệp.
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { AppError } from '@appchat/shared';

export const DOCX_MAX_BYTES = 10 * 1024 * 1024;
const MAIN = 'word/document.xml';
const PARTS = /^word\/(document|header\d*|footer\d*)\.xml$/;
const MACRO = /(^|\/)vbaProject\.bin$|macroEnabled/i;

/** Mở + kiểm gói DOCX; lỗi → 422 `{ file: too_large | not_docx | macro }`. */
export function openDocx(body: Uint8Array): PizZip {
  if (body.length > DOCX_MAX_BYTES) throw new AppError('VALIDATION_FAILED', 422, { file: 'too_large' });
  let zip: PizZip;
  try {
    zip = new PizZip(body);
  } catch {
    throw new AppError('VALIDATION_FAILED', 422, { file: 'not_docx' });
  }
  if (!zip.file(MAIN)) throw new AppError('VALIDATION_FAILED', 422, { file: 'not_docx' });
  const types = zip.file('[Content_Types].xml')?.asText() ?? '';
  if (Object.keys(zip.files).some((n) => MACRO.test(n)) || MACRO.test(types)) throw new AppError('VALIDATION_FAILED', 422, { file: 'macro' });
  return zip;
}

const XML_ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const unxml = (s: string) => s.replace(/&(amp|lt|gt|quot|apos);/g, (_m, e: string) => XML_ENT[e]!);
const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Chữ của từng đoạn (`w:p`) trong thân + header / footer — đầu vào AI nhận diện + kiểm bảng kiểm. */
export function docxParagraphs(zip: PizZip): string[] {
  const out: string[] = [];
  for (const name of Object.keys(zip.files).filter((n) => PARTS.test(n)).sort()) {
    const doc = zip.file(name)!.asText();
    for (const p of doc.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? []) {
      const text = unxml((p.match(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g) ?? []).map((t) => t.replace(/<[^>]+>/g, '')).join('')).trim();
      if (text) out.push(text);
    }
  }
  return out;
}

/** Phần "để trống" của vị trí (dấu chấm / gạch / …) — thay bằng thẻ biến; không có thì chèn thẻ sau nhãn. */
const BLANK = /[.…_]{2,}|…/;

/**
 * Chèn thẻ `{{variable}}` vào đoạn chứa `placeholder` (khớp chữ của cả đoạn, các run gộp lại vào run đầu để giữ định dạng chính).
 * `items` → bọc đoạn (hoặc hàng bảng chứa đoạn) bằng vòng lặp `{{#items}}…{{/items}}` với cột tên / SL / đơn giá / thành tiền.
 * Trả số vị trí đã gắn được (vị trí không tìm thấy trong tệp bị bỏ qua — người dùng thấy ở bước xem trước).
 */
export function tagDocx(zip: PizZip, fields: readonly { placeholder: string; variable: string }[]): number {
  let hit = 0;
  for (const name of Object.keys(zip.files).filter((n) => PARTS.test(n))) {
    let doc = zip.file(name)!.asText();
    for (const f of fields) {
      const want = f.placeholder.trim();
      if (!want) continue;
      const paras = doc.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? [];
      const p = paras.find((x) => unxml((x.match(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g) ?? []).map((t) => t.replace(/<[^>]+>/g, '')).join('')).includes(want));
      if (!p) continue;
      const runs = p.match(/<w:r[ >][\s\S]*?<\/w:r>/g) ?? [];
      const text = unxml(runs.map((r) => (r.match(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g) ?? []).map((t) => t.replace(/<[^>]+>/g, '')).join('')).join(''));
      if (f.variable === 'items') {
        const loop = '{{#items}}{{no}}. {{name}} — {{qty}} {{unit}} × {{price}} = {{amount}}{{/items}}';
        doc = doc.replace(p, rewrite(p, runs, text.replace(want, loop)));
      } else {
        const tag = `{{${f.variable}}}`;
        const filled = BLANK.test(want) ? want.replace(BLANK, tag) : `${want} ${tag}`;
        doc = doc.replace(p, rewrite(p, runs, text.replace(want, filled)));
      }
      hit++;
    }
    zip.file(name, doc);
  }
  return hit;
}

/** Gộp chữ của đoạn vào run đầu (giữ `w:rPr` của run đó), bỏ các run chữ còn lại. */
function rewrite(p: string, runs: string[], text: string): string {
  if (!runs.length) return p;
  const first = runs[0]!;
  const rPr = first.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0] ?? '';
  const merged = `<w:r>${rPr}<w:t xml:space="preserve">${xml(text)}</w:t></w:r>`;
  let out = p.replace(first, merged);
  for (const r of runs.slice(1)) if (/<w:t[ >]/.test(r)) out = out.replace(r, '');
  return out;
}

/** Thẻ `a.b` tra theo đường dẫn; trong vòng `items` tra dòng trước rồi tới dữ liệu chung (scope cha). */
const dotted = (tag: string) => ({
  get(scope: unknown): unknown {
    if (tag === '.') return scope;
    let v: unknown = scope;
    for (const k of tag.trim().split('.')) v = v && typeof v === 'object' ? (v as Record<string, unknown>)[k] : undefined;
    return v;
  },
});

/** Điền dữ liệu vào DOCX đã gắn thẻ → bytes DOCX. Biến thiếu → chuỗi rỗng (dữ liệu chứng từ đã đủ biến theo registry). */
export function fillDocx(zip: PizZip, data: Record<string, unknown>): Buffer {
  try {
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, delimiters: { start: '{{', end: '}}' }, nullGetter: () => '', parser: dotted });
    doc.render(data);
    return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' }) as Buffer;
  } catch {
    throw new AppError('VALIDATION_FAILED', 422, { file: 'template_error' });
  }
}

/** Thêm một đoạn cuối thân văn bản (dòng "không thay thế hoá đơn GTGT" khi mẫu DOCX thiếu — templates.md §6). */
export function appendParagraph(zip: PizZip, text: string): void {
  const doc = zip.file(MAIN)!.asText();
  const para = `<w:p><w:r><w:t xml:space="preserve">${xml(text)}</w:t></w:r></w:p>`;
  const at = doc.lastIndexOf('<w:sectPr');
  zip.file(MAIN, at > 0 ? doc.slice(0, at) + para + doc.slice(at) : doc.replace('</w:body>', `${para}</w:body>`));
}
