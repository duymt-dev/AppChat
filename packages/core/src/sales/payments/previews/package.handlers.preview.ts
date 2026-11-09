// Preview liệu trình (TIP-023b R2.8): gia hạn → tên gói + hạn / trạng thái trước / sau (từ hạn hiện tại hoặc hôm nay nếu đã hết — gói hết hạn
// mở lại); chỉnh buổi → tổng buổi + trạng thái trước / sau + lý do, dưới số đã dùng → 422 như execute. Gói đã hoàn tiền → 409; ngoài
// scope → 404. Chỉ đọc.
import type { ActionInput, ActionPreview, packageAdjustSessions, packageExtend } from '@appchat/actions';
import { AppError } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { line, preview, updated } from '../../../kernel/actions/preview-kit';
import { UUID, inSalesScope } from '../invoice-access';
import { packageStatusOf } from '../services/packages';

const DAY = 86_400_000;

async function visiblePackage(tx: TenantTx, ctx: ActionContext, id: string) {
  const p = UUID.test(id) ? await tx.customerPackage.findUnique({ where: { id } }) : null;
  const o = p ? await tx.order.findUnique({ where: { id: p.orderId }, select: { assignedUserId: true, teamId: true } }) : null;
  if (!p || !o || !(await inSalesScope(tx, ctx.authz, { owner: o.assignedUserId, team: o.teamId, contact: p.contactId }, 'write'))) throw new AppError('NOT_FOUND', 404, { package_id: 'not_found' });
  if (p.status === 'refunded') throw new AppError('INVALID_STATE', 409, { status: p.status });
  const contact = (await tx.contact.findUnique({ where: { id: p.contactId }, select: { name: true } }))?.name;
  return { p, name: line(p.name, contact) };
}

export async function extendPreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof packageExtend>, now: Date): Promise<ActionPreview> {
  const { p, name } = await visiblePackage(tx, ctx, i.package_id);
  const from = p.expiresAt && p.expiresAt > now ? p.expiresAt : now;
  const expiresAt = new Date(from.getTime() + i.days * DAY);
  return preview('write', name, {
    changes: updated('customer_package', p.id, { expires_at: p.expiresAt?.toISOString() ?? null, status: p.status }, { expires_at: expiresAt.toISOString(), status: packageStatusOf({ ...p, expiresAt }, now) }),
  });
}

export async function adjustPreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof packageAdjustSessions>, now: Date): Promise<ActionPreview> {
  const { p, name } = await visiblePackage(tx, ctx, i.package_id);
  if (i.total_sessions < p.usedSessions) throw new AppError('VALIDATION_FAILED', 422, { total_sessions: 'below_used' });
  return preview('write', name, {
    changes: updated('customer_package', p.id, { total: p.totalSessions, status: p.status, reason: null }, { total: i.total_sessions, status: packageStatusOf({ ...p, totalSessions: i.total_sessions }, now), reason: i.reason.trim() }),
  });
}
