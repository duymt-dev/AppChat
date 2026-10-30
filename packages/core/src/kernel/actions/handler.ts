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
  /**
   * Việc chạy SAU khi transaction (nền tảng + tenant) commit — cho bước cần transaction riêng của service khác (vd. kích hoạt gói
   * sau khi admin xác nhận chuyển khoản — TIP-010). Lỗi không làm hỏng kết quả action đã commit; việc phải tự idempotent + có
   * đường quét lại (scheduler).
   */
  afterCommit?: () => Promise<void>;
}

export interface ActionHandler<I = unknown, O = unknown> {
  /** `ptx` chỉ có với action `db: 'platform'` — khi đó ghi nghiệp vụ vào ptx; `tx` (tenant) chỉ để đọc nếu cần. */
  execute(ctx: ActionContext, input: I, tx: TenantTx, ptx?: PlatformTx): Promise<HandlerOutcome<O>>;
  preview?(ctx: ActionContext, input: I, tx: TenantTx): Promise<ActionPreview>;
  undo?(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void>;
}

const ACTION_ID = Symbol('appchat.action-id');

/** `@ActionHandler('quote.send')` trên class provider. */
export function ActionHandler(actionId: string): ClassDecorator {
  return (target) => Reflect.defineMetadata(ACTION_ID, actionId, target);
}

export function actionIdOf(target: object): string | undefined {
  return Reflect.getMetadata(ACTION_ID, target) as string | undefined;
}
