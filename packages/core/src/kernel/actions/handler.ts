// Hợp đồng handler + decorator đăng ký (Blueprint §3.2). Handler là provider Nest; ActionHandlerRegistry gom lúc boot.
import 'reflect-metadata';
import type { ActionPreview } from '@appchat/actions';
import type { ActionContext, PlatformTx, TenantTx } from './action-context';

export interface ActionLogRow {
  id: string;
  actionId: string;
  input: unknown;
  before: unknown;
  after: unknown;
  result: unknown;
  undoUntil: Date | null;
}

/** Kết quả handler: `before` / `after` cho action_log + undo; `events` ghi outbox cùng transaction. */
export interface HandlerOutcome<O> {
  result: O;
  before?: unknown;
  after?: unknown;
  events?: { topic: string; payload: Record<string, unknown> }[];
  /** Lần chạy này không có gì để hoàn tác (no-op — vd. người nhận đã là người phụ trách, TIP-015d): không ghi `undo_until`. */
  noUndo?: boolean;
  /**
   * Việc chạy SAU khi transaction (nền tảng + tenant) commit — cho bước cần transaction riêng của service khác (vd. kích hoạt gói
   * sau khi admin xác nhận chuyển khoản — TIP-010). Lỗi không làm hỏng kết quả action đã commit; việc phải tự idempotent + có
   * đường quét lại (scheduler).
   */
  afterCommit?: () => Promise<void>;
  /**
   * Việc nền đã ghi bền (bản ghi job + outbox cùng transaction) — executor trả 202 `job_accepted` thay 200 (TIP-032b, job-accepted.ts).
   * `result` vẫn qua output schema + action_log (yêu cầu đã nhận); trạng thái hoàn tất là của bản ghi job.
   */
  accepted?: { jobId: string; statusUrl: string };
  /**
   * Chỉ action `db: 'platform'` (TIP-045b annex A1): kế hoạch JSON cho pha tenant (`applyTenant`) — lưu ở sổ thao tác nền tảng cùng
   * commit, khôi phục chạy lại đúng pha còn thiếu. Id tài nguyên tenant phải tất định (sinh ở pha nền tảng).
   */
  tenantPlan?: Record<string, unknown>;
  /** Chỉ action `db: 'platform'`: hiệu ứng ngoài (thư…) ghi bền cùng commit nền tảng, gửi sau commit (kernel/consistency/platform-effects). */
  effects?: { kind: string; payload: Record<string, unknown>; ttlMs: number }[];
}

/** Kết quả pha tenant của action nền tảng: kết quả cuối (nếu khác pha nền tảng), after / event ghi cùng action_log. */
export interface TenantApplied<O> {
  result?: O;
  before?: unknown;
  after?: unknown;
  events?: { topic: string; payload: Record<string, unknown> }[];
}

export interface ActionHandler<I = unknown, O = unknown> {
  /**
   * Việc chậm chạy NGOÀI transaction, trước `execute` (vd. gọi LLM — TIP-021 `agent.test` / `draft_from_description`): kết quả
   * truyền vào `execute` qua tham số `prepared`. Không ghi DB ở đây (không có action_log / undo).
   */
  prepare?(ctx: ActionContext, input: I): Promise<unknown>;
  /**
   * `ptx` chỉ có với action `db: 'platform'` — khi đó ghi nghiệp vụ vào ptx; `tx` là bản tenant CHỈ ĐỌC (ghi → lỗi): ghi tenant đi qua
   * `tenantPlan` + `applyTenant` (TIP-045b — không còn transaction tenant lồng trong transaction nền tảng).
   */
  execute(ctx: ActionContext, input: I, tx: TenantTx, ptx?: PlatformTx, prepared?: unknown): Promise<HandlerOutcome<O>>;
  /** Action nền tảng có ghi tenant: áp `tenantPlan` trong transaction tenant (cùng action_log + outbox + biên nhận). Không dựa vào `ctx.authz`. */
  applyTenant?(ctx: ActionContext, plan: Record<string, unknown>, tx: TenantTx): Promise<TenantApplied<O>>;
  /** Action nền tảng: ghi nền tảng SAU khi tenant đã áp (route kênh / widget / ngân hàng) — idempotent, khôi phục chạy lại. */
  finalizePlatform?(ctx: ActionContext, plan: Record<string, unknown>, ptx: PlatformTx, read: TenantTx): Promise<void>;
  preview?(ctx: ActionContext, input: I, tx: TenantTx): Promise<ActionPreview>;
  undo?(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void>;
  /** Hoàn tác action nền tảng = thao tác MỚI có điều kiện (kernel/consistency/undo-operation) — ghi ptx, event ghi outbox tenant. */
  undoPlatform?(ctx: ActionContext, log: ActionLogRow, ptx: PlatformTx): Promise<{ events?: { topic: string; payload: Record<string, unknown> }[] }>;
}

const ACTION_ID = Symbol('appchat.action-id');

/** `@ActionHandler('quote.send')` trên class provider. */
export function ActionHandler(actionId: string): ClassDecorator {
  return (target) => Reflect.defineMetadata(ACTION_ID, actionId, target);
}

export function actionIdOf(target: object): string | undefined {
  return Reflect.getMetadata(ACTION_ID, target) as string | undefined;
}
