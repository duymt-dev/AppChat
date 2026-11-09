// Chuyển phụ trách khách MỘT transaction tenant (TIP-015d §2, D32, COMMERCE §8b): khoá khách → kiểm phiên bản / còn hiệu lực → người nhận
// đã là người phụ trách thì no-op (không biên nhận, không event, không hoàn tác) → gỡ quan hệ cũ của người nhận → port domain được chọn
// (hội thoại / báo giá / lịch hẹn) khoá + chuyển set-based → khách + timeline + biên nhận. Lỗi ở bất kỳ bước nào → rollback toàn bộ (kể
// cả khách); port được yêu cầu mà chưa đăng ký → 503, không giả 0. Không gọi mạng / LLM / thư trong transaction.
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { OWNERSHIP_DOMAINS, type OwnershipDomain, type OwnershipReceipt } from '../../kernel/ownership/ports';
import { ownershipPort } from '../../kernel/ownership/registry';
import { soleTeamOf } from '../../authz/data-access';
import { actorUserId, editableContact } from '../services/access';
import { writeTimeline } from '../services/timeline.service';
import { lockLiveContact } from './contact-lock';
import { COUNT_KEY, ZERO, insertTransfer, type MoveFlags, type Moved } from './receipts.repo';

export interface TransferInput {
  contact_id: string;
  to_user_id: string;
  move: MoveFlags;
  note?: string;
  if_version?: number;
}

export type TransferResult =
  | { status: 'transferred'; owner_user_id: string; moved: Moved; transfer_id: string; version: number }
  | { status: 'skipped_already_owner'; owner_user_id: string; moved: Moved; transfer_id: null; version: number };

type Event = { topic: string; payload: Record<string, unknown> };

export interface TransferOutcome {
  result: TransferResult;
  contact: { id: string; name: string; ownerUserId: string | null };
  events: Event[];
}

const FLAG: Record<OwnershipDomain, keyof MoveFlags> = { conversation: 'conversations', quote: 'quotes', appointment: 'appointments' };

export async function transferContact(ctx: ActionContext, tx: TenantTx, input: TransferInput, to: { id: string; name: string }, now: Date): Promise<TransferOutcome> {
  // Khoá gốc trước, rồi mới kiểm quyền GHI theo bản đọc SAU khoá (scope có thể đổi theo owner / nhóm hiện tại).
  const locked = await lockLiveContact(tx, input.contact_id, input.if_version);
  const { contact: c } = await editableContact(tx, ctx.authz, locked.id);
  if (c.ownerUserId === to.id) {
    return { result: { status: 'skipped_already_owner', owner_user_id: to.id, moved: { ...ZERO }, transfer_id: null, version: c.version }, contact: c, events: [] };
  }
  // Port được yêu cầu phải có trước khi đụng dữ liệu — thiếu thì 503 cho cả lần chuyển.
  const ports = OWNERSHIP_DOMAINS.filter((d) => input.move[FLAG[d]]).map((d) => ownershipPort(d));
  const prevCollab = await tx.contactCollaborator.findUnique({ where: { contactId_userId: { contactId: c.id, userId: to.id } } });
  await tx.contactCollaborator.deleteMany({ where: { contactId: c.id, userId: to.id } });
  // DC-299: nhóm của khách theo người phụ trách mới (nhóm duy nhất; 0 / nhiều → null).
  const team = await soleTeamOf(tx, to.id);
  const items: { domain: OwnershipDomain; r: OwnershipReceipt }[] = [];
  const events: Event[] = [];
  const moved: Moved = { ...ZERO };
  for (const p of ports) {
    const a = await p.apply(tx, { contactId: c.id, contactName: c.name, toUserId: to.id, toTeamId: team, cutoff: now });
    moved[COUNT_KEY[p.domain]] = a.receipts.length;
    for (const r of a.receipts) items.push({ domain: p.domain, r });
    events.push(...a.events);
  }
  const generation = c.transferGeneration + 1;
  const updated = await tx.contact.update({ where: { id: c.id }, data: { ownerUserId: to.id, teamId: team, transferGeneration: generation, updatedAt: now }, select: { version: true } });
  const id = uuidv7(now.getTime());
  await insertTransfer(
    tx,
    {
      id,
      contactId: c.id,
      fromUserId: c.ownerUserId,
      toUserId: to.id,
      fromTeamId: c.teamId,
      toTeamId: team,
      generation,
      move: input.move,
      counts: moved,
      collab: prevCollab ? { role: prevCollab.role, added_by: prevCollab.addedBy } : null,
      idempotencyKey: ctx.idempotencyKey ?? null,
      source: ctx.source,
      actorId: actorUserId(ctx) ?? ctx.actor.id,
      createdAt: now,
    },
    items,
  );
  await writeTimeline(tx, { contactId: c.id, type: 'owner', key: 'owner', params: { to: to.name }, actor: { type: ctx.actor.type, id: actorUserId(ctx) }, ref: { type: 'contact_transfer', id }, at: now });
  // contact.owner_changed chỉ còn là tín hiệu làm mới / thông báo / tóm tắt — không consumer nào đổi báo giá / lịch hẹn theo nó nữa.
  events.unshift({ topic: 'contact.owner_changed', payload: { contact_id: c.id, from: c.ownerUserId, to: to.id, move: input.move, transfer_id: id } });
  return {
    result: { status: 'transferred', owner_user_id: to.id, moved, transfer_id: id, version: updated.version },
    contact: { id: c.id, name: c.name, ownerUserId: c.ownerUserId },
    events,
  };
}
