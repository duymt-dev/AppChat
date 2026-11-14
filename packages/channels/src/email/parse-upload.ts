// Đọc tệp .eml người dùng tải lên cho Trợ lý (TIP-023f §2.4): chỉ phân tích MIME bằng mailparser có sẵn — KHÔNG mở IMAP/SMTP, không tải
// ảnh theo dõi / URL ngoài / tài nguyên CID. Không cần messageId/from. Trả tiêu đề / người gửi / ngày + thân văn bản có giới hạn (nội
// dung không tin cậy); header vận chuyển / xác thực bị bỏ. Tệp đính kèm lồng chỉ liệt kê metadata, không trích đệ quy.
import { simpleParser, type AddressObject } from 'mailparser';
import { htmlToText } from './normalize';

export const EML_MAX_DEPTH = 8;
export const EML_MAX_PARTS = 100;

export class EmlParseError extends Error {
  constructor(readonly reason: 'corrupt' | 'too_large' | 'archive_bounds') {
    super(reason);
    this.name = 'EmlParseError';
  }
}

export interface UploadedMail {
  subject: string;
  from: string | null;
  to: string[];
  date: string | null;
  body: string;
  attachments: { name: string | null; mime: string; size: number }[];
}

const addr = (a: AddressObject | AddressObject[] | undefined) =>
  (Array.isArray(a) ? a : a ? [a] : []).flatMap((x) => x.value.map((v) => (v.name ? `${v.name} <${v.address ?? ''}>` : (v.address ?? '')))).filter(Boolean);

/** Đếm độ sâu / số phần MIME thô trước khi giao mailparser (chặn thư lồng sâu / quá nhiều phần). */
export function mimeShape(raw: Buffer): { depth: number; parts: number } {
  const text = raw.toString('latin1');
  const boundaries = [...text.matchAll(/boundary\s*=\s*"?([^";\r\n]+)"?/gi)].map((m) => m[1]!);
  let parts = 0;
  for (const b of new Set(boundaries)) parts += text.split(`--${b}`).length - 2;
  return { depth: new Set(boundaries).size, parts: Math.max(0, parts) };
}

export async function parseUploadedEml(raw: Buffer, maxChars: number): Promise<UploadedMail> {
  const shape = mimeShape(raw);
  if (shape.depth > EML_MAX_DEPTH || shape.parts > EML_MAX_PARTS) throw new EmlParseError('archive_bounds');
  let m;
  try {
    m = await simpleParser(raw, { skipImageLinks: true, skipTextToHtml: true, skipHtmlToText: true, keepCidLinks: false });
  } catch {
    throw new EmlParseError('corrupt');
  }
  const body = (m.text?.trim() || (typeof m.html === 'string' ? htmlToText(m.html) : '')).replace(/\r\n/g, '\n');
  if (body.length > maxChars) throw new EmlParseError('too_large');
  return {
    subject: (m.subject ?? '').slice(0, 500),
    from: addr(m.from)[0] ?? null,
    to: addr(m.to).slice(0, 50),
    date: m.date ? m.date.toISOString() : null,
    body,
    attachments: m.attachments.slice(0, EML_MAX_PARTS).map((a) => ({ name: a.filename ?? null, mime: a.contentType, size: a.size })),
  };
}
