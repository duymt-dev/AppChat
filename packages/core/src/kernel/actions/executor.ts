// ActionExecutor — cổng ghi duy nhất (action-registry §5). Thứ tự không đổi:
// registry → zod → permission → policy → idempotency → transaction (handler + action_log + outbox) → kết quả.
import type { ActionAccepted, ActionDef, ActionResult } from '@appchat/actions';
import { AppError, REDACT_CENSOR, REDACT_KEYS } from '@appchat/shared';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import type { ZodError } from 'zod';
import type { Clock } from '../clock';
import { uuidv7 } from '../ids';
import { RequestContext } from '../request-context';
import { markDirty, writeOutbox } from '../outbox/outbox';
import type { KeyValueStore } from '../redis';
import type { ActionContext, Authorizer, TenantTx } from './action-context';
import type { ConfirmTokens } from './confirm-token';
import { hashInput } from './confirm-token';
import type { ActionHandlerRegistry } from './handler-registry';
import { decidePolicy, requiresIdempotencyKey } from './policy';

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
  /** Tạo approval_request cho nguồn agent / task (TIP-021). Chưa có → NOT_IMPLEMENTED. */
  approvals?: ApprovalGateway;
}

export interface ApprovalGateway {
  /** Tạo `approval_request` (pending) → id. Handler domain có `preview` thì gateway dùng làm tiêu đề / tóm tắt. */
  request(ctx: ActionContext, def: ActionDef, input: unknown): Promise<string>;
  /**
   * Trong transaction của action (`ctx.approvalId`): duyệt phải `approved`, cùng action + input, chưa chạy → đánh dấu đã chạy.
   * Sai → ném lỗi (transaction huỷ) — action đã duyệt chạy đúng một lần dù job chạy lại.
   */
  consume(tx: TenantTx, ctx: ActionContext, actionId: string, input: unknown): Promise<void>;
}

/** Zod issue → `fields` (path → mã lỗi), client dịch bằng i18n (response-envelope §3). */
export function zodFields(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) out[i.path.join('.') || '_'] ??= i.code;
  return out;
}

const SECRET = new Set<string>(REDACT_KEYS);
/** Che PII trong input trước khi ghi action_log (ops §1.4, §4). */
export function redactDeep(v: unknown, depth = 0): unknown {
  if (depth > 6 || v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map((x) => redactDeep(x, depth + 1));
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, SECRET.has(k) ? REDACT_CENSOR : redactDeep(x, depth + 1)]));
}

const json = (v: unknown) => (v === undefined ? undefined : (JSON.parse(JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? x.toString() : x))) as object));

/** Cổng tool cho Trợ lý / agent: chạy action + biết action nào có handler thật. Thiếu `isImplemented` → coi như chưa (fail closed). */
export type ToolExecutor = Pick<ActionExecutor, 'execute'> & Partial<Pick<ActionExecutor, 'isImplemented'>>;

/** Action có handler thật theo executor; không biết → false. */
export const implementedBy = (e: ToolExecutor) => (actionId: string) => e.isImplemented?.(actionId) ?? false;

export class ActionExecutor {
  private readonly defs: Map<string, ActionDef>;

  constructor(private readonly d: ExecutorDeps) {
    this.defs = new Map(d.registry.map((a) => [a.id, a]));
  }

  /** Gắn gateway duyệt lúc boot (domain `ai` — TIP-021 cài; kernel không phụ thuộc domain). */
  setApprovals(g: ApprovalGateway): void {
    this.d.approvals = g;
  }

  /** Action có handler thật — danh mục Trợ lý / tool agent lọc theo đây (TIP-023b R1.2). */
  isImplemented(actionId: string): boolean {
    return this.d.handlers.isImplemented(actionId);
  }

