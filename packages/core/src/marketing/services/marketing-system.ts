// Ngữ cảnh action HỆ THỐNG của marketing (TIP-037): scheduler / worker gửi / consumer / trang huỷ nhận tin gọi action SYSTEM_ONLY qua
// Executor với actor `system:<tên>` cố định — handler kiểm đúng nguồn + actor (người / Trợ lý / agent / API giả nguồn → 403). Không cấp
// quyền đọc CRM; input chỉ là id / token đã kiểm.
import { AppError } from '@appchat/shared';
import type { ActionContext } from '../../kernel/actions/action-context';

export const MARKETING_ACTORS = {
  dispatch: 'system:campaign-dispatch',
  delivery: 'system:campaign-delivery',
  metric: 'system:campaign-metric',
  analysis: 'system:campaign-analysis',
  unsubscribe: 'system:campaign-unsubscribe',
} as const;
export type MarketingActor = (typeof MARKETING_ACTORS)[keyof typeof MARKETING_ACTORS];

export const systemCtx = (ws: string, actor: MarketingActor, key: string): ActionContext => ({
  workspaceId: ws,
  source: 'system',
  actor: { type: 'system', id: actor },
  authz: { isOwner: true } as never,
  idempotencyKey: key,
});

/** Chỉ đúng actor hệ thống được gọi — mọi nguồn khác 403 (kể cả Owner qua UI / API). */
export function assertSystem(ctx: ActionContext, actor: MarketingActor): void {
  if (ctx.source !== 'system' || ctx.actor.type !== 'system' || ctx.actor.id !== actor) throw new AppError('FORBIDDEN', 403, { source: ctx.source });
}
