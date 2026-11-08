// Inbound pipeline (Blueprint §6 L1176, REQ-C06): MỘT transaction tenant cho mỗi tin —
// 1) insert `message` ON CONFLICT (channel_account_id, external_msg_id) DO NOTHING → trùng thì dừng;
// 2) resolve khách (1-1: ContactIdentityService — identity / SĐT / khách nháp; nhóm: participant, không tạo khách);
// 3) upsert hội thoại (mới: tự gán người phụ trách khách — COMMERCE §8, chế độ AI + agent theo cấu hình tài khoản; đang đóng /
//    tạm ẩn / ẩn → mở lại); 4) đếm chưa đọc, preview, FRT chờ, thống kê ngày; 5) outbox `message.received` (+ assigned / contact).
// Lịch sử (`origin = 'history'` — TIP-014b C): tin + khách + hội thoại vẫn ghi (chống trùng cùng UNIQUE), nhưng KHÔNG đếm chưa đọc, không
// mở lại / bỏ ẩn, không FRT / thống kê, preview + `last_message_at` + `last_interaction_at` chỉ tiến (max), không event luồng trực tiếp
// (người gọi gom `channel.history_ingested`), không kích agent.
// Chính sách tài khoản (TIP-014b D) đọc TRƯỚC mọi ghi: `sync_messages = false` → không lưu tin / khách / AI (chỉ đếm chẩn đoán
// `channel_account.health.suppressed`, không xoá lịch sử, phiên vẫn chạy); `sync_auto_create_contact = false` → chỉ khớp định danh chắc chắn,
// người lạ → hội thoại không gắn khách (+ participant) — không tạo khách. Nhóm: người gửi không bao giờ thành khách.
// Ảnh đại diện (TIP-014b D): tin live của kênh có năng lực `profiles` xếp lấy ảnh người gửi (1-1 và thành viên nhóm) khi chưa có / lần kiểm
// cuối quá 7 ngày — worker giữ phiên lấy theo lô (avatar-sync.processor). Lịch sử không xếp.
import type { NormalizedInbound } from '@appchat/channels';
import type { TenantDb } from '@appchat/db';
import { foldText, interpolate, serverMessages } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { lockContactRow } from '../../kernel/ownership/root-lock';
import { writeOutbox, type OutboxEventInput } from '../../kernel/outbox/outbox';
import type { ContactIdentityService } from '../../crm/public';
import { settingsOf } from '../../channels/public';
import { previewOf } from './view';
import { saveMessageRefs } from '../../channels/operations/operation-store';
import { suppressed } from './inbound-sync-policy';
import { requestAvatar } from '../../channels/operations/avatar-store';

export type InboundOrigin = 'live' | 'history';

export interface InboundResult {
  /** null = tin trùng / tài khoản không còn → bỏ qua. */
  messageId: string | null;
  conversationId?: string;
  /** Khách mới tạo từ tin này (lịch sử: báo cáo / dòng thời gian, không event). */
  contactCreated?: boolean;
  events: OutboxEventInput[];
  /** Cần agent trực kênh trả lời (TIP-022) — worker đẩy job `agent-reply` sau commit. */
  agentReply?: boolean;
  /** Vừa xếp lấy ảnh đại diện người gửi (TIP-014b D) — worker đẩy job `avatars` của tài khoản sau commit. */
  avatarQueued?: boolean;
}

/**
 * Có kích agent trực kênh không (Blueprint §5.3): AI bật (auto / copilot), chưa chuyển người / chờ duyệt, có agent (gán hoặc mặc
 * định của tài khoản); nhóm theo `group_ai_policy` (`mention` = chỉ khi nhắc tài khoản, `off` = không). Tin rỗng (sticker…) vẫn kích.
 */
export function wantsAgent(conv: { aiMode: string; aiState: string; assigneeAgentId: string | null; kind: string; groupAiPolicy: string | null }, defaultAgent: string | null, mentionsMe: boolean): boolean {
  if (conv.aiMode === 'off' || conv.aiState === 'handoff' || conv.aiState === 'waiting_approval') return false;
  if (!conv.assigneeAgentId && !defaultAgent) return false;
  if (conv.kind !== 'group') return true;
  const policy = conv.groupAiPolicy ?? 'mention';
  return policy === 'auto' || (policy === 'mention' && mentionsMe);
}

