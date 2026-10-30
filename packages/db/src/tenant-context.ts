// TenantContext đã xác thực (tenant-db §4): chỉ tạo được qua 3 cổng dưới, có dấu riêng tư → object tự dựng bị resolver từ chối.
const VERIFIED = Symbol('appchat.tenant-context');

export type TenantContextVia = 'membership' | 'route' | 'system';

export interface TenantContext {
  readonly workspaceId: string;
  readonly via: TenantContextVia;
  /** membership: user đã kiểm; route: loại route (channel / widget / bank_feed / integration / sign); system: tên job. */
  readonly subject: string;
  readonly [VERIFIED]: true;
}

function make(workspaceId: string, via: TenantContextVia, subject: string): TenantContext {
  if (!workspaceId) throw new Error('workspaceId rỗng');
  return Object.freeze({ workspaceId, via, subject, [VERIFIED]: true as const });
}

export const TenantContexts = {
  /** Sau khi middleware kiểm `membership(ws, user)` đang active (TIP-004 / 005). */
  fromMembership: (workspaceId: string, userId: string) => make(workspaceId, 'membership', userId),
  /** Sau khi tra bảng tenant_*_route ở DB nền tảng (kênh, widget, webhook, trang ký). */
  fromRoute: (workspaceId: string, route: string) => make(workspaceId, 'route', route),
  /** Job nội bộ mang workspaceId trong payload (outbox relay, scheduler, provision, migrate). */
  system: (workspaceId: string, job: string) => make(workspaceId, 'system', job),
};

export function isVerifiedContext(ctx: unknown): ctx is TenantContext {
  return typeof ctx === 'object' && ctx !== null && (ctx as Record<symbol, unknown>)[VERIFIED] === true && Object.isFrozen(ctx);
}
