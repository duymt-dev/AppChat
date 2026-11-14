// Ghi người phụ trách / ưu tiên của MỘT ticket (TIP-034c §2.2) — dùng chung cho ticket.assign, ticket.update và con hàng loạt
// `ticket.bulk_item`. Kiểm lại người nhận HIỆN TẠI (thành viên đang hoạt động / agent chưa xoá — gán agent không cấp quyền gì, không chạy
// model), kiểm CẢ patch trước khi ghi, rồi một UPDATE duy nhất chỉ các trường đổi (version do trigger `ticket_bump_version` tăng đúng một
// lần), lịch sử từng trường đổi + event outbox có sẵn. Không đổi gì (no-op) → không UPDATE, không event. Biên nhận chỉ chứa trường đã đổi,
// giá trị trước / sau của CHÍNH các trường đó và version sau ghi — hoàn tác so khớp đúng dấu này, không khôi phục cả bản chụp.
import { createHash } from 'node:crypto';
import { AppError, type CanonicalTicketPatch, type TicketBulkField } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { actorUserId, type CrmMembers } from '../../crm/public';
import { UUID, type TicketRecord } from '../ticket-access';
import { evOf, logEvent, type Actor, type Ev } from '../services/ticket-write';

export type AssigneeCols = { assigneeUserId: string | null; assigneeAgentId: string | null };
type Priority = TicketRecord['priority'];

/** Người nhận còn hợp lệ NGAY BÂY GIỜ: thành viên đang hoạt động (người) hoặc agent tồn tại chưa xoá (agent tạm dừng vẫn nhận được). */
export async function recipientCols(ws: string, tx: TenantTx, members: CrmMembers, a: NonNullable<CanonicalTicketPatch['assignee']>): Promise<AssigneeCols> {
  if (a.kind === 'user') {
    await members.assertMember(ws, a.id, 'assignee_user_id');
    return { assigneeUserId: a.id, assigneeAgentId: null };
  }
  const ok = UUID.test(a.id) && (await tx.aiAgent.findFirst({ where: { id: a.id, deletedAt: null }, select: { id: true } }));
  if (!ok) throw new AppError('VALIDATION_FAILED', 422, { assignee_agent_id: 'not_found' });
  return { assigneeUserId: null, assigneeAgentId: a.id };
}

/** Giá trị theo trường (đơn vị so khớp của biên nhận / hoàn tác). */
export const fieldValues = (t: Pick<TicketRecord, 'assigneeUserId' | 'assigneeAgentId' | 'priority'>) => ({
  assignee: { user: t.assigneeUserId, agent: t.assigneeAgentId },
  priority: t.priority as string,
});
type Values = ReturnType<typeof fieldValues>;

export interface TicketReceipt {
  fields: TicketBulkField[];
  before: Partial<Values>;
  after: Partial<Values>;
  /** sha256 của giá trị SAU ghi của đúng các trường đã đổi — hoàn tác chỉ khi giá trị hiện tại còn đúng dấu này. */
  fingerprint: string;
}

export const fingerprintOf = (fields: readonly TicketBulkField[], v: Partial<Values>) =>
  createHash('sha256').update(JSON.stringify(fields.map((f) => [f, v[f] ?? null]))).digest('hex');

export interface PatchApplied {
  changed: boolean;
  /** Dòng sau ghi (no-op → dòng hiện tại). */
  row: TicketRecord;
  receipt: TicketReceipt | null;
  events: Ev[];
}

/**
 * Áp patch đã kiểm lên ticket ĐÃ KHOÁ (`lockTicket`). `cols` = người nhận đã kiểm bằng `recipientCols` (null khi patch không có người phụ
 * trách). Chỉ các trường thật sự đổi đi vào UPDATE / lịch sử / event.
 */
export async function applyTicketPatch(
  ctx: ActionContext,
  tx: TenantTx,
  t: TicketRecord,
  patch: { cols: AssigneeCols | null; priority?: Priority | undefined; team?: { teamId: string | null } },
  actor: Actor,
  now: Date,
): Promise<PatchApplied> {
  const fields: TicketBulkField[] = [];
  const assign = patch.cols && (patch.cols.assigneeUserId !== t.assigneeUserId || patch.cols.assigneeAgentId !== t.assigneeAgentId);
  if (assign) fields.push('assignee');
  const prio = patch.priority !== undefined && patch.priority !== t.priority;
  if (prio) fields.push('priority');
  const team = patch.team !== undefined && patch.team.teamId !== t.teamId;
  if (!fields.length && !team) return { changed: false, row: t, receipt: null, events: [] };
  const row = await tx.ticket.update({
    where: { id: t.id },
    data: { ...(assign ? patch.cols! : {}), ...(prio ? { priority: patch.priority! } : {}), ...(team ? { teamId: patch.team!.teamId } : {}), updatedAt: now },
  });
  const events: Ev[] = [];
  if (assign) {
    await logEvent(tx, t.id, 'assigned', actor, now, { user_id: row.assigneeUserId, agent_id: row.assigneeAgentId });
    events.push(evOf('ticket.assigned', row, { by_user_id: actorUserId(ctx) }));
  }
  if (prio) {
    await logEvent(tx, t.id, 'priority', actor, now, { priority: row.priority });
    if (!assign) events.push(evOf('ticket.updated', row));
  }
  if (team && !assign && !prio) events.push(evOf('ticket.updated', row));
  const [b, a] = [fieldValues(t), fieldValues(row)];
  const pick = (v: Values) => Object.fromEntries(fields.map((f) => [f, v[f]])) as Partial<Values>;
  const receipt = fields.length ? { fields, before: pick(b), after: pick(a), fingerprint: fingerprintOf(fields, pick(a)) } : null;
  return { changed: true, row, receipt, events };
}

/**
 * Hoàn tác có canh gác (TIP-034c §2.3 / §2.6): ticket phải còn ĐÚNG version sau ghi và đúng dấu giá trị sau của các trường đã đổi —
 * có người / hệ thống sửa sau đó (kể cả ABA) → 409 CONFLICT, không ghi đè. Khôi phục CHỈ các trường đã đổi; người nhận cũ phải còn hợp lệ.
 * `teamId` (gán đơn lẻ có đổi nhóm) khôi phục cùng.
 */
export async function revertTicketPatch(
  tx: TenantTx,
  t: TicketRecord,
  r: { receipt: TicketReceipt; afterVersion: number; teamBefore?: string | null; teamTouched?: boolean },
  restoreRecipient: (prev: Values['assignee']) => Promise<AssigneeCols>,
  now: Date,
): Promise<TicketRecord> {
  if (t.version !== r.afterVersion || fingerprintOf(r.receipt.fields, fieldValues(t)) !== r.receipt.fingerprint) throw new AppError('CONFLICT', 409, { ticket_id: 'changed' });
  const data: Record<string, unknown> = { updatedAt: now };
  if (r.receipt.fields.includes('assignee')) {
    const prev = r.receipt.before.assignee ?? { user: null, agent: null };
    Object.assign(data, prev.user || prev.agent ? await restoreRecipient(prev) : { assigneeUserId: null, assigneeAgentId: null });
  }
  if (r.receipt.fields.includes('priority')) data.priority = r.receipt.before.priority as Priority;
  if (r.teamTouched) data.teamId = r.teamBefore ?? null;
  return tx.ticket.update({ where: { id: t.id }, data });
}
