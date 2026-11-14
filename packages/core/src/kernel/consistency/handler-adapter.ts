// Bộ chuyển cho handler action `db: 'platform'` (TIP-045b annex A1): pha nền tảng chỉ ĐỌC tenant (bản proxy chặn ghi — không còn
// transaction tenant lồng trong transaction nền tảng), đặt chỗ hạn mức trong commit nền tảng (đếm = tài nguyên tenant đang có + chỗ
// đang giữ), tăng `workspace.authz_epoch` cùng transaction khi quyền đổi, dựng lại ngữ cảnh khôi phục không mang quyền.
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import type { ActionContext, ActionSource, ActorType, PlatformTx, TenantTx } from '../actions/action-context';
import type { OperationContext } from './operation-store';

const WRITES = new Set(['create', 'createMany', 'createManyAndReturn', 'update', 'updateMany', 'updateManyAndReturn', 'upsert', 'delete', 'deleteMany']);
const RAW_WRITES = new Set(['$executeRaw', '$executeRawUnsafe', '$transaction']);

const refuse = (what: string) => () => {
  throw new AppError('INTERNAL', 500, undefined, `pha nền tảng không được ghi tenant (${what}) — chuyển sang tenantPlan / applyTenant`);
};

/** Tenant chỉ đọc cho pha nền tảng: gọi ghi (model.create / update… / $executeRaw / $transaction) → lỗi INTERNAL ngay. */
export function readOnlyTenant(db: TenantDb): TenantTx {
  return new Proxy(db, {
    get(target, prop, recv) {
      const v = Reflect.get(target, prop, recv) as unknown;
      if (typeof prop === 'string' && RAW_WRITES.has(prop)) return refuse(prop);
      if (typeof prop === 'string' && !prop.startsWith('$') && v && typeof v === 'object') {
        return new Proxy(v as object, {
          get(m, op, r) {
            const fn = Reflect.get(m, op, r) as unknown;
            if (typeof op === 'string' && WRITES.has(op)) return refuse(`${prop}.${op}`);
            return typeof fn === 'function' ? (fn as (...a: unknown[]) => unknown).bind(m) : fn;
          },
        });
      }
      return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(target) : v;
    },
  }) as unknown as TenantTx;
}

export type ReservedResource = 'channels' | 'agents';

/** Số chỗ hạn mức đang giữ (thao tác chưa áp xong tenant) — cộng vào số tài nguyên tenant khi kiểm hạn mức. */
export async function openReservations(ptx: PlatformTx, ws: string, resource: ReservedResource): Promise<number> {
  return ptx.quotaReservation.count({ where: { workspaceId: ws, resource, status: 'reserved' } });
}

/** Giữ một chỗ cho thao tác (gọi SAU khi khoá workspace + kiểm hạn mức trong cùng transaction nền tảng). Idempotent theo operation. */
export async function reserveQuota(ptx: PlatformTx, ctx: ActionContext, resource: ReservedResource, now: Date): Promise<void> {
  if (!ctx.operationId) throw new AppError('INTERNAL', 500, undefined, 'reserveQuota cần ctx.operationId');
  await ptx.quotaReservation.upsert({
    where: { operationId: ctx.operationId },
    create: { operationId: ctx.operationId, workspaceId: ctx.workspaceId, resource, createdAt: now },
    update: {},
  });
}

/** Kết thúc chỗ giữ: consumed (tài nguyên tenant đã tạo) / released (bị từ chối). */
export async function settleReservation(ptx: PlatformTx, operationId: string, status: 'consumed' | 'released', now: Date): Promise<void> {
  await ptx.quotaReservation.updateMany({ where: { operationId, status: 'reserved' }, data: { status, settledAt: now } });
}

/** Quyền trong workspace đổi (vai trò / thành viên / chủ) — CÙNG transaction với thay đổi; resolver khoá cache theo số này. */
export async function bumpAuthzEpoch(ptx: PlatformTx, ws: string): Promise<number> {
  const r = await ptx.workspace.update({ where: { id: ws }, data: { authzEpoch: { increment: 1 } }, select: { authzEpoch: true } });
  return r.authzEpoch;
}

const NO_AUTHZ: AuthzContext = { userId: '', isOwner: false, permissions: new Set(), scope: {} as AuthzContext['scope'], teamIds: [] };

/** Ngữ cảnh lưu kèm thao tác (không có quyền / khoá / token). */
export function operationContextOf(ctx: ActionContext, risk: string, at: Date, undoUntil?: Date): OperationContext {
  return {
    source: ctx.source,
    actor: { ...ctx.actor },
    ...(ctx.onBehalfOfUserId ? { onBehalfOfUserId: ctx.onBehalfOfUserId } : {}),
    ...(ctx.runId ? { runId: ctx.runId } : {}),
    ...(ctx.approvalId ? { approvalId: ctx.approvalId } : {}),
    risk,
    ...(undoUntil ? { undoUntil: undoUntil.toISOString() } : {}),
    at: at.toISOString(),
  };
}

/** Ngữ cảnh khôi phục: KHÔNG có quyền (applyTenant / finalizePlatform không được dựa vào authz — quyền đã kiểm trước pha nền tảng). */
export function recoveryContext(ws: string, operationId: string, c: OperationContext): ActionContext {
  return {
    workspaceId: ws,
    source: c.source as ActionSource,
    actor: { type: c.actor.type as ActorType, id: c.actor.id },
    ...(c.onBehalfOfUserId ? { onBehalfOfUserId: c.onBehalfOfUserId } : {}),
    ...(c.runId ? { runId: c.runId } : {}),
    ...(c.approvalId ? { approvalId: c.approvalId } : {}),
    operationId,
    authz: NO_AUTHZ,
  };
}
