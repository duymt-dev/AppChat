// Inbound pipeline (Blueprint §6 L1176, REQ-C06): MỘT transaction tenant cho mỗi tin —
// 1) insert `message` ON CONFLICT (channel_account_id, external_msg_id) DO NOTHING → trùng thì dừng;
// 2) resolve khách (1-1: ContactIdentityService — identity / SĐT / khách nháp; nhóm: participant, không tạo khách);
// 3) upsert hội thoại (mới: tự gán người phụ trách khách — COMMERCE §8, chế độ AI + agent theo cấu hình tài khoản; đang đóng /
//    tạm ẩn / ẩn → mở lại); 4) đếm chưa đọc, preview, FRT chờ, thống kê ngày; 5) outbox `message.received` (+ assigned / contact).
import type { NormalizedInbound } from '@appchat/channels';
import type { TenantDb } from '@appchat/db';
import { foldText, interpolate, serverMessages } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { writeOutbox, type OutboxEventInput } from '../../kernel/outbox/outbox';
import type { ContactIdentityService } from '../../crm/public';
import { settingsOf } from '../../channels/public';
import { previewOf } from './view';

export interface InboundResult {
  /** null = tin trùng / tài khoản không còn → bỏ qua. */
  messageId: string | null;
  conversationId?: string;
  events: OutboxEventInput[];
}

const AI_MODE = { auto: 'auto', suggest: 'copilot', off: 'off' } as const;
const day0 = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

export class InboundPipeline {
  constructor(private readonly identity: ContactIdentityService) {}

  /** Một transaction: tin + hội thoại + outbox event (người gọi `markDirty` sau commit nếu `events` không rỗng). */
  async handle(db: TenantDb, ws: string, m: NormalizedInbound, now: Date): Promise<InboundResult> {
    return db.$transaction(async (tx) => {
      const r = await this.run(tx, ws, m, now);
      if (r.events.length) await writeOutbox(tx, ws, r.events, now);
      return r;
    });
  }

