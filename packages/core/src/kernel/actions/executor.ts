// ActionExecutor — cổng ghi duy nhất (action-registry §5). Thứ tự không đổi:
// registry → zod → permission → policy → idempotency → transaction (handler + action_log + outbox) → kết quả.
import { isInternalAction, type ActionAccepted, type ActionDef, type ActionResult } from '@appchat/actions';
import { AppError } from '@appchat/shared';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import type { ZodError } from 'zod';
import type { Clock } from '../clock';
import { uuidv7 } from '../ids';
import { RequestContext } from '../request-context';
import { markDirty, writeOutbox } from '../outbox/outbox';
import { enroll } from '../outbox/transaction';
import { isSecurityAction } from '../audit/audit-projection';
import { securityEvents } from '../audit/audit.service';
import type { KeyValueStore } from '../redis';
import type { ActionContext, Authorizer, TenantTx } from './action-context';
import type { ConfirmTokens } from './confirm-token';
import { hashInput } from './confirm-token';
import type { ActionHandlerRegistry } from './handler-registry';
import { decidePolicy, requiresIdempotencyKey } from './policy';
import { withRequiredApproval } from './required-approval';
import { maskSecrets } from './secret-fields';
import { acceptedResponse, replayAccepted } from './job-accepted';
import { redactDeep, toLogJson } from './executor-redact';
import { projectActionOutput } from '../../authz/fields/action-output';
import type { PlatformOperations } from '../consistency/platform-operation';
import { executePlatformAction, previewPlatformAction, type PlatformExecuteOutcome } from './platform-execution';
import type { PlatformContext } from './platform-context';
import { executeLifecycleAction, LIFECYCLE_ACTIONS, type LifecycleContext } from './workspace-lifecycle-context';
import { activityEvent } from './activity-event';
import { admitInternal } from './system/capability';
import { systemAdmission } from './system/executor-hook';
import type { ExecutionBindingPort } from './execution-binding';

export type ExecuteOutcome<O = unknown> = { status: 200; data: ActionResult<O> } | { status: 202; data: ActionAccepted };

export interface ExecutorDeps {
  registry: readonly ActionDef[];
  handlers: ActionHandlerRegistry;
  resolver: TenantDbResolver;
  authorizer: Authorizer;
  confirm: ConfirmTokens;
  kv: KeyValueStore;
  clock: Clock;
  /** DB nền tảng cho action `db: 'platform'` (identity / member / workspace / billing / admin). */
  platform?: PlatformDb;
  /** Sổ thao tác xuyên DB cho action `db: 'platform'` (TIP-045b) — cài khi có PlatformDb. */
  operations?: PlatformOperations;
  /** Tạo approval_request cho nguồn agent / task (TIP-021). Chưa có → NOT_IMPLEMENTED. */
  approvals?: ApprovalGateway;
  /** Khoá mã hoá hiệu ứng bền của action vòng đời (thư OTP xoá — TIP-041). */
  encKey?: Buffer;
}

export interface ApprovalGateway {
  /** Tạo `approval_request` (pending) → id. Handler domain có `preview` thì gateway dùng làm tiêu đề / tóm tắt. */
  request(ctx: ActionContext, def: ActionDef, input: unknown): Promise<string>;
  /**
   * Trong transaction của action (`ctx.approvalId`): duyệt phải `approved`, cùng action + input, chưa chạy → đánh dấu đã chạy.
   * Sai → ném lỗi (transaction huỷ) — action đã duyệt chạy đúng một lần dù job chạy lại.
   */
  consume(tx: TenantTx, ctx: ActionContext, actionId: string, input: unknown, inputHash?: string): Promise<void>;
  /** Lưu kết quả chuẩn của action đã duyệt cùng transaction tiêu thụ (thao tác nền tảng — TIP-045b). */
  record?(tx: TenantTx, ctx: ActionContext, output: unknown): Promise<void>;
}

/** Zod issue → `fields` (path → mã lỗi), client dịch bằng i18n (response-envelope §3). */
export function zodFields(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) out[i.path.join('.') || '_'] ??= i.code;
  return out;
}

export { redactDeep } from './executor-redact';
const json = toLogJson;

/** Cổng tool cho Trợ lý / agent: chạy action + biết action nào có handler thật. Thiếu `isImplemented` → coi như chưa (fail closed). */
export type ToolExecutor = Pick<ActionExecutor, 'execute'> & Partial<Pick<ActionExecutor, 'isImplemented'>>;

/** Action có handler thật theo executor; không biết → false. */
export const implementedBy = (e: ToolExecutor) => (actionId: string) => e.isImplemented?.(actionId) ?? false;

export class ActionExecutor {
  private readonly defs: Map<string, ActionDef>;
  private binding: ExecutionBindingPort | undefined;

