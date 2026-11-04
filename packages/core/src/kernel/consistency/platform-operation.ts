// Thao tác action `db: 'platform'` (TIP-045b annex A1) — thay transaction tenant lồng trong transaction nền tảng (không atomic) bằng giao
// thức pha có sổ: (1) sổ `prepared` (khoá idempotency, binding duyệt) → (2) MỘT transaction nền tảng: nghiệp vụ + đặt chỗ hạn mức +
// hiệu ứng ngoài + pha `platform_applied` (handler chỉ ĐỌC tenant) → (3) MỘT transaction tenant: applyTenant + tiêu thụ duyệt +
// action_log + outbox + biên nhận unique → `tenant_applied` → (4) xác nhận nền tảng (route, chốt chỗ giữ) → `complete`.
// Tenant không áp được → 202 `operation_pending` (không phải thành công, không tạo thay đổi mới khi gửi lại); khôi phục ROLE=jobs chạy
// đúng pha còn thiếu. Từ chối tất định ở (2) → `failed` (gửi lại trả đúng lỗi). Pha (2) chưa commit thì không có gì để khôi phục.
import type { ActionAccepted, ActionDef, ActionResult } from '@appchat/actions';
import { AppError } from '@appchat/shared';
import { TenantContexts, type PlatformDb, type TenantDb, type TenantDbResolver } from '@appchat/db';
import type { Clock } from '../clock';
import { uuidv7 } from '../ids';
import { RequestContext } from '../request-context';
import { markDirty } from '../outbox/outbox';
import type { KeyValueStore } from '../redis';
import type { ActionContext, TenantTx } from '../actions/action-context';
import type { ActionHandler } from '../actions/handler';
import { hashInput } from '../actions/confirm-token';
import { operationContextOf, readOnlyTenant, recoveryContext, settleReservation } from './handler-adapter';
import { actorKeyOf, OperationStore, type OperationRow } from './operation-store';
import { dispatchEffects, recordEffects } from './platform-effects';
import { applyTenantStage, type PlatformStageOutcome } from './tenant-receipt';

export type PlatformOutcome<O> = { status: 200; data: ActionResult<O> } | { status: 202; data: Extract<ActionAccepted, { status: 'operation_pending' }> };

/** Điểm chèn lỗi cho test fault (chỉ NODE_ENV=test) — ném tại ranh giới pha. */
export type FaultPoint = 'before_platform' | 'after_platform' | 'before_tenant' | 'after_tenant' | 'after_final';

export interface ApprovalHooks {
  consume(tx: TenantTx, ctx: ActionContext, actionId: string, input: unknown, inputHash?: string): Promise<void>;
  /** Lưu kết quả chuẩn vào duyệt cùng transaction tiêu thụ (không còn `{executed:true}` giả). */
  record?(tx: TenantTx, ctx: ActionContext, output: unknown): Promise<void>;
}

export interface PlatformOperationDeps {
  platform: PlatformDb;
  resolver: TenantDbResolver;
  kv: KeyValueStore;
  clock: Clock;
  encKey?: Buffer;
  approvals?: () => ApprovalHooks | undefined;
}

interface Stored {
  tenant?: Record<string, unknown>;
  stage: PlatformStageOutcome;
}

const statusUrl = (id: string) => `/v1/operations/${id}`;

export class PlatformOperations {
  readonly store: OperationStore;
  private fault: ((p: FaultPoint) => void) | null = null;

  constructor(private readonly d: PlatformOperationDeps) {
    this.store = new OperationStore(d.platform);
  }

  get platformDb(): PlatformDb {
    return this.d.platform;
  }

  /** Số lần đã nhận khôi phục (dead-letter khi quá lượt). */
  async attempts(id: string): Promise<number> {
    return (await this.d.platform.actionOperation.findUnique({ where: { id }, select: { attempts: true } }))?.attempts ?? 0;
  }

  /** Cổng duyệt (domain AI gắn vào executor lúc boot) — đọc lười mỗi lần áp tenant. */
  useApprovals(fn: () => ApprovalHooks | undefined): void {
    this.d.approvals = fn;
  }

  /** Test: chèn lỗi tại ranh giới pha (chỉ NODE_ENV=test). */
  setFaultHook(fn: ((p: FaultPoint) => void) | null): void {
    if (process.env.NODE_ENV !== 'test') throw new Error('setFaultHook chỉ dùng trong test');
    this.fault = fn;
  }

  private hit(p: FaultPoint) {
    this.fault?.(p);
  }

