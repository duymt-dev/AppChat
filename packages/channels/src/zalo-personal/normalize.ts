// Tin thô Zalo → NormalizedInbound (omnichannel-adapter §4). Tin do chính tài khoản gửi (gửi từ điện thoại) bỏ qua — TIP-016
// ghi tin ra từ outbox của mình; `externalMsgId` = msgId của Zalo (ổn định, dùng chống trùng `UNIQUE(channel_account_id, external_msg_id)`).
import type { NormalizedInbound } from '../types';
import type { ZaloRawMessage } from './transport';

type Attach = { href?: string; title?: string; thumb?: string; params?: string };

const asAttach = (c: unknown): Attach => (c && typeof c === 'object' ? (c as Attach) : {});

const fileMeta = (params?: string): { size?: number; ext?: string } => {
  try {
    const p = JSON.parse(params ?? '{}') as { fileSize?: string | number; fileExt?: string };
    return { size: p.fileSize !== undefined ? Number(p.fileSize) : undefined, ext: p.fileExt };
  } catch {
    return {};
  }
};

const MIME: Record<string, string> = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', zip: 'application/zip', txt: 'text/plain' };

export function normalizeZalo(accountId: string, m: ZaloRawMessage, ownId: string): NormalizedInbound | null {
  if (m.isSelf) return null;
  const base = {
    channelAccountId: accountId,
    externalThreadId: m.threadId,
    externalMsgId: m.msgId,
    isGroup: m.isGroup,
    sender: { externalId: m.uidFrom, ...(m.dName ? { name: m.dName } : {}) },
    sentAt: new Date(Number(m.ts) || Date.now()).toISOString(),
    ...(m.isGroup ? { mentionsMe: !!m.mentions?.some((x) => x.uid === ownId) } : {}),
    raw: { msgType: m.msgType },
  };
  const a = asAttach(m.content);
  switch (m.msgType) {
    case 'chat.photo':
      return { ...base, kind: 'image', ...(a.title ? { text: a.title } : {}), attachments: a.href ? [{ url: a.href, mime: 'image/jpeg' }] : [] };
    case 'share.file': {
      const meta = fileMeta(a.params);
      const mime = MIME[meta.ext?.toLowerCase() ?? ''] ?? 'application/octet-stream';
      return { ...base, kind: 'file', attachments: a.href ? [{ url: a.href, mime, ...(a.title ? { name: a.title } : {}), ...(meta.size ? { size: meta.size } : {}) }] : [] };
    }
    case 'chat.sticker':
      return { ...base, kind: 'sticker' };
    case 'chat.voice':
      return { ...base, kind: 'audio', attachments: a.href ? [{ url: a.href, mime: 'audio/aac' }] : [] };
    default: {
      // `webchat` = chữ; loại khác (link, vị trí, danh thiếp…) giữ chữ đọc được nếu có, còn lại bỏ.
      const text = typeof m.content === 'string' ? m.content : (a.title ?? a.href ?? '');
      return text ? { ...base, kind: 'text', text } : null;
    }
  }
}
