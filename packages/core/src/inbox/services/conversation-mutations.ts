// Luật ghi dùng chung của hội thoại (TIP-025b §C) — một chỗ cho handler đơn (hide / tag / pin / alias) và bản ghi của bulk. Mỗi hàm nhận
// hội thoại ĐÃ kiểm quyền ghi (writableConversation) trong transaction của người gọi, ghi đúng một hội thoại, trả `changed` (chạy lại cùng
// thay đổi → không ghi, biên nhận `skipped`) + event realtime. Không gọi lồng executor.
import type { TenantTx } from '../../kernel/actions/action-context';
import { snap, tagByLabel, updatedEvent, type ConvSnap } from '../actions/kit';

type Conv = NonNullable<Awaited<ReturnType<TenantTx['conversation']['findUnique']>>>;
type Event = Awaited<ReturnType<typeof updatedEvent>>;

export interface Mutation {
  changed: boolean;
  before: ConvSnap;
  events: Event[];
}

/** Ẩn / hiện (D50). Đã đúng trạng thái → không ghi. */
export async function setHidden(tx: TenantTx, c: Conv, hidden: boolean, now: Date): Promise<Mutation> {
  const before = snap(c, ['hiddenAt']);
  if (!!c.hiddenAt === hidden) return { changed: false, before, events: [] };
  await tx.conversation.update({ where: { id: c.id }, data: { hiddenAt: hidden ? now : null } });
  return { changed: true, before, events: [await updatedEvent(tx, c, 'hide')] };
}

/** Gỡ đúng MỘT thẻ (so tên không dấu như tag); thẻ khác — kể cả vừa được thêm song song — giữ nguyên. Không có thẻ → không ghi. */
export async function removeTag(tx: TenantTx, c: Conv, label: string): Promise<{ changed: boolean; tagId: string | null; events: Event[] }> {
  const t = await tagByLabel(tx, label, null, new Date(0), false);
  if (!t) return { changed: false, tagId: null, events: [] };
  const n = await tx.conversationTag.deleteMany({ where: { conversationId: c.id, tagId: t.id } });
  return { changed: n.count > 0, tagId: t.id, events: n.count ? [await updatedEvent(tx, c, 'tags')] : [] };
}

/** Bỏ ghim tin: chỉ khi tin đó đang là tin ghim (không xoá ghim của tin khác). */
export async function unpinMessage(tx: TenantTx, c: Conv, messageId: string): Promise<{ changed: boolean; events: Event[] }> {
  if (c.pinnedMessageId !== messageId) return { changed: false, events: [] };
  await tx.conversation.update({ where: { id: c.id }, data: { pinnedMessageId: null } });
  return { changed: true, events: [await updatedEvent(tx, c, 'pin_message')] };
}

export interface BulkChange {
  assignee_user_id?: string;
  status?: 'open' | 'pending' | 'closed';
  archive?: boolean;
  /** Thẻ đã phân giải (id) — tạo thẻ mới làm MỘT lần ở cấp lô, không theo từng bản ghi. */
  tagIds?: string[];
}

export interface BulkItemBefore {
  conv: ConvSnap;
  added: string[];
}

/** Một hội thoại của conversation.bulk_update: áp tập thay đổi nguyên tử (savepoint / transaction của người gọi). Không đổi gì → skipped. */
export async function applyBulkChange(tx: TenantTx, c: Conv, ch: BulkChange, now: Date): Promise<{ status: 'done' | 'skipped'; before: BulkItemBefore; events: Event[] }> {
  const conv = snap(c, ['assigneeUserId', 'status', 'snoozedUntil', 'archivedAt']);
  const data: Record<string, unknown> = {};
  if (ch.assignee_user_id && c.assigneeUserId !== ch.assignee_user_id) data.assigneeUserId = ch.assignee_user_id;
  if (ch.status && (c.status !== ch.status || c.snoozedUntil)) Object.assign(data, { status: ch.status, snoozedUntil: null });
  if (ch.archive !== undefined && !!c.archivedAt !== ch.archive) data.archivedAt = ch.archive ? now : null;
  if (Object.keys(data).length) await tx.conversation.update({ where: { id: c.id }, data });
  const added: string[] = [];
  for (const tagId of ch.tagIds ?? []) {
    const r = await tx.conversationTag.createMany({ data: [{ conversationId: c.id, tagId, createdAt: now }], skipDuplicates: true });
    if (r.count) added.push(tagId);
  }
  const changed = Object.keys(data).length > 0 || added.length > 0;
  return { status: changed ? 'done' : 'skipped', before: { conv, added }, events: changed ? [await updatedEvent(tx, { ...c, assigneeUserId: (data.assigneeUserId as string | undefined) ?? c.assigneeUserId }, 'bulk')] : [] };
}
