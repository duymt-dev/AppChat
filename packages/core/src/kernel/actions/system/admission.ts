// Gọi action riêng bằng capability gắn nguồn (TIP-003c §1.2–1.3): domain đăng ký VERIFIER theo action lúc bootstrap; `runSystemAction`
// hỏi verifier kiểm bằng chứng nguồn ĐÃ LƯU trong DB tenant (không tin payload queue), niêm phong capability lên ctx hệ thống MỚI rồi
// gọi Executor, gỡ niêm phong trong finally. Thiếu verifier → 501, không bao giờ chạy trần. Kernel chỉ điều phối cổng — chính sách
// nghiệp vụ ở verifier / handler của domain (handler kiểm lại nguồn trong transaction hiệu ứng).
import { AppError } from '@appchat/shared';
import { TenantContexts, type TenantDb, type TenantDbResolver } from '@appchat/db';
import type { ActionContext } from '../action-context';
import type { ActionExecutor, ExecuteOutcome } from '../executor';
import { canonicalDigest, sealSystemContext, unsealSystemContext, type SystemCapability, type SystemSourceKind } from './capability';

export interface SystemTrigger {
  workspaceId: string;
  actionId: string;
  sourceKind: SystemSourceKind;
  sourceRef: string;
  targetId: string;
  /** Thế hệ domain của mục tiêu do chủ domain duy trì (hạn / token / epoch…) — không dùng updated_at hay giờ quét. */
  generation: string;
  milestone?: string;
  input: Record<string, unknown>;
  /** Actor hệ thống (vd. `bank-ingress`) — để audit + verifier hẹp của domain, KHÔNG phải quyền. */
  actor: string;
  idempotencyKey?: string;
}

/** Verifier của domain: nguồn đã lưu khớp trigger (tồn tại, đúng target / generation). Không khớp → ném 404 / 409. */
export type SystemVerifier = (t: Readonly<SystemTrigger>, db: TenantDb) => Promise<void>;

export interface VerifierOptions {
  /** Mặc định `trigger`. `domain` chỉ cho action tiền nhiệm có khoá chống lặp riêng đã duyệt (012b / 015c / 030b). */
  receipt?: 'trigger' | 'domain';
}

const verifiers = new Map<string, { verify: SystemVerifier; receipt: 'trigger' | 'domain' }>();

export function registerSystemVerifier(actionId: string, v: SystemVerifier, o: VerifierOptions = {}): void {
  const prev = verifiers.get(actionId);
  if (prev && prev.verify !== v) throw new Error(`Trùng system verifier: ${actionId}`);
  verifiers.set(actionId, { verify: v, receipt: o.receipt ?? 'trigger' });
}

export const systemVerifierRegistered = (actionId: string): boolean => verifiers.has(actionId);
/** Chỉ test. */
export const unregisterSystemVerifier = (actionId: string): boolean => verifiers.delete(actionId);

/** Ngữ cảnh hệ thống mới cho một lần gọi. `isOwner` chỉ có nghĩa SAU cổng capability (action riêng); action công khai không nhận ctx này. */
export function systemContext(t: Pick<SystemTrigger, 'workspaceId' | 'actor' | 'idempotencyKey'>): ActionContext {
  return {
    workspaceId: t.workspaceId,
    source: 'system',
    actor: { type: 'system', id: t.actor },
    authz: { isOwner: true } as never,
    ...(t.idempotencyKey ? { idempotencyKey: t.idempotencyKey } : {}),
  };
}

/** `ctx` truyền vào chỉ khi domain cần niêm phong thêm capability hẹp của riêng nó lên cùng object (vd. ký phụ lục công khai). */
export async function runSystemAction<O = unknown>(executor: Pick<ActionExecutor, 'execute'>, tenants: Pick<TenantDbResolver, 'get'>, t: SystemTrigger, ctx: ActionContext = systemContext(t)): Promise<ExecuteOutcome<O>> {
  const reg = verifiers.get(t.actionId);
  if (!reg) throw new AppError('NOT_IMPLEMENTED', 501, { capability: 'verifier_missing' }, t.actionId);
  if (ctx.workspaceId !== t.workspaceId) throw new AppError('FORBIDDEN', 403, { capability: 'workspace' });
  // DB tenant theo workspace của trigger (ngữ cảnh tin cậy), không theo payload.
  const db = await tenants.get(TenantContexts.system(t.workspaceId, `system:${t.actionId}`));
  await reg.verify(Object.freeze({ ...t }), db);
  const cap: SystemCapability = {
    workspaceId: t.workspaceId,
    actionId: t.actionId,
    sourceKind: t.sourceKind,
    sourceRef: t.sourceRef,
    targetId: t.targetId,
    generation: t.generation,
    milestone: t.milestone ?? '',
    inputDigest: canonicalDigest(t.input),
    receipt: reg.receipt,
  };
  sealSystemContext(ctx, cap);
  try {
    return await executor.execute<O>(ctx, t.actionId, t.input);
  } finally {
    unsealSystemContext(ctx);
  }
}
