// Ngữ cảnh vòng đời workspace (TIP-041 §3 "Member lifecycle context"): action trong allowlist cố định chạy khi DB tenant KHÔNG mở được
// (đã lưu trữ / đang khôi phục) — chỉ cần JWT + membership active ở DB nền tảng. Không phải AuthzContext toàn quyền: không đọc / ghi dữ
// liệu tenant, không scope, không vai trò; handler tự kiểm membership / Owner lại trong transaction nền tảng. Ngữ cảnh chỉ dựng phía server
// (dấu tin cậy riêng) sau khi controller xác thực; header / object tự dựng không thành ngữ cảnh. Đi cùng ActionExecutor: registry → zod →
// allowlist → idempotency (biên nhận nền tảng `admin_operation`, khoá theo người + key) → MỘT transaction nền tảng: nghiệp vụ + audit nền tảng
// (ô bí mật — OTP — che trước khi vào audit / biên nhận) + hiệu ứng bền `platform_effect` (thư OTP xoá, mã hoá, gửi sau commit). Pha 3:
// thêm `workspace.delete_challenge` / `workspace.delete` / `workspace.freeze_request` — handler tự kiểm ĐÚNG Owner (`owner_user_id`).
import type { ActionDef, ActionResult } from '@appchat/actions';
import type { PlatformDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { ZodError } from 'zod';
import type { Clock } from '../clock';
import { auditSafe } from '../audit/audit-projection';
import { dispatchEffects, recordEffects } from '../consistency/platform-effects';
import { uuidv7 } from '../ids';
import { RequestContext } from '../request-context';
import type { PlatformTx } from './action-context';
import { hashInput } from './confirm-token';
import { maskSecrets } from './secret-fields';
import { toLogJson } from './executor-redact';
import type { ActionHandler } from './handler';

/** Action chạy được bằng ngữ cảnh vòng đời — cố định, không mở rộng theo header / input. */
export const LIFECYCLE_ACTIONS: ReadonlySet<string> = new Set(['workspace.open', 'workspace.delete_challenge', 'workspace.delete', 'workspace.freeze_request']);

const TRUSTED = Symbol('appchat.lifecycle-context');

export interface LifecycleContext {
  readonly scope: 'lifecycle';
  readonly source: 'ui';
  readonly workspaceId: string;
  readonly actor: { readonly type: 'user'; readonly id: string };
  readonly idempotencyKey?: string;
}

/** CHỈ gọi sau khi đã xác thực JWT của `userId`; membership kiểm lại trong handler (transaction nền tảng). */
export function lifecycleContext(userId: string, workspaceId: string, o: { idempotencyKey?: string } = {}): LifecycleContext {
  const ctx = { scope: 'lifecycle' as const, source: 'ui' as const, workspaceId, actor: { type: 'user' as const, id: userId }, ...o };
  Object.defineProperty(ctx, TRUSTED, { value: true, enumerable: false });
  return Object.freeze(ctx);
}

export const isTrustedLifecycleContext = (c: unknown): c is LifecycleContext =>
  !!c && typeof c === 'object' && (c as Record<symbol, unknown>)[TRUSTED] === true && (c as LifecycleContext).scope === 'lifecycle';

export interface LifecycleOutcome<O> {
  result: O;
  after?: unknown;
  afterCommit?: () => Promise<void>;
  /** Hiệu ứng ngoài bền (payload mã hoá, ghi cùng commit, gửi sau commit) — vd. thư OTP xoá. */
  effects?: readonly { kind: string; payload: Record<string, unknown>; ttlMs: number }[];
}

/** Handler vòng đời: ghi trong transaction nền tảng, không bao giờ nhận DB tenant. Đường tenant (`execute`) luôn bị từ chối. */
export abstract class LifecycleActionHandler<I = unknown, O = unknown> {
  readonly lifecycleOnly = true as const;
  abstract executeLifecycle(ctx: LifecycleContext, input: I, ptx: PlatformTx): Promise<LifecycleOutcome<O>>;
  async execute(): Promise<never> {
    throw new AppError('FORBIDDEN', 403, { scope: 'lifecycle' });
  }
}

export const isLifecycleHandler = (h: unknown): h is LifecycleActionHandler => !!h && typeof h === 'object' && (h as LifecycleActionHandler).lifecycleOnly === true;

const isUnique = (e: unknown) => (e as { code?: string })?.code === 'P2002';

export async function executeLifecycleAction<O>(
  d: { platform: PlatformDb; clock: Clock; zodFields: (e: ZodError) => Record<string, string>; encKey?: Buffer },
  def: ActionDef,
  handler: ActionHandler | undefined,
  ctx: LifecycleContext,
  rawInput: unknown,
): Promise<{ status: 200; data: ActionResult<O> }> {
  if (!isTrustedLifecycleContext(ctx) || !LIFECYCLE_ACTIONS.has(def.id)) throw new AppError('FORBIDDEN', 403, { scope: 'lifecycle' });
  if (!handler || !isLifecycleHandler(handler)) throw new AppError('NOT_IMPLEMENTED', 501, undefined, def.id);
  const parsed = def.input.safeParse(rawInput ?? {});
  if (!parsed.success) throw new AppError('VALIDATION_FAILED', 422, d.zodFields(parsed.error));
  const input = parsed.data as unknown;
  const key = ctx.idempotencyKey ? `lc:${ctx.workspaceId}:${ctx.idempotencyKey}` : undefined;
  const reqHash = hashInput({ actionId: def.id, input: maskSecrets(def, input), actor: ctx.actor, ws: ctx.workspaceId });
  const replay = async () => {
    const prev = await d.platform.adminOperation.findUnique({ where: { actorUserId_idempotencyKey: { actorUserId: ctx.actor.id, idempotencyKey: key! } } });
    if (!prev) return null;
    if (prev.actionId !== def.id || prev.inputHash !== reqHash) throw new AppError('CONFLICT', 409, { idempotency_key: 'mismatch' });
    return { status: 200 as const, data: prev.result as unknown as ActionResult<O> };
  };
  if (key) {
    const again = await replay();
    if (again) return again;
  }
  const now = d.clock.now();
  const auditId = uuidv7(now.getTime());
  let after: (() => Promise<void>) | undefined;
  let hasEffects = false;
  try {
    const data = await d.platform.$transaction(async (ptx) => {
      const r = await handler.executeLifecycle(ctx, input, ptx);
      const output = def.output.parse(r.result) as O;
      const data: ActionResult<O> = { result: output, action_log_id: auditId };
      await ptx.platformAuditLog.create({
        data: {
          id: auditId,
          actorUserId: ctx.actor.id,
          actionId: def.id,
          workspaceId: ctx.workspaceId,
          input: { input: auditSafe(def, toLogJson(input)) ?? null } as object,
          result: { result: auditSafe(def, toLogJson(output)) ?? null, after: auditSafe(def, toLogJson(r.after)) ?? null } as object,
          traceId: RequestContext.get()?.traceId ?? null,
          createdAt: now,
        },
      });
      if (key) await ptx.adminOperation.create({ data: { id: uuidv7(now.getTime()), actorUserId: ctx.actor.id, idempotencyKey: key, actionId: def.id, inputHash: reqHash, result: toLogJson(data) as object, createdAt: now } });
      // Hiệu ứng gắn với bản ghi audit (operation id) — unique(operation, kind) chặn nhân đôi khi chạy lại.
      if (r.effects?.length) await recordEffects(ptx, ctx.workspaceId, auditId, r.effects, d.encKey, now);
      hasEffects = !!r.effects?.length;
      after = r.afterCommit;
      return data;
    });
    if (hasEffects) await dispatchEffects({ platform: d.platform, key: d.encKey, now: () => d.clock.now() }, auditId).catch(() => undefined);
    if (after) await after().catch(() => undefined);
    return { status: 200, data };
  } catch (e) {
    if (key && isUnique(e)) {
      const again = await replay();
      if (again) return again;
    }
    throw e;
  }
}
