// Chuẩn hoá thư → NormalizedInbound (TIP-018, Blueprint §6 "gom thread theo Message-ID / In-Reply-To / References"):
// thread = Message-ID gốc của chuỗi (References[0] → In-Reply-To → chính thư); nội dung = text (html → text khi thiếu), bỏ phần
// trích dẫn thư cũ; tiêu đề ở `raw.subject` (adapter gửi trả lời "Re: …").
import type { NormalizedInbound } from '../types';
import type { ParsedMail } from './transport';

/** `<abc@x>` / `abc@x` → `<abc@x>` (so khớp header ổn định). */
export function msgId(v: string | undefined | null): string | undefined {
  const s = v?.trim();
  if (!s) return undefined;
  return s.startsWith('<') ? s : `<${s}>`;
}

/** Message-ID gốc của chuỗi thư. */
export function threadRoot(m: Pick<ParsedMail, 'messageId' | 'inReplyTo' | 'references'>): string {
  return msgId(m.references[0]) ?? msgId(m.inReplyTo) ?? msgId(m.messageId)!;
}

const ENTITY: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' };

/** HTML thư → text đọc được (khối → xuống dòng, bỏ thẻ / style / script). */
export function htmlToText(html: string): string {
  return html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6]|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_m, e: string) => ENTITY[e] ?? '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Bỏ phần trích dẫn thư trước (dòng "On … wrote:" / "Vào … đã viết:" và mọi dòng bắt đầu bằng ">") — Hộp thư chỉ hiện nội dung mới.
 * Không còn gì (thư chỉ có trích dẫn) → giữ nguyên.
 */
export function stripQuoted(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const cut = lines.findIndex((l, i) => /^(On .+wrote:|Vào .+đã viết:|-{2,}\s*(Original Message|Thư gốc)\s*-{2,})\s*$/i.test(l.trim()) || (l.startsWith('>') && lines.slice(i).every((x) => !x.trim() || x.startsWith('>'))));
  const kept = (cut >= 0 ? lines.slice(0, cut) : lines).filter((l) => !l.startsWith('>')).join('\n').trim();
  return kept || text.trim();
}

/** Thư → tin vào chuẩn (bỏ thư do chính hộp thư gửi — đã có ở AppChat dạng tin ra). */
export function normalizeMail(accountId: string, address: string, m: ParsedMail): NormalizedInbound | null {
  if (m.from.address.toLowerCase() === address.toLowerCase()) return null;
  const body = stripQuoted(m.text?.trim() ? m.text : m.html ? htmlToText(m.html) : '');
  const subject = m.subject.trim();
  return {
    channelAccountId: accountId,
    externalThreadId: threadRoot(m),
    externalMsgId: msgId(m.messageId)!,
    isGroup: false,
    sender: { externalId: m.from.address.toLowerCase(), ...(m.from.name ? { name: m.from.name } : {}), email: m.from.address.toLowerCase() },
    kind: m.attachments.length && !body ? 'file' : 'text',
    // Thư mới (không phải trả lời) mang tiêu đề lên đầu — hội thoại hiện được chủ đề.
    text: !m.inReplyTo && subject ? `${subject}\n\n${body}`.trim() : body,
    sentAt: m.date.toISOString(),
    raw: { subject, message_id: msgId(m.messageId), references: [...m.references.map(msgId).filter(Boolean), msgId(m.messageId)] },
  };
}
