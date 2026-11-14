// `sales_settings.update` (TIP-032b P1, COMMERCE §3 Q5): Owner chỉnh ngưỡng duyệt báo giá. Chỉ Chủ sở hữu hiện hành (`authz.isOwner` —
// không theo tên vai trò; Quản lý có `settings.manage` vẫn bị chặn). CAS `if_version` (concurrency §1) → STALE_VERSION kèm version hiện tại;
// workspace chưa có dòng (trước migration seed) → tạo với version 1. Outbox `sales_settings.updated` để FE / worker làm mới ngưỡng.
// Preview: trước / sau đúng trường đổi; preview không chặn quyền (executor + execute kiểm lại).
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, salesSettingsUpdate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { line, preview, updated } from '../../kernel/actions/preview-kit';
import { actorUserId } from '../../crm/public';
import { readApprovalPolicy } from './policy';

type In = ActionInput<typeof salesSettingsUpdate>;
type Out = { version: number; approval_total_vnd: string; approval_discount_pct: number };

const ownerOnly = (ctx: ActionContext) => {
  if (!ctx.authz.isOwner) throw new AppError('FORBIDDEN', 403, { permission: 'owner' });
};

@Injectable()
@ActionHandler('sales_settings.update')
export class SalesSettingsUpdateHandler implements Handler<In, Out> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: In, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    ownerOnly(ctx);
    await tx.$queryRaw`SELECT 1 FROM commerce_settings WHERE id = 1 FOR UPDATE`;
    const cur = await readApprovalPolicy(tx);
    if (cur.version !== input.if_version) throw new AppError('STALE_VERSION', 409, { version: String(cur.version) });
    const total = input.approval_total_vnd ?? cur.total_vnd;
    const pct = input.approval_discount_pct ?? cur.discount_pct;
    const now = this.clock.now();
    const data = { approvalTotalVnd: BigInt(total), approvalDiscountPct: pct, updatedBy: actorUserId(ctx), updatedAt: now };
    const row = await tx.commerceSettings.upsert({ where: { id: 1 }, create: { id: 1, version: 1, ...data }, update: { ...data, version: { increment: 1 } } });
    const result = { version: row.version, approval_total_vnd: String(row.approvalTotalVnd), approval_discount_pct: row.approvalDiscountPct };
    return {
      result,
      before: { approval_total_vnd: cur.total_vnd, approval_discount_pct: cur.discount_pct, version: cur.version },
      after: result,
      events: [{ topic: 'sales_settings.updated', payload: result }],
    };
  }

  async preview(ctx: ActionContext, input: In, tx: TenantTx) {
    ownerOnly(ctx);
    const cur = await readApprovalPolicy(tx);
    if (cur.version !== input.if_version) throw new AppError('STALE_VERSION', 409, { version: String(cur.version) });
    const after = { approval_total_vnd: input.approval_total_vnd, approval_discount_pct: input.approval_discount_pct };
    return preview('config', line('sales_policy', `v${cur.version}`), {
      changes: updated('sales_settings', 'sales_policy', { approval_total_vnd: cur.total_vnd, approval_discount_pct: cur.discount_pct }, after),
    });
  }
}
