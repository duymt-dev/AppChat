// Bản ghi hội thoại / tin → shape đọc FE (packages/shared/src/api/inbox.ts). Chữ theo locale người xem, giờ theo múi giờ workspace.
import { CONV_TAG_TONE_OF, createFmt, initialsOf, serverMessages, type ConversationDto, type MessageDto } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';

export interface Place {
  locale: string;
  timeZone: string;
  now: Date;
}

type ConvRow = NonNullable<Awaited<ReturnType<TenantTx['conversation']['findUnique']>>>;
type MsgRow = NonNullable<Awaited<ReturnType<TenantTx['message']['findUnique']>>>;

/** Màu avatar ổn định theo id (dạng `hsl(h 55% 45%)` như fixture prototype). */
export function hueOf(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 55% 45%)`;
}

const dayKey = (d: Date, timeZone: string) => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

/** Hôm nay → giờ; hôm qua → "Hôm qua"; cũ hơn → ngày. */
export function stamp(at: Date, p: Place): string {
  const fmt = createFmt(p);
  const today = dayKey(p.now, p.timeZone);
  const k = dayKey(at, p.timeZone);
  if (k === today) return fmt.time(at);
  if (k === dayKey(new Date(p.now.getTime() - 86_400_000), p.timeZone)) return serverMessages(p.locale).inbox.day.yesterday;
  return fmt.date(at).slice(0, 5);
}

/** Preview tin cuối cho danh sách: chữ (≤ 120) hoặc nhãn loại tin. */
export function previewOf(kind: string, body: string, locale = 'vi'): string {
  const text = body.replace(/\s+/g, ' ').trim();
  if (text && kind !== 'sticker') return text.slice(0, 120);
  const labels = serverMessages(locale).inbox.preview as Record<string, string>;
  return labels[kind] ?? text.slice(0, 120);
}

export interface ConvExtras {
  contactName: Map<string, string>;
  accountName: Map<string, string>;
  tags: Map<string, { name: string; color: string; emoji: string }[]>;
  members: Map<string, number>;
}

export function toConversation(c: ConvRow, x: ConvExtras, p: Place): ConversationDto {
  const title = c.title?.trim() || (c.contactId ? x.contactName.get(c.contactId) : undefined) || serverMessages(p.locale).inbox.unknownContact;
  const tags = (x.tags.get(c.id) ?? []).map((t) => ({ label: t.emoji ? `${t.emoji} ${t.name}` : t.name, tone: CONV_TAG_TONE_OF[t.color.toUpperCase()] ?? ('channel' as const) }));
  const group = c.kind === 'group';
  return {
    id: c.id,
    kind: c.kind,
    title,
    initials: initialsOf(title),
    hue: hueOf(c.contactId ?? c.id),
    channel: c.channelType,
    account: x.accountName.get(c.channelAccountId) ?? '',
    time: stamp(c.lastMessageAt, p),
    preview: c.lastMessagePreview,
    ...(group && c.lastSenderName ? { preview_sender: c.lastSenderName } : {}),
    tags,
    unread: c.unreadCount,
    ...(group ? { members: x.members.get(c.id) ?? 0 } : {}),
    contact_id: c.contactId,
    pinned: c.pinned,
    ai_state: c.aiState,
    ai_mode: c.aiMode,
    ...(c.handoffReason ? { handoff_reason: c.handoffReason } : {}),
    status: c.status,
    pinned_message_id: c.pinnedMessageId,
    hidden: !!c.hiddenAt,
    channel_account_id: c.channelAccountId,
    assignee_user_id: c.assigneeUserId,
    assignee_agent_id: c.assigneeAgentId,
    archived: !!c.archivedAt,
    last_message_at: c.lastMessageAt.toISOString(),
  };
}

const MENU_KINDS = new Set(['text', 'image', 'file', 'sticker', 'audio', 'card']);
const STATUS: Record<string, string> = { queued: 'sending', sent: 'sent', delivered: 'sent', read: 'read', failed: 'failed' };

export interface MsgExtras {
  /** Cảm xúc của người xem trên tin. */
  myReaction: Map<string, string>;
  replyPreview: Map<string, string>;
  /** Kênh hỗ trợ cảm xúc (menu hiện hàng emoji — OQ-12). */
  isGroup: boolean;
}

export function toMessage(m: MsgRow, x: MsgExtras, p: Place): MessageDto {
  const kind = m.kind === 'note' ? 'note' : m.kind;
  const out: MessageDto = {
    id: m.id,
    kind,
    body: m.deletedAt || m.recalledAt ? '' : m.body,
    time: createFmt(p).time(m.createdAt),
    plain: true,
  };
  if (m.direction) out.direction = m.direction;
  if (m.direction === 'out') out.status = STATUS[m.status] ?? m.status;
  if (MENU_KINDS.has(m.kind) && m.direction) out.menu = true;
  if (m.senderType === 'agent') out.agent = true;
  if (m.senderName && (m.direction === 'out' || x.isGroup)) out.sender = m.senderName;
  if (x.isGroup && m.direction === 'in' && m.senderName) {
    out.sender_initials = initialsOf(m.senderName);
    out.sender_hue = hueOf(m.senderId ?? m.senderName);
  }
  if (m.recalledAt) out.recalled = true;
  if (m.deletedAt) out.deleted = true;
  const r = x.myReaction.get(m.id);
  if (r) out.reaction = r;
  if (m.replyToId) out.reply_to = { id: m.replyToId, preview: x.replyPreview.get(m.replyToId) ?? '' };
  if (m.forwardedFromId) out.forwarded = true;
  const att = m.attachments as MessageDto['attachments'];
  if (Array.isArray(att) && att.length) out.attachments = att;
  return out;
}

/** Chèn mốc ngày ("Hôm nay · 20/04/2026") giữa các tin khác ngày (thứ tự cũ → mới). */
export function withDays(rows: { at: Date; dto: MessageDto }[], p: Place): MessageDto[] {
  const out: MessageDto[] = [];
  const fmt = createFmt(p);
  const t = serverMessages(p.locale).inbox.day;
  const today = dayKey(p.now, p.timeZone);
  const yesterday = dayKey(new Date(p.now.getTime() - 86_400_000), p.timeZone);
  let last = '';
  for (const r of rows) {
    const k = dayKey(r.at, p.timeZone);
    if (k !== last) {
      const label = k === today ? `${t.today} · ${fmt.date(r.at)}` : k === yesterday ? `${t.yesterday} · ${fmt.date(r.at)}` : fmt.date(r.at);
      out.push({ id: `d-${k}`, kind: 'date', body: label });
      last = k;
    }
    out.push(r.dto);
  }
  return out;
}