  async execute<O = unknown>(ctx: ActionContext, actionId: string, rawInput: unknown): Promise<ExecuteOutcome<O>> {
    // 1. registry
    const def = this.defs.get(actionId);
    const handler = this.d.handlers.get(actionId);
    if (!def || !handler) throw new AppError('ACTION_NOT_FOUND', 404, undefined, actionId);

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
    const decision = decidePolicy({ source: ctx.source, risk: def.risk, bulk: def.bulk, servedConversation: served, autoSend: ctx.autoSend === true });
    if (decision === 'forbidden') throw new AppError('FORBIDDEN', 403, { source: ctx.source });
    if (ctx.approvalId && !this.d.approvals) throw new AppError('NOT_IMPLEMENTED', 501, { tip: '021' }, 'approval_request chưa cài');
    if (decision === 'approval' && !ctx.approvalId) {
      if (!this.d.approvals) throw new AppError('NOT_IMPLEMENTED', 501, { tip: '021' }, 'approval_request chưa cài');
      return { status: 202, data: { status: 'approval_required', approval_id: await this.d.approvals.request(ctx, def, input) } };
    }

    const db = await this.d.resolver.get(TenantContexts.system(ctx.workspaceId, `action:${actionId}`));
    if (decision === 'preview' && !(await this.d.confirm.consume(ctx, actionId, input, ctx.confirmToken))) {
      // Handler chưa có preview → bản tối thiểu từ ActionDef (DC-128): vẫn bắt xác nhận, thẻ hiện action + input.
      const preview = handler.preview ? await db.$transaction((tx) => handler.preview!(ctx, input, tx)) : { summary: '', risk: def.risk };
      const { token, expiresAt } = await this.d.confirm.issue(ctx, actionId, input, this.d.clock.now().getTime());
      return { status: 202, data: { status: 'preview_required', preview, confirm_token: token, expires_at: expiresAt.toISOString() } };
    }

    // 5. idempotency
    const key = ctx.idempotencyKey;
    if (!key && requiresIdempotencyKey(actionId, def.risk)) throw new AppError('VALIDATION_FAILED', 422, { idempotency_key: 'required' });
    const route = `action:${actionId}`;
    const reqHash = hashInput({ actionId, input, actor: ctx.actor });
    if (key) {
      const prev = await db.idempotencyKey.findUnique({ where: { key } });
      if (prev) {
        if (prev.route !== route || prev.requestHash !== reqHash) throw new AppError('CONFLICT', 409, { idempotency_key: 'mismatch' });
        if (prev.response) return { status: 200, data: prev.response as unknown as ActionResult<O> };
        throw new AppError('CONFLICT', 409, { idempotency_key: 'in_progress' });
      }
    }

    // 6. transaction: handler + action_log + outbox (+ lưu kết quả idempotency)
    const now = this.d.clock.now();
    const traceId = RequestContext.get()?.traceId;
    const logId = uuidv7(now.getTime());
    const undoUntil = def.undo && handler.undo ? new Date(now.getTime() + def.undo.windowSec * 1000) : undefined;
    // Action `db: 'platform'`: nghiệp vụ commit trên DB nền tảng TRƯỚC, rồi log / outbox / idempotency ở DB tenant
    // (không có transaction chung hai DB — Blueprint §2.0 "nền tảng trước"). Handler nền tảng phải idempotent theo input.
    const prepared = handler.prepare ? await handler.prepare(ctx, input) : undefined;
    const approved = (tx: TenantTx) => (ctx.approvalId ? this.d.approvals!.consume(tx, ctx, actionId, input) : Promise.resolve());
    let platformOutcome: Awaited<ReturnType<typeof handler.execute>> | undefined;
    if (def.db === 'platform') {
      if (!this.d.platform) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'PlatformDb chưa cấu hình');
      platformOutcome = await this.d.platform.$transaction((ptx) => db.$transaction(async (tx) => {
          await approved(tx);
          return handler.execute(ctx, input, tx, ptx, prepared);
        }),
      );
    }
    const out = await db.$transaction(async (tx) => {
      if (!platformOutcome) await approved(tx);
      const r = platformOutcome ?? (await handler.execute(ctx, input, tx, undefined, prepared));
      const output = def.output.parse(r.result) as O;
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
          input: redactDeep(json(input)) as object,
          before: json(r.before),
          after: json(r.after),
          result: json(output),
          status: 'succeeded',
          undoUntil: undoUntil ?? null,
          traceId: traceId ?? null,
          createdAt: now,
        },
      });
      const events = await writeOutbox(tx, ctx.workspaceId, r.events ?? [], now, traceId);
      if (key) await tx.idempotencyKey.create({ data: { key, route, requestHash: reqHash, response: json(data), statusCode: 200, createdAt: now } });
      return { data, events, afterCommit: r.afterCommit };
    });
    if (out.events) await markDirty(this.d.kv, ctx.workspaceId);
    // Đã commit: lỗi ở đây không đổi kết quả (việc tự idempotent + có scheduler quét lại — HandlerOutcome.afterCommit).
    if (out.afterCommit) await out.afterCommit().catch(() => undefined);

    // 7. kết quả
    return { status: 200, data: out.data };
  }
}
