// Đường chạy action quản trị nền tảng trong ActionExecutor (TIP-040, DC-368) — cùng thứ tự với action thường: registry → zod → quyền
// (`platform_admin` kiểm SỐNG mỗi lần: thu hồi giữa preview và xác nhận → 403) → idempotency → preview / xác nhận (nếu action luôn preview)
// → MỘT transaction nền tảng: nghiệp vụ + `platform_audit_log` + `admin_operation` (biên nhận khoá theo admin + Idempotency-Key).
// Không mở DB tenant, không ghi action_log tenant, không workspace "của admin" (bỏ cách tạm DC-054). `action_log_id` trả về = id audit
// nền tảng; action quản trị không có undo (không nhầm với route hoàn tác tenant).
import type { ActionDef, ActionResult } from '@appchat/actions';
import type { PlatformDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { ZodError } from 'zod';
import type { Clock } from '../clock';
import { uuidv7 } from '../ids';
import { RequestContext } from '../request-context';
import { auditSafe } from '../audit/audit-projection';
import type { ActionContext, Authorizer } from './action-context';
import { hashInput, type ConfirmTokens } from './confirm-token';
import { maskSecrets } from './secret-fields';
import { requiresIdempotencyKey } from './policy';
import { isPlatformHandler, isTrustedPlatformContext, type PlatformContext } from './platform-context';
import type { ActionHandler } from './handler';
import { toLogJson } from './executor-redact';

export type PlatformExecuteOutcome<O> =
  | { status: 200; data: ActionResult<O> }
  | { status: 202; data: { status: 'preview_required'; preview: unknown; confirm_token: string; expires_at: string } };

export interface PlatformExecDeps {
  platform: PlatformDb;
  authorizer: Authorizer;
  confirm: ConfirmTokens;
  clock: Clock;
  zodFields: (e: ZodError) => Record<string, string>;
  /** Action quản trị luôn xem trước trước khi chạy (risk config tác động rộng — archive / restore…). */
  alwaysPreview?: ReadonlySet<string>;
}

/** Workspace "trống" của ngữ cảnh nền tảng khi đi qua port quyền / confirm_token (không bao giờ dùng để mở DB tenant). */
const NO_WORKSPACE = 'platform';

/** Bản ActionContext tối thiểu cho Authorizer / ConfirmTokens — không có authz tenant (handler nền tảng không đọc). */
const portCtx = (ctx: PlatformContext): ActionContext =>
  ({ workspaceId: NO_WORKSPACE, source: 'ui', actor: ctx.actor, authz: { userId: ctx.actor.id, isOwner: false, permissions: new Set(), scope: {}, teamIds: [] } }) as unknown as ActionContext;

const isUnique = (e: unknown) => (e as { code?: string })?.code === 'P2002';

export async function executePlatformAction<O>(
  d: PlatformExecDeps,
  def: ActionDef,
  handler: ActionHandler | undefined,
  ctx: PlatformContext,
  rawInput: unknown,
): Promise<PlatformExecuteOutcome<O>> {
  if (!isTrustedPlatformContext(ctx)) throw new AppError('FORBIDDEN', 403, { scope: 'platform' });
  if (def.permission !== 'platform_admin' || def.db !== 'platform') throw new AppError('FORBIDDEN', 403, { scope: 'workspace' });
  if (!handler || !isPlatformHandler(handler)) throw new AppError('NOT_IMPLEMENTED', 501, undefined, `${def.id} chưa có handler nền tảng`);

  const parsed = def.input.safeParse(rawInput ?? {});
  if (!parsed.success) throw new AppError('VALIDATION_FAILED', 422, d.zodFields(parsed.error));
  const input = parsed.data as unknown;
  const pc = portCtx(ctx);
  if (!(await d.authorizer.can(pc, 'platform_admin'))) throw new AppError('FORBIDDEN', 403, { permission: 'platform_admin' });

  const key = ctx.idempotencyKey;
  const reqHash = hashInput({ actionId: def.id, input: maskSecrets(def, input), actor: ctx.actor });
  if (key) {
    const prev = await d.platform.adminOperation.findUnique({ where: { actorUserId_idempotencyKey: { actorUserId: ctx.actor.id, idempotencyKey: key } } });
    if (prev) {
      if (prev.actionId !== def.id || prev.inputHash !== reqHash) throw new AppError('CONFLICT', 409, { idempotency_key: 'mismatch' });
      return { status: 200, data: prev.result as unknown as ActionResult<O> };
    }
  }

  if (d.alwaysPreview?.has(def.id) && !(await d.confirm.consume(pc, def.id, input, ctx.confirmToken))) {
    const preview = await handler.previewPlatform(ctx, input, d.platform);
    const { token, expiresAt } = await d.confirm.issue(pc, def.id, input, d.clock.now().getTime());
    return { status: 202, data: { status: 'preview_required', preview, confirm_token: token, expires_at: expiresAt.toISOString() } };
  }
  if (!key && requiresIdempotencyKey(def.id, def.risk)) throw new AppError('VALIDATION_FAILED', 422, { idempotency_key: 'required' });

  const now = d.clock.now();
  const auditId = uuidv7(now.getTime());
  const traceId = RequestContext.get()?.traceId ?? null;
  let after: (() => Promise<void>) | undefined;
  const prepared = handler.prepare ? await handler.prepare(ctx, input, d.platform) : undefined;
  try {
    const data = await d.platform.$transaction(async (ptx) => {
      const r = await handler.executePlatform(ctx, input, ptx, prepared);
      const output = def.output.parse(r.result) as O;
      const data: ActionResult<O> = { result: output, action_log_id: auditId };
      await ptx.platformAuditLog.create({
        data: {
          id: auditId,
          actorUserId: ctx.actor.id,
          actionId: def.id,
          workspaceId: r.targetWorkspaceId ?? null,
          input: { input: auditSafe(def, toLogJson(input)) ?? null, before: auditSafe(def, toLogJson(r.before)) ?? null } as object,
          result: { result: auditSafe(def, toLogJson(output)) ?? null, after: auditSafe(def, toLogJson(r.after)) ?? null } as object,
          traceId,
          createdAt: now,
        },
      });
      if (key)
        await ptx.adminOperation.create({
          data: { id: uuidv7(now.getTime()), actorUserId: ctx.actor.id, idempotencyKey: key, actionId: def.id, inputHash: reqHash, result: toLogJson(data) as object, createdAt: now },
        });
      after = r.afterCommit;
      return data;
    });
    if (after) await after().catch(() => undefined);
    return { status: 200, data };
  } catch (e) {
    // Hai request cùng khoá chạy song song: bên thua đọc lại biên nhận của bên thắng (không ghi đôi).
    if (key && isUnique(e)) {
      const prev = await d.platform.adminOperation.findUnique({ where: { actorUserId_idempotencyKey: { actorUserId: ctx.actor.id, idempotencyKey: key } } });
      if (prev && prev.actionId === def.id && prev.inputHash === reqHash) return { status: 200, data: prev.result as unknown as ActionResult<O> };
      if (prev) throw new AppError('CONFLICT', 409, { idempotency_key: 'mismatch' });
    }
    throw e;
  }
}

/** Preview không bắt buộc (màn quản trị hiện thẻ tác động trước khi bấm) — chỉ đọc, kiểm quyền sống như execute. */
export async function previewPlatformAction(d: Pick<PlatformExecDeps, 'platform' | 'authorizer' | 'zodFields'>, def: ActionDef, handler: ActionHandler | undefined, ctx: PlatformContext, rawInput: unknown) {
  if (!isTrustedPlatformContext(ctx) || def.permission !== 'platform_admin') throw new AppError('FORBIDDEN', 403, { scope: 'platform' });
  if (!handler || !isPlatformHandler(handler)) throw new AppError('NOT_IMPLEMENTED', 501, undefined, def.id);
  const parsed = def.input.safeParse(rawInput ?? {});
  if (!parsed.success) throw new AppError('VALIDATION_FAILED', 422, d.zodFields(parsed.error));
  if (!(await d.authorizer.can(portCtx(ctx), 'platform_admin'))) throw new AppError('FORBIDDEN', 403, { permission: 'platform_admin' });
  return handler.previewPlatform(ctx, parsed.data, d.platform);
}