  /** Đường request: mở / nối sổ theo khoá rồi chạy các pha còn thiếu. */
  async run<O>(
    ctx: ActionContext,
    def: ActionDef,
    handler: ActionHandler,
    input: unknown,
    prepared: unknown,
    d: { inputHash: string; logInput: unknown; idempotencyKey?: string; undoUntil?: Date; afterCommit?: (fn: () => Promise<void>) => void },
  ): Promise<PlatformOutcome<O>> {
    const now = this.d.clock.now();
    const opened = await this.store.open({
      id: uuidv7(now.getTime()),
      workspaceId: ctx.workspaceId,
      actorKey: actorKeyOf(ctx.actor),
      // Không có khoá client → thao tác mới mỗi lần (vẫn đi qua sổ để khôi phục được).
      idempotencyKey: d.idempotencyKey ?? `auto:${uuidv7(now.getTime())}`,
      actionId: def.id,
      inputHash: d.inputHash,
      context: { ...operationContextOf(ctx, def.risk, now, d.undoUntil), ...(ctx.approvalId ? { approvalInputHash: hashInput(input) } : {}) },
      logInput: d.logInput,
      actionLogId: uuidv7(now.getTime()),
      traceId: RequestContext.get()?.traceId,
      now,
    });
    let op = opened.row;
    ctx.operationId = op.id;
    if (op.phase === 'complete') return { status: 200, data: op.result as ActionResult<O> };
    if (op.phase === 'failed') throw storedError(op.error);
    if (op.phase === 'compensation_required') throw new AppError('CONFLICT', 409, { operation: 'compensation_required' });
    let afterCommit: (() => Promise<void>) | undefined;
    if (op.phase === 'prepared') {
      const r = await this.platformStage(ctx, def, handler, op, input, prepared);
      op = r.op;
      afterCommit = r.afterCommit;
    }
    const out = await this.finish<O>(ctx, def, handler, op);
    if (out.status === 200 && afterCommit) d.afterCommit?.(afterCommit);
    return out;
  }

  /**
   * Gửi lại cùng khoá (trước cổng xem trước): đã xong → kết quả; thất bại → lỗi cũ; nền tảng đã commit → làm nốt pha còn thiếu (không
   * chạy lại nghiệp vụ nền tảng); chưa commit (`prepared`) / chưa có → null (đi đường thường).
   */
  async replay<O>(ctx: ActionContext, def: ActionDef, handler: ActionHandler, inputHash: string, key: string): Promise<PlatformOutcome<O> | null> {
    const op = await this.store.findByKey(ctx.workspaceId, actorKeyOf(ctx.actor), key);
    if (!op) return null;
    if (op.actionId !== def.id || op.inputHash !== inputHash) throw new AppError('CONFLICT', 409, { idempotency_key: 'mismatch' });
    if (op.phase === 'complete') return { status: 200, data: op.result as ActionResult<O> };
    if (op.phase === 'failed') throw storedError(op.error);
    if (op.phase === 'compensation_required') throw new AppError('CONFLICT', 409, { operation: 'compensation_required' });
    if (op.phase === 'prepared') return null;
    ctx.operationId = op.id;
    return this.finish<O>(ctx, def, handler, op);
  }

  /** Đường khôi phục (worker): không có input → chỉ chạy pha sau `platform_applied`. */
  async recover(op: OperationRow, defs: Map<string, ActionDef>, handler: (id: string) => ActionHandler | undefined): Promise<'complete' | 'pending' | 'failed'> {
    if (op.phase === 'prepared') {
      // Chưa commit nền tảng (pha 2 cùng transaction với chuyển pha) → không có gì đã xảy ra; bỏ thao tác cũ.
      await this.store.advance(this.d.platform, op.id, 'prepared', 'failed', this.d.clock.now(), { error: { code: 'ABANDONED', httpStatus: 409 } });
      return 'failed';
    }
    const def = defs.get(op.actionId);
    const h = handler(op.actionId);
    if (!def || !h) return 'pending';
    const ctx = recoveryContext(op.workspaceId, op.id, op.context);
    const out = await RequestContext.run({ traceId: op.traceId ?? uuidv7(), source: 'job', job: 'operation-recovery', ws: op.workspaceId }, () => this.finish(ctx, def, h, op));
    return out.status === 200 ? 'complete' : 'pending';
  }

  private async platformStage(ctx: ActionContext, def: ActionDef, handler: ActionHandler, op: OperationRow, input: unknown, prepared: unknown) {
    const db = await this.tenantDb(ctx.workspaceId, def.id);
    const ro = readOnlyTenant(db);
    this.hit('before_platform');
    let afterCommit: (() => Promise<void>) | undefined;
    let next: OperationRow;
    try {
      next = await this.d.platform.$transaction(async (ptx) => {
        const cur = await this.store.lock(ptx, op.id);
        if (!cur || cur.phase !== 'prepared') return cur!;
        const r = await handler.execute(ctx, input, ro, ptx, prepared);
        const now = this.d.clock.now();
        await recordEffects(ptx, ctx.workspaceId, op.id, r.effects ?? [], this.d.encKey, now);
        const plan: Stored = { ...(r.tenantPlan ? { tenant: r.tenantPlan } : {}), stage: { result: r.result, before: r.before, after: r.after, events: r.events } };
        afterCommit = r.afterCommit;
        await this.store.advance(ptx, op.id, 'prepared', 'platform_applied', now, { plan });
        return { ...cur, phase: 'platform_applied' as const, plan: plan as unknown as Record<string, unknown> };
      });
    } catch (e) {
      // Không có gì commit ở nền tảng: lỗi nghiệp vụ tất định → chốt `failed` (gửi lại trả đúng lỗi); lỗi khác giữ `prepared` để thử lại.
      if (e instanceof AppError) await this.store.advance(this.d.platform, op.id, 'prepared', 'failed', this.d.clock.now(), { error: { code: e.code, httpStatus: e.httpStatus, fields: e.fields, message: e.message } });
      throw e;
    }
    await dispatchEffects({ platform: this.d.platform, key: this.d.encKey, now: () => this.d.clock.now() }, op.id).catch(() => undefined);
    this.hit('after_platform');
    return { op: next, afterCommit };
  }