  async run(tx: TenantTx, ws: string, m: NormalizedInbound, now: Date): Promise<InboundResult> {
    const account = await tx.channelAccount.findUnique({ where: { id: m.channelAccountId } });
    if (!account || account.status === 'disconnected') return { messageId: null, events: [] };
    const sentAt = new Date(m.sentAt);
    const at = Number.isNaN(sentAt.getTime()) ? now : sentAt;
    const msgId = uuidv7(now.getTime());
    const events: OutboxEventInput[] = [];

    // 1. Chống trùng: tin đã có → dừng. Hai worker chạy song song cùng qua bước này thì INSERT ở bước 4 (ON CONFLICT DO NOTHING)
    // trả 0 dòng → ném DuplicateInbound → rollback cả transaction (đếm chưa đọc / hội thoại không bị cộng hai lần).
    if (await tx.message.findUnique({ where: { channelAccountId_externalMsgId: { channelAccountId: account.id, externalMsgId: m.externalMsgId } }, select: { id: true } })) {
      return { messageId: null, events: [] };
    }
    const conv0 = await tx.conversation.findUnique({ where: { channelAccountId_externalThreadId: { channelAccountId: account.id, externalThreadId: m.externalThreadId } } });

    // 2. Khách
    let contactId = conv0?.contactId ?? null;
    if (!m.isGroup) {
      const r = await this.identity.resolve(tx, { channelType: account.type, channelAccountId: account.id, externalId: m.sender.externalId, displayName: m.sender.name ?? null, phone: m.sender.phone ?? null, email: m.sender.email ?? null }, at);
      contactId = r.contactId;
      events.push(...r.events);
    }
    const contact = contactId ? await tx.contact.findUnique({ where: { id: contactId }, select: { ownerUserId: true, name: true, group: true } }) : null;

    // 3. Hội thoại
    const st = settingsOf(account);
    const preview = previewOf(m.kind, m.text ?? '');
    const senderName = m.sender.name?.trim() || null;
    const isNew = !conv0;
    let conv;
    if (conv0) {
      conv = await tx.conversation.update({
        where: { id: conv0.id },
        data: {
          lastMessageAt: at > conv0.lastMessageAt ? at : conv0.lastMessageAt,
          lastMessagePreview: preview,
          lastSenderName: senderName,
          unreadCount: { increment: 1 },
          // Tin mới mở lại hội thoại đã đóng / tạm ẩn / ẩn (D50).
          ...(conv0.status === 'closed' || conv0.status === 'snoozed' ? { status: 'open', snoozedUntil: null } : {}),
          hiddenAt: null,
          frtPendingSince: conv0.frtPendingSince ?? at,
          ...(contactId && !conv0.contactId ? { contactId } : {}),
        },
      });
    } else {
      conv = await tx.conversation.create({
        data: {
          id: uuidv7(now.getTime()),
          channelAccountId: account.id,
          channelType: account.type,
          contactId,
          kind: m.isGroup ? 'group' : 'direct',
          externalThreadId: m.externalThreadId,
          title: m.isGroup ? interpolate(serverMessages('vi').inbox.groupTitle, { channel: account.name }) : null,
          // COMMERCE §8: khách có người phụ trách → gán người đó; chưa có → hàng chung (agent theo cấu hình kênh).
          assigneeUserId: m.isGroup ? null : (contact?.ownerUserId ?? null),
          assigneeAgentId: st.agent_id || null,
          aiMode: AI_MODE[st.ai_mode] ?? 'copilot',
          groupAiPolicy: m.isGroup ? 'mention' : null,
          lastMessageAt: at,
          lastMessagePreview: preview,
          lastSenderName: senderName,
          unreadCount: 1,
          frtPendingSince: at,
          createdAt: now,
        },
      });
    }

    // 4. Tin (insert ON CONFLICT DO NOTHING — hai worker cùng nhận một tin thì chỉ một dòng).
    const inserted = await tx.$executeRaw`
      INSERT INTO message (id, conversation_id, channel_account_id, direction, sender_type, sender_id, sender_name, kind, body, attachments, external_msg_id, status, created_at)
      VALUES (${msgId}::uuid, ${conv.id}::uuid, ${account.id}::uuid, 'in', 'contact', ${m.sender.externalId}, ${senderName}, ${m.kind}::message_kind, ${m.text ?? ''},
              ${JSON.stringify(m.attachments ?? [])}::jsonb, ${m.externalMsgId}, 'delivered', ${at})
      ON CONFLICT (channel_account_id, external_msg_id) DO NOTHING`;
    if (!inserted) throw new DuplicateInbound();

    if (m.isGroup) {
      await tx.conversationParticipant.upsert({
        where: { conversationId_externalId: { conversationId: conv.id, externalId: m.sender.externalId } },
        create: { conversationId: conv.id, externalId: m.sender.externalId, displayName: senderName ?? '', lastSeenAt: at },
        update: { lastSeenAt: at, ...(senderName ? { displayName: senderName } : {}) },
      });
    }
    if (isNew) {
      await tx.$executeRaw`
        INSERT INTO channel_account_stat_daily (channel_account_id, day, convs) VALUES (${account.id}::uuid, ${day0(now)}::date, 1)
        ON CONFLICT (channel_account_id, day) DO UPDATE SET convs = channel_account_stat_daily.convs + 1`;
    }
    await tx.channelAccount.update({ where: { id: account.id }, data: { lastEventAt: now } });

    // 5. Event
    const title = conv.title ?? contact?.name ?? senderName ?? '';
    const base = { conversation_id: conv.id, channel_account_id: account.id, contact_id: conv.contactId, assignee_user_id: conv.assigneeUserId, contact_owner_user_id: contact?.ownerUserId ?? null };
    const vip = contact?.group === 'vip' || (await this.hasVipTag(tx, contactId));
    events.push({ topic: 'message.received', payload: { ...base, message_id: msgId, new_conversation: isNew, is_group: m.isGroup, mentions_me: !!m.mentionsMe, vip, title } });
    if (isNew && conv.assigneeUserId) {
      events.push({ topic: 'conversation.assigned', payload: { ...base, assignee_agent_id: conv.assigneeAgentId, by_user_id: null, auto: true, title } });
    }
    return { messageId: msgId, conversationId: conv.id, events };
  }

  /** Khách có thẻ "VIP" (thông báo `msg_vip`). */
  private async hasVipTag(tx: TenantTx, contactId: string | null): Promise<boolean> {
    if (!contactId) return false;
    const tags = await tx.contactTag.findMany({ where: { contactId }, select: { tagId: true } });
    if (!tags.length) return false;
    const names = await tx.tag.findMany({ where: { id: { in: tags.map((t) => t.tagId) } }, select: { name: true } });
    return names.some((t) => foldText(t.name).includes('vip'));
  }
}

/** Hai worker cùng chèn một tin — transaction rollback, job coi như trùng. */
export class DuplicateInbound extends Error {
  constructor() {
    super('duplicate_inbound');
    this.name = 'DuplicateInbound';
  }
}
