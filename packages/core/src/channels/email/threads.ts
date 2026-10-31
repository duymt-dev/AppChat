// Chuỗi thư của hội thoại email (TIP-018, bảng `email_thread`): worker poll ghi khi thư khách vào (địa chỉ, tiêu đề, Message-ID
// mới nhất, References); gửi ra (`writeOutgoing` — inbox) đọc để dựng người nhận + `In-Reply-To` / `References` / "Re: tiêu đề";
// `contact.send_email` mở chuỗi mới với Message-ID đặt trước = thread id của hội thoại.
import type { EmailSendMeta, NormalizedInbound, OutboundMessage } from '@appchat/channels';
import type { TenantDb } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';

type Db = Pick<TenantTx, 'emailThread'> | Pick<TenantDb, 'emailThread'>;
interface MailRaw {
  subject?: string;
  message_id?: string;
  references?: string[];
}

/** References giữ tối đa chừng này id gần nhất (header không phình mãi theo chuỗi dài). */
const MAX_REFS = 20;

/** Thư khách vào → cập nhật chuỗi (chỉ tiến lên — thư cũ đồng bộ lại sau không ghi đè thư mới hơn). */
export async function recordInboundThread(db: Db, m: NormalizedInbound): Promise<void> {
  const raw = (m.raw ?? {}) as MailRaw;
  const at = new Date(m.sentAt);
  const refs = (raw.references ?? []).slice(-MAX_REFS);
  const key = { channelAccountId_externalThreadId: { channelAccountId: m.channelAccountId, externalThreadId: m.externalThreadId } };
  const cur = await db.emailThread.findUnique({ where: key });
  if (!cur) {
    await db.emailThread.create({
      data: { channelAccountId: m.channelAccountId, externalThreadId: m.externalThreadId, address: m.sender.externalId, subject: raw.subject ?? '', lastMessageId: raw.message_id ?? m.externalMsgId, references: refs, lastAt: at },
    });
    return;
  }
  if (cur.lastAt > at) return;
  await db.emailThread.update({
    where: key,
    data: { address: m.sender.externalId, lastMessageId: raw.message_id ?? m.externalMsgId, references: refs, lastAt: at, ...(cur.subject ? {} : { subject: raw.subject ?? '' }) },
  });
}

/** Chuỗi do mình mở (`contact.send_email`): tạo dòng, thư đầu tiên mang Message-ID = thread id (đặt khi gửi). */
export async function openEmailThread(db: Db, t: { channelAccountId: string; threadId: string; address: string; subject: string; now: Date }): Promise<void> {
  await db.emailThread.create({ data: { channelAccountId: t.channelAccountId, externalThreadId: t.threadId, address: t.address.toLowerCase(), subject: t.subject, lastAt: t.now } });
}

/** Phần riêng của kênh email cho tin ra: người nhận + header thread. Hội thoại không phải email → `{}`. */
export async function emailOutboundExtras(tx: Pick<TenantTx, 'emailThread'>, conv: { channelAccountId: string; channelType: string; externalThreadId: string }): Promise<Pick<OutboundMessage, 'externalThreadTo' | 'meta'>> {
  if (conv.channelType !== 'email') return {};
  const key = { channelAccountId_externalThreadId: { channelAccountId: conv.channelAccountId, externalThreadId: conv.externalThreadId } };
  const t = await tx.emailThread.findUnique({ where: key });
  if (!t) return {};
  if (!t.lastMessageId) {
    // Thư mở chuỗi: Message-ID = thread id → thư khách trả lời (References / In-Reply-To) quay về đúng hội thoại.
    await tx.emailThread.update({ where: key, data: { lastMessageId: t.externalThreadId, references: [t.externalThreadId] } });
    const meta: EmailSendMeta = { subject: t.subject, messageId: t.externalThreadId };
    return { externalThreadTo: t.address, meta: { ...meta } };
  }
  const meta: EmailSendMeta = { subject: t.subject, inReplyTo: t.lastMessageId, references: t.references.length ? t.references : [t.lastMessageId] };
  return { externalThreadTo: t.address, meta: { ...meta } };
}