const AI_MODE = { auto: 'auto', suggest: 'copilot', off: 'off' } as const;
const day0 = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

export class InboundPipeline {
  constructor(
    private readonly identity: ContactIdentityService,
    /** Loại kênh lấy được hồ sơ / ảnh (manifest `operations.profiles = remote`). */
    private readonly avatarsFor: (channelType: string) => boolean = () => false,
  ) {}

  /** Một transaction: tin + hội thoại + outbox event (người gọi `markDirty` sau commit nếu `events` không rỗng). */
  async handle(db: TenantDb, ws: string, m: NormalizedInbound, now: Date): Promise<InboundResult> {
    return db.$transaction(async (tx) => {
      const r = await this.run(tx, ws, m, now, 'live');
      if (r.events.length) await writeOutbox(tx, ws, r.events, now);
      return r;
    });
  }

  async run(tx: TenantTx, ws: string, m: NormalizedInbound, now: Date, origin: InboundOrigin = 'live'): Promise<InboundResult> {
    const live = origin === 'live';
    const account = await tx.channelAccount.findUnique({ where: { id: m.channelAccountId } });
    if (!account || account.status === 'disconnected') return { messageId: null, events: [] };
    const st = settingsOf(account);
    if (!st.sync_messages) {
      await suppressed(tx, account.id, now);
      return { messageId: null, events: [] };
    }
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
    let contactCreated = false;
    const who = { channelType: account.type, channelAccountId: account.id, externalId: m.sender.externalId, displayName: m.sender.name ?? null, phone: m.sender.phone ?? null, email: m.sender.email ?? null };
    if (!m.isGroup && st.sync_auto_create_contact) {
      const r = await this.identity.resolve(tx, who, at, { forward: !live });
      contactId = r.contactId;
      contactCreated = r.created;
      if (live) events.push(...r.events);
    } else if (!m.isGroup) {
      // Chỉ khớp: khách đã có (identity / SĐT duy nhất) giữ nguyên; người lạ / SĐT mơ hồ → không gắn khách (gắn tay sau theo quyền).
      const r = await this.identity.match(tx, who);
      contactId = r.kind === 'known' || r.kind === 'phone' ? r.contactId : (conv0?.contactId ?? null);
    }
    // TIP-015d §2.3: khoá khách gốc trước khi đọc người phụ trách / tạo / gắn hội thoại (chuyển phụ trách đồng thời không bỏ sót hội thoại mới).
    await lockContactRow(tx, contactId);
    const contact = contactId ? await tx.contact.findUnique({ where: { id: contactId }, select: { ownerUserId: true, teamId: true, name: true, group: true } }) : null;

    // 3. Hội thoại
    const preview = previewOf(m.kind, m.text ?? '');
    const senderName = m.sender.name?.trim() || null;
    const isNew = !conv0;
    let conv;
    const newer = !conv0 || at > conv0.lastMessageAt;
    if (conv0 && !live) {
      // Lịch sử: chỉ tiến preview / mốc khi tin mới hơn; không chưa đọc / mở lại / FRT.
      conv = newer || (contactId && !conv0.contactId)
        ? await tx.conversation.update({ where: { id: conv0.id }, data: { ...(newer ? { lastMessageAt: at, lastMessagePreview: preview, lastSenderName: senderName } : {}), ...(contactId && !conv0.contactId ? { contactId } : {}) } })
        : conv0;
    } else if (conv0) {
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
          // DC-299: hội thoại 1-1 theo nhóm của khách; nhóm Zalo (không khách) → null (chỉ người được gán / all).
          teamId: m.isGroup ? null : (contact?.teamId ?? null),
          assigneeAgentId: st.agent_id || null,
          aiMode: AI_MODE[st.ai_mode] ?? 'copilot',
          groupAiPolicy: m.isGroup ? 'mention' : null,
          lastMessageAt: at,
          lastMessagePreview: preview,
          lastSenderName: senderName,
          unreadCount: live ? 1 : 0,
          frtPendingSince: live ? at : null,
          createdAt: now,
        },
      });
    }

    // 4. Tin (insert ON CONFLICT DO NOTHING — hai worker cùng nhận một tin thì chỉ một dòng).
    const inserted = await tx.$executeRaw`
      INSERT INTO message (id, conversation_id, channel_account_id, direction, sender_type, sender_id, sender_name, kind, body, attachments, external_msg_id, status, origin, created_at)
      VALUES (${msgId}::uuid, ${conv.id}::uuid, ${account.id}::uuid, 'in', 'contact', ${m.sender.externalId}, ${senderName}, ${m.kind}::message_kind, ${m.text ?? ''},
              ${JSON.stringify(m.attachments ?? [])}::jsonb, ${m.externalMsgId}, 'delivered', ${origin}, ${at})
      ON CONFLICT (channel_account_id, external_msg_id) DO NOTHING`;
    if (!inserted) throw new DuplicateInbound();
    if (m.providerRef) await saveMessageRefs(tx, account.id, msgId, [m.providerRef], now);

    // Nhóm, hoặc 1-1 chưa gắn khách (tắt tự tạo khách): giữ định danh người gửi ở participant.
    if (m.isGroup || !contactId) {
      await tx.conversationParticipant.upsert({
        where: { conversationId_externalId: { conversationId: conv.id, externalId: m.sender.externalId } },
        create: { conversationId: conv.id, externalId: m.sender.externalId, displayName: senderName ?? '', lastSeenAt: at },
        update: { lastSeenAt: at, ...(senderName ? { displayName: senderName } : {}) },
      });
    }
    // TIP-042b: khách vừa tạo từ tin 1-1 (live hoặc lịch sử nhập — DC-238 "lead mới" theo lúc tạo khách) → xin chia lead (consumer ROLE=jobs).
    // Khớp khách cũ / nhóm: không. Lịch sử chỉ trả event này (không âm báo / thông báo / AI) — người gọi ghi outbox cùng lô.
    const routing: OutboxEventInput[] =
      contactCreated && contactId && !m.isGroup ? [{ topic: 'lead.routing_requested', payload: { contact_id: contactId, conversation_id: conv.id, channel_account_id: account.id, message_id: msgId } }] : [];
    if (!live) return { messageId: msgId, conversationId: conv.id, contactCreated, events: routing };
    if (isNew) {
      await tx.$executeRaw`
        INSERT INTO channel_account_stat_daily (channel_account_id, day, convs) VALUES (${account.id}::uuid, ${day0(now)}::date, 1)
        ON CONFLICT (channel_account_id, day) DO UPDATE SET convs = channel_account_stat_daily.convs + 1`;
    }
    await tx.channelAccount.update({ where: { id: account.id }, data: { lastEventAt: now } });
    const avatarQueued = this.avatarsFor(account.type) && (await requestAvatar(tx, account.id, m.sender.externalId, now));

    // 5. Event
    const title = conv.title ?? contact?.name ?? senderName ?? '';
    const base = { conversation_id: conv.id, channel_account_id: account.id, contact_id: conv.contactId, assignee_user_id: conv.assigneeUserId, contact_owner_user_id: contact?.ownerUserId ?? null, team_id: conv.teamId };
    const vip = contact?.group === 'vip' || (await this.hasVipTag(tx, contactId));
    events.push({ topic: 'message.received', payload: { ...base, message_id: msgId, new_conversation: isNew, is_group: m.isGroup, mentions_me: !!m.mentionsMe, vip, title } });
    if (isNew && conv.assigneeUserId) {
      events.push({ topic: 'conversation.assigned', payload: { ...base, assignee_agent_id: conv.assigneeAgentId, by_user_id: null, auto: true, title } });
    }
    events.push(...routing);
    return { messageId: msgId, conversationId: conv.id, events, agentReply: wantsAgent(conv, st.agent_id || null, !!m.mentionsMe), avatarQueued };
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