  constructor(private readonly d: ExecutorDeps) {
    this.defs = new Map(d.registry.map((a) => [a.id, a]));
  }

  /** Gắn gateway duyệt lúc boot (domain `ai` — TIP-021 cài; kernel không phụ thuộc domain). */
  setApprovals(g: ApprovalGateway): void {
    this.d.approvals = g;
  }

  /** Gắn port ràng buộc bước kế hoạch lúc boot (TIP-023d §2.3 — domain `ai` cài; kernel không import AI). */
  setExecutionBinding(p: ExecutionBindingPort): void {
    this.binding = p;
  }

  /** Cổng duyệt đã gắn (thao tác nền tảng tiêu thụ duyệt ở pha tenant — TIP-045b). */
  approvalGateway(): ApprovalGateway | undefined {
    return this.d.approvals;
  }

  /** Action có handler thật — danh mục Trợ lý / tool agent lọc theo đây (TIP-023b R1.2). */
  isImplemented(actionId: string): boolean {
    return this.d.handlers.isImplemented(actionId);
  }

  /** Action quản trị nền tảng (TIP-040, DC-368): ngữ cảnh không workspace — kernel/actions/platform-execution.ts. */
  executePlatform<O = unknown>(ctx: PlatformContext, actionId: string, rawInput: unknown): Promise<PlatformExecuteOutcome<O>> {
    const def = this.defs.get(actionId);
    if (!def) throw new AppError('ACTION_NOT_FOUND', 404, undefined, actionId);
    if (!this.d.platform) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'PlatformDb chưa cấu hình');
    return executePlatformAction<O>({ platform: this.d.platform, authorizer: this.d.authorizer, confirm: this.d.confirm, clock: this.d.clock, zodFields }, def, this.d.handlers.get(actionId), ctx, rawInput);
  }

  /** Action vòng đời workspace (TIP-041): chỉ membership nền tảng, không mở DB tenant — kernel/actions/workspace-lifecycle-context.ts. */
  executeLifecycle<O = unknown>(ctx: LifecycleContext, actionId: string, rawInput: unknown) {
    const def = this.defs.get(actionId);
    if (!def) throw new AppError('ACTION_NOT_FOUND', 404, undefined, actionId);
    if (!this.d.platform) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'PlatformDb chưa cấu hình');
    return executeLifecycleAction<O>({ platform: this.d.platform, clock: this.d.clock, zodFields, ...(this.d.encKey ? { encKey: this.d.encKey } : {}) }, def, this.d.handlers.get(actionId), ctx, rawInput);
  }

  previewPlatform(ctx: PlatformContext, actionId: string, rawInput: unknown) {
    const def = this.defs.get(actionId);
    if (!def || !this.d.platform) throw new AppError('ACTION_NOT_FOUND', 404, undefined, actionId);
    return previewPlatformAction({ platform: this.d.platform, authorizer: this.d.authorizer, zodFields }, def, this.d.handlers.get(actionId), ctx, rawInput);
  }

  async execute<O = unknown>(ctx: ActionContext, actionId: string, rawInput: unknown): Promise<ExecuteOutcome<O>> {
    // 1. registry
    const def = this.defs.get(actionId);
    const handler = this.d.handlers.get(actionId);
    if (!def || !handler) throw new AppError('ACTION_NOT_FOUND', 404, undefined, actionId);
    // Action quản trị không chạy trong ngữ cảnh workspace (Owner / vai trò / Trợ lý / agent đều 403) — chỉ qua executePlatform.
    if (def.permission === 'platform_admin') throw new AppError('FORBIDDEN', 403, { permission: 'platform_admin' });
    // Action vòng đời chỉ chạy bằng ngữ cảnh vòng đời (UI, membership nền tảng) — Trợ lý / agent / đường tenant thường đều 403.
    if (LIFECYCLE_ACTIONS.has(actionId)) throw new AppError('FORBIDDEN', 403, { scope: 'lifecycle' });
    // Action riêng (TIP-003c §1.2): chỉ ctx đã niêm phong capability đúng action + workspace + digest input THÔ — trước zod / quyền / policy / preview / prepare / idempotency.
    if (isInternalAction(def)) admitInternal(ctx, actionId, rawInput ?? {});

    // 2. zod
    const parsed = def.input.safeParse(rawInput ?? {});
    if (!parsed.success) throw new AppError('VALIDATION_FAILED', 422, zodFields(parsed.error));
    const input = parsed.data as unknown;

    // 3. permission (scope: handler kiểm qua ctx.authz → SCOPE_FORBIDDEN)
    if (!(await this.d.authorizer.can(ctx, def.permission))) throw new AppError('FORBIDDEN', 403, { permission: def.permission });

    // 4. policy
    // Mọi hội thoại mà input chạm tới (nguồn + đích của chuyển tiếp) phải là hội thoại đang phục vụ.
    const io = input as { conversation_id?: unknown; target_conversation_id?: unknown };
    const served = !!ctx.servedConversationId && io.conversation_id === ctx.servedConversationId && (io.target_conversation_id === undefined || io.target_conversation_id === ctx.servedConversationId);
    const decision = withRequiredApproval(decidePolicy({ source: ctx.source, risk: def.risk, bulk: def.bulk, servedConversation: served, autoSend: ctx.autoSend === true, actionId }), def, ctx.source);
    if (decision === 'forbidden') throw new AppError('FORBIDDEN', 403, { source: ctx.source });
    if (ctx.approvalId && !this.d.approvals) throw new AppError('NOT_IMPLEMENTED', 501, { tip: '021' }, 'approval_request chưa cài');
    if (decision === 'approval' && !ctx.approvalId) {
      if (!this.d.approvals) throw new AppError('NOT_IMPLEMENTED', 501, { tip: '021' }, 'approval_request chưa cài');
      return { status: 202, data: { status: 'approval_required', approval_id: await this.d.approvals.request(ctx, def, input) } };
    }

    const db = await this.d.resolver.get(TenantContexts.system(ctx.workspaceId, `action:${actionId}`));

    // 5. idempotency — tra trước cổng xem trước: khoá đã có kết quả (đã xác nhận + commit) thì gửi lại trả đúng kết quả / handle 202, không
    // bắt xem trước lần nữa (TIP-032b, DC-337). Hash gồm actor + input → khoá của người / input khác vẫn 409.
    const key = ctx.idempotencyKey;
    const route = `action:${actionId}`;
    // Hash idempotency không chứa bí mật thô (hash mật khẩu ngắn dò ngược được) — ô bí mật che trước (TIP-023c hợp đồng 3).
    const reqHash = hashInput({ actionId, input: maskSecrets(def, input), actor: ctx.actor });
    if (key && def.db === 'platform' && this.d.operations) {
      const again = await this.d.operations.replay<O>(ctx, def, handler, reqHash, key);
      if (again) return again;
    }
    if (key) {
      const prev = await db.idempotencyKey.findUnique({ where: { key } });
      if (prev) {
        if (prev.route !== route || prev.requestHash !== reqHash) throw new AppError('CONFLICT', 409, { idempotency_key: 'mismatch' });
        const queued = replayAccepted(prev.statusCode, prev.response);
        if (queued) return { status: 202, data: queued };
        if (prev.response) return { status: 200, data: prev.response as unknown as ActionResult<O> };
        throw new AppError('CONFLICT', 409, { idempotency_key: 'in_progress' });
      }
    }

    if (decision === 'preview' && !(await this.d.confirm.consume(ctx, actionId, input, ctx.confirmToken))) {
      // Handler chưa có preview → bản tối thiểu từ ActionDef (DC-128): vẫn bắt xác nhận, thẻ hiện action + input.
      const preview = handler.preview ? await db.$transaction((tx) => handler.preview!(ctx, input, tx)) : { summary: '', risk: def.risk };
      const { token, expiresAt } = await this.d.confirm.issue(ctx, actionId, input, this.d.clock.now().getTime());
      return { status: 202, data: { status: 'preview_required', preview, confirm_token: token, expires_at: expiresAt.toISOString() } };
    }

    if (!key && requiresIdempotencyKey(actionId, def.risk)) throw new AppError('VALIDATION_FAILED', 422, { idempotency_key: 'required' });

    // 6. transaction: handler + action_log + outbox (+ lưu kết quả idempotency)
    const now = this.d.clock.now();
    const traceId = RequestContext.get()?.traceId;
    const logId = uuidv7(now.getTime());
    const undoWindow = def.undo && handler.undo ? new Date(now.getTime() + def.undo.windowSec * 1000) : undefined;
    const prepared = handler.prepare ? await handler.prepare(ctx, input) : undefined;
    // Action `db: 'platform'` (TIP-045b annex A1): sổ thao tác xuyên DB — nền tảng commit trước, tenant áp sau với biên nhận, khôi phục
    // theo pha; không còn transaction tenant lồng trong transaction nền tảng. Idempotency theo sổ (workspace + actor + khoá).
    if (def.db === 'platform') {
      if (ctx.planBinding) throw new AppError('CONFLICT', 409, { plan_step: 'unsupported_action' });
      if (!this.d.operations) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'PlatformDb chưa cấu hình');
      let after: (() => Promise<void>) | undefined;
      const r = await this.d.operations.run<O>(ctx, def, handler, input, prepared, {
        inputHash: reqHash,
        logInput: redactDeep(maskSecrets(def, json(input))),
        idempotencyKey: key,
        undoUntil: def.undo && (handler.undo || handler.undoPlatform) ? new Date(now.getTime() + def.undo.windowSec * 1000) : undefined,
        afterCommit: (fn) => (after = fn),
      });
      if (after) await after().catch(() => undefined);
      return r;
    }
    const approved = (tx: TenantTx) => (ctx.approvalId ? this.d.approvals!.consume(tx, ctx, actionId, input) : Promise.resolve());
    const runFinal = async (tx: TenantTx) => {
      // Action riêng (TIP-003c §1.3, §3.3): kiểm lại capability ngay trước hiệu ứng + nhận biên nhận trigger trong CÙNG transaction.
      const sys = isInternalAction(def) ? await systemAdmission(tx, ctx, actionId, rawInput ?? {}, now) : undefined;
      if (sys?.replay) return { data: sys.replay, queued: null, afterCommit: undefined };
      // Bước kế hoạch (TIP-023d §2.2-2.3): claim hiệu ứng chính TRƯỚC handler — cùng digest đã xong → biên nhận cũ, không chạy lại.
      if (ctx.planBinding && !this.binding) throw new AppError('NOT_IMPLEMENTED', 501, { tip: '023d' }, 'execution binding chưa cài');
      const bound = ctx.planBinding ? await this.binding!.admit(tx, ctx, actionId, hashInput(input), now) : undefined;
      if (bound?.replay) return { data: bound.replay.data, queued: bound.replay.queued ?? null, afterCommit: undefined };
      await approved(tx);
      const r = await handler.execute(ctx, input, tx, undefined, prepared);
      const undoUntil = r.noUndo ? undefined : undoWindow;
      // Quyền theo trường (TIP-045b annex C): output không mang key tuỳ biến / trường hệ thống người gọi không được xem.
      const output = await projectActionOutput(tx, actionId, ctx.authz, def.output.parse(r.result) as O);
      const ui = def.uiTarget?.(output as never);
      const data: ActionResult<O> = {
        result: output,
        action_log_id: logId,
        ...(undoUntil ? { undo_until: undoUntil.toISOString() } : {}),
        ...(ui ? { ui_target: ui } : {}),
      };
      await tx.actionLog.create({
        data: {
          id: logId,
          actionId,
          risk: def.risk,
          source: ctx.source,
          actorType: ctx.actor.type,
          actorId: ctx.actor.id,
          onBehalfOfUserId: ctx.onBehalfOfUserId ?? null,
          runId: ctx.runId ?? null,
          // Ô bí mật theo ActionDef / manifest connector (DC-227) che trước, rồi khoá PII chung (ops §1.4).
          input: redactDeep(maskSecrets(def, json(input))) as object,
          before: json(r.before),
          after: json(r.after),
          result: json(output),
          status: 'succeeded',
          undoUntil: undoUntil ?? null,
          traceId: traceId ?? null,
          audit: isSecurityAction(actionId),
          createdAt: now,
        },
      });
      if (sys) await sys.settle(tx, output, logId);
      if (bound) await bound.settle(tx, logId, r.accepted);
      const sec = securityEvents(actionId, logId, ctx.actor, ctx.onBehalfOfUserId, ctx.source);
      await writeOutbox(tx, ctx.workspaceId, [...(r.events ?? []), ...sec, ...activityEvent(ctx, def, logId)], now, traceId);
      // Việc nền (202 job_accepted): lưu đúng handle vào idempotency (mã 202) — gửi lại cùng khoá không xếp việc lần hai.
      const queued = r.accepted ? acceptedResponse(logId, r.accepted) : null;
      if (key) await tx.idempotencyKey.create({ data: { key, route, requestHash: reqHash, response: json(queued ?? data), statusCode: queued ? 202 : 200, createdAt: now } });
      return { data, queued, afterCommit: r.afterCommit };
    };
    // TIP-003b: collector gắn transaction cuối — writeOutbox (handler + executor) chỉ gom; flush DUY NHẤT sau idempotency, trước commit.
    const out = await db.$transaction(async (tx) => {
      const ev = enroll(tx, ctx.workspaceId);
      try {
        const o = await runFinal(tx);
        return { ...o, events: await ev.finish() };
      } catch (err) {
        ev.abort();
        throw err;
      }
    });
    if (out.events) await markDirty(this.d.kv, ctx.workspaceId);
    // Đã commit: lỗi ở đây không đổi kết quả (việc tự idempotent + có scheduler quét lại — HandlerOutcome.afterCommit).
    if (out.afterCommit) await out.afterCommit().catch(() => undefined);

    // 7. kết quả
    return out.queued ? { status: 202, data: out.queued } : { status: 200, data: out.data };
  }
}