  /** Pha tenant (nếu thiếu) + xác nhận nền tảng. Tenant không áp được → 202 pending; xác nhận lỗi vẫn trả kết quả (khôi phục làm tiếp). */
  private async finish<O>(ctx: ActionContext, def: ActionDef, handler: ActionHandler, op: OperationRow): Promise<PlatformOutcome<O>> {
    let result = op.result as ActionResult<O> | null;
    if (op.phase === 'platform_applied') {
      const stored = (op.plan ?? {}) as unknown as Stored;
      try {
        this.hit('before_tenant');
        const db = await this.tenantDb(ctx.workspaceId, def.id);
        const hooks = ctx.approvalId ? this.d.approvals?.() : undefined;
        const r = await applyTenantStage<O>(db, ctx, def, handler, { ...op, plan: stored as unknown as Record<string, unknown> }, stored.stage, {
          ...(hooks ? { consumeApproval: (tx) => hooks.consume(tx, ctx, def.id, undefined, op.context.approvalInputHash) } : {}),
          ...(hooks?.record ? { recordApproval: (tx, output) => hooks.record!(tx, ctx, output) } : {}),
        });
        result = r.data;
        if (r.events) await markDirty(this.d.kv, ctx.workspaceId).catch(() => undefined);
        await this.store.advance(this.d.platform, op.id, 'platform_applied', 'tenant_applied', this.d.clock.now(), { result });
      } catch (e) {
        if (e instanceof AppError && e.code === 'FORBIDDEN' && e.fields?.approval_id) {
          // Duyệt không còn hợp lệ sau khi nền tảng đã áp: không tự hoàn tác ẩn — đánh dấu cần bù trừ.
          await this.store.advance(this.d.platform, op.id, 'platform_applied', 'compensation_required', this.d.clock.now(), { error: { code: e.code } });
          throw e;
        }
        return { status: 202, data: { status: 'operation_pending', operation_id: op.id, action_log_id: op.actionLogId, status_url: statusUrl(op.id) } };
      }
      op = { ...op, phase: 'tenant_applied' };
    }
    if (op.phase === 'tenant_applied') {
      try {
        this.hit('after_tenant');
        await this.finalize(ctx, def, handler, op);
        this.hit('after_final');
      } catch {
        // Đã có biên nhận tenant: lệnh đã thành công; xác nhận nền tảng do khôi phục chạy lại.
      }
    }
    if (!result) {
      const fresh = await this.store.get(op.id);
      result = (fresh?.result as ActionResult<O> | null) ?? null;
    }
    if (!result) return { status: 202, data: { status: 'operation_pending', operation_id: op.id, action_log_id: op.actionLogId, status_url: statusUrl(op.id) } };
    return { status: 200, data: result };
  }

  private async finalize(ctx: ActionContext, def: ActionDef, handler: ActionHandler, op: OperationRow): Promise<void> {
    const stored = (op.plan ?? {}) as unknown as Stored;
    const db = handler.finalizePlatform && stored.tenant ? await this.tenantDb(ctx.workspaceId, def.id) : null;
    await this.d.platform.$transaction(async (ptx) => {
      const cur = await this.store.lock(ptx, op.id);
      if (!cur || cur.phase !== 'tenant_applied') return;
      const now = this.d.clock.now();
      if (db && stored.tenant) await handler.finalizePlatform!(ctx, stored.tenant, ptx, readOnlyTenant(db));
      await settleReservation(ptx, op.id, 'consumed', now);
      await this.store.advance(ptx, op.id, 'tenant_applied', 'complete', now);
    });
  }

  private tenantDb(ws: string, actionId: string): Promise<TenantDb> {
    return this.d.resolver.get(TenantContexts.system(ws, `action:${actionId}`));
  }
}

function storedError(e: unknown): AppError {
  const x = (e ?? {}) as { code?: string; httpStatus?: number; fields?: Record<string, string>; message?: string };
  return new AppError((x.code ?? 'CONFLICT') as never, x.httpStatus ?? 409, x.fields, x.message);
}
