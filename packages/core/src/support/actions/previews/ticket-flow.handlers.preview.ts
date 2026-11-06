// Preview trạng thái ticket (TIP-023b R2.8): đổi trạng thái / đóng / mở lại → mã + tiêu đề, trước / sau; đóng nêu lý do + kết quả SLA dự tính
// (quá hạn TTR lúc đóng — đang chờ thì tính tới lúc dừng); mở lại nêu số lần mở lại. Luật chuyển trạng thái vẫn do execute chặn.
import type { ActionInput, ActionPreview, ticketClose, ticketReopen, ticketSetStatus } from '@appchat/actions';
import type { AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { preview, updated } from '../../../kernel/actions/preview-kit';
import { visibleTicket } from '../../ticket-access';
import { label } from './ticket-edit.handlers.preview';

export async function setStatusPreview(tx: TenantTx, a: AuthzContext, i: ActionInput<typeof ticketSetStatus>): Promise<ActionPreview> {
  const t = await visibleTicket(tx, a, i.ticket_id, 'write');
  return preview('write', label(t), { changes: updated('ticket', t.id, { status: t.status }, { status: i.status }) });
}

/** SLA dự tính lúc đóng: quá hạn TTR (đang chờ thì tính tới lúc dừng) → breached. */

export async function closePreview(tx: TenantTx, a: AuthzContext, i: ActionInput<typeof ticketClose>, now: Date): Promise<ActionPreview> {
  const t = await visibleTicket(tx, a, i.ticket_id, 'write');
  const sla = (t.pausedSince ?? now) > t.ttrDueAt ? 'breached' : 'met';
  return preview('write', label(t), { changes: updated('ticket', t.id, { status: t.status }, { status: 'closed', reason: i.reason, note: i.note?.trim() || undefined, sla_result: sla }) });
}

export async function reopenPreview(tx: TenantTx, a: AuthzContext, i: ActionInput<typeof ticketReopen>): Promise<ActionPreview> {
  const t = await visibleTicket(tx, a, i.ticket_id, 'write');
  return preview('write', label(t), { changes: updated('ticket', t.id, { status: t.status, reopened: t.reopenedCount }, { status: 'open', reopened: t.reopenedCount + 1 }) });
}
