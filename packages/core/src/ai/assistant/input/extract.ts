// Bộ điều phối trích nội dung thuần (TIP-023f §2): bytes + tên hiển thị → loại theo nội dung → phần có vị trí. Không DB / mạng / storage
// — chạy được trong tiến trình con cô lập (sandbox.ts). Lỗi luôn là `InputParseError` với lý do có giới hạn, không stack / đường dẫn.
import { parseUploadedEml, EmlParseError } from '@appchat/channels/parse-upload';
import { INPUT_MAX_CHARS_PER_FILE, INPUT_MAX_FILE_BYTES, type InputKind } from '@appchat/shared/input-limits';
import { docxParts, htmlParts, pdfParts, textParts } from './document-parts';
import { inspectImage } from './images';
import { InputParseError, assertCharBudget, detectKind, segment, type ParsedPart } from './parse-bounds';
import { csvParts, xlsxParts } from './table-parts';

export interface Extracted {
  kind: InputKind;
  parts: ParsedPart[];
}

const utf8 = (b: Buffer) => new TextDecoder('utf-8', { fatal: false }).decode(b);

export async function extractInput(body: Buffer, name: string): Promise<Extracted> {
  if (body.length > INPUT_MAX_FILE_BYTES) throw new InputParseError('too_large');
  const kind = detectKind(body, name);
  if (!kind) throw new InputParseError('unsupported_type');
  const parts = await partsOf(kind, body);
  assertCharBudget(parts);
  return { kind, parts };
}

async function partsOf(kind: InputKind, body: Buffer): Promise<ParsedPart[]> {
  switch (kind) {
    case 'png':
    case 'jpeg':
      inspectImage(kind, body);
      return [{ locator: { kind: 'image' }, image: true }];
    case 'pdf':
      return pdfParts(body);
    case 'docx':
      return docxParts(body);
    case 'xlsx':
      return xlsxParts(body);
    case 'csv':
      return csvParts(utf8(body));
    case 'html':
      return htmlParts(utf8(body));
    case 'markdown':
      return textParts(utf8(body), true);
    case 'text':
      return textParts(utf8(body), false);
    case 'eml':
      return emlParts(body);
  }
}

async function emlParts(body: Buffer): Promise<ParsedPart[]> {
  try {
    const m = await parseUploadedEml(body, INPUT_MAX_CHARS_PER_FILE);
    const head = [`Subject: ${m.subject}`, m.from ? `From: ${m.from}` : '', m.date ? `Date: ${m.date}` : '', m.attachments.length ? `Attachments (not read): ${m.attachments.map((a) => a.name ?? a.mime).join(', ')}` : ''].filter(Boolean).join('\n');
    return [...segment({ kind: 'email', part: 'header' }, head), ...segment({ kind: 'email', part: 'body' }, m.body)];
  } catch (e) {
    if (e instanceof EmlParseError) throw new InputParseError(e.reason);
    throw new InputParseError('corrupt');
  }
}
