// conversation.search / conversation.get · canned_reply.search (TIP-023b R2 · DC-224): Trợ lý / agent đọc Hộp thư. Danh sách dùng chung
// `listConversationIds` (scope inbox + thư mục + từ khoá như màn) rồi lọc khách nếu có; chi tiết dùng `visibleConversation` (ngoài scope →
// NOT_FOUND) và ≤ 20 tin gần nhất — tin đã thu hồi / xoá không trả nội dung, không trả tệp / URL. Thẻ: tag-read.handler.ts.
import { Inject, Injectable } from '@nestjs/common';
import { foldText } from '@appchat/shared';
import type { ActionInput, cannedReplySearch, conversationGet, conversationSearch } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { listConversationIds } from '../repos/conversations.repo';
import { UUID, visibleConversation } from '../services/access';

type ConvRow = NonNullable<Awaited<ReturnType<TenantTx['conversation']['findUnique']>>>;

// TIP-015f §4: khách đã xoá mềm → không trả tên CRM cũ, gắn `contact_deleted` để Trợ lý nói đúng trạng thái (khôi phục trước khi tạo nghiệp vụ
// mới) thay vì đoán là "không tìm thấy" rồi tạo khách trùng.
function hit(c: ConvRow, contact: { name: string; deleted: boolean } | undefined) {
  return {
    id: c.id,
    title: c.title || (contact && !contact.deleted ? contact.name : '') || '',
    channel: c.channelType,
    contact_id: c.contactId,
    ...(contact?.deleted ? { contact_deleted: true } : {}),
    status: c.status,
    assignee_user_id: c.assigneeUserId,
    unread: c.unreadCount,
    last_message_at: c.lastMessageAt.toISOString(),
  };
}

async function names(tx: TenantTx, rows: ConvRow[]) {
  const ids = [...new Set(rows.map((r) => r.contactId).filter((x): x is string => !!x))];
  const cs = ids.length ? await tx.contact.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, deletedAt: true } }) : [];
  return new Map(cs.map((c) => [c.id, { name: c.name, deleted: !!c.deletedAt }]));
}

type SearchOut = { conversations: ReturnType<typeof hit>[] };

@Injectable()
@ActionHandler('conversation.search')
export class ConversationSearchHandler implements Handler<ActionInput<typeof conversationSearch>, SearchOut> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, i: ActionInput<typeof conversationSearch>, tx: TenantTx): Promise<HandlerOutcome<SearchOut>> {
    const limit = i.limit ?? 10;
    if (i.contact_id && !UUID.test(i.contact_id)) return { result: { conversations: [] } };
    // Lọc theo khách: đọc một trang rộng hơn rồi lọc (khách ít hội thoại); không lọc → đúng `limit` dòng.
    const f = { ...(i.q ? { q: i.q } : {}), ...(i.folder ? { folder: i.folder } : {}), ...(i.channel ? { channel: i.channel } : {}) };
    const { ids } = await listConversationIds(tx, ctx.authz, f, this.clock.now(), undefined, i.contact_id ? 100 : limit);
    const rows = ids.length ? await tx.conversation.findMany({ where: { id: { in: ids }, ...(i.contact_id ? { contactId: i.contact_id } : {}) } }) : [];
    const byId = new Map(rows.map((r) => [r.id, r]));
    const n = await names(tx, rows);
    const conversations = ids
      .flatMap((id) => {
        const c = byId.get(id);
        return c ? [hit(c, c.contactId ? n.get(c.contactId) : undefined)] : [];
      })
      .slice(0, limit);
    return { result: { conversations } };
  }
}

@Injectable()
@ActionHandler('conversation.get')
export class ConversationGetHandler implements Handler<ActionInput<typeof conversationGet>, unknown> {
  async execute(ctx: ActionContext, i: ActionInput<typeof conversationGet>, tx: TenantTx): Promise<HandlerOutcome<unknown>> {
    const c = await visibleConversation(tx, ctx.authz, i.conversation_id);
    // Index (conversation_id, created_at) của message — chỉ ≤ 20 dòng mới nhất.
    const msgs = await tx.message.findMany({
      where: { conversationId: c.id },
      orderBy: { createdAt: 'desc' },
      take: i.limit ?? 20,
      select: { id: true, direction: true, senderType: true, kind: true, body: true, status: true, createdAt: true, deletedAt: true, recalledAt: true },
    });
    const n = await names(tx, [c]);
    return {
      result: {
        ...hit(c, c.contactId ? n.get(c.contactId) : undefined),
        messages: msgs.reverse().map((m) => ({ id: m.id, direction: m.direction, sender: m.senderType, kind: m.kind, text: m.deletedAt || m.recalledAt ? '' : m.body, status: m.status, at: m.createdAt.toISOString() })),
      },
    };
  }
}

type ReplyOut = { replies: { id: string; shortcut: string; title: string; body: string; category: string }[] };

@Injectable()
@ActionHandler('canned_reply.search')
export class CannedReplySearchHandler implements Handler<ActionInput<typeof cannedReplySearch>, ReplyOut> {
  async execute(_ctx: ActionContext, i: ActionInput<typeof cannedReplySearch>, tx: TenantTx): Promise<HandlerOutcome<ReplyOut>> {
    // Trả lời nhanh dùng chung workspace (như popover "/" ở khung soạn) — không trả tệp đính kèm.
    const f = foldText(i.q ?? '');
    const rows = await tx.cannedReply.findMany({ orderBy: [{ category: 'asc' }, { shortcut: 'asc' }], take: 500, select: { id: true, shortcut: true, title: true, body: true, category: true } });
    return { result: { replies: rows.filter((r) => !f || foldText(`${r.shortcut} ${r.title}`).includes(f)).slice(0, i.limit ?? 10) } };
  }
}
