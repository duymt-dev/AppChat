// Lệnh UI của Trợ lý qua realtime (TIP-006c, Blueprint §4.6 `ui.command` — "chỉ gửi user ra lệnh"): tool `ui` hợp lệ → outbox
// `ui.command_issued` mang tab của người ra lệnh (`tab_id` client gửi kèm lượt, server lưu trong `ai_run.input`) → luật realtime
// (`events/ui-command.rules.ts`) gửi tới phòng `tab:{user}:{tab}` (gateway chỉ cho socket vào phòng mang userId của chính JWT). Không có tab (lượt cũ / test / Trợ lý của
// tác vụ nền) → không phát — lệnh vẫn đi trong sự kiện lượt (`ui_command`) như cũ. Tab khác / người khác không nhận.
import type { UiCommandDto } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';
import { inEventTransaction } from '../../kernel/outbox/transaction';
import { markDirty, writeOutbox } from '../../kernel/outbox/outbox';
import type { KeyValueStore } from '../../kernel/redis';
import { TAB_ID } from '../../notify/realtime/envelope';
import type { AssistantTurnCtx } from './types';

export const UI_COMMAND_TOPIC = 'ui.command_issued';

/** Mã tab hợp lệ hoặc undefined (client cũ không gửi / gửi sai dạng → bỏ qua, không lỗi lượt). */
export const tabIdOf = (raw: unknown): string | undefined => (typeof raw === 'string' && TAB_ID.test(raw) ? raw : undefined);

/** Ngữ cảnh lượt dựng lại từ `ai_run.input` (chạy tiếp / xác nhận) mang tab đã lưu. */
export const tabCtx = (input: { tab_id?: unknown }): { tabId?: string } => {
  const tab = tabIdOf(input.tab_id);
  return tab ? { tabId: tab } : {};
};

export interface UiCommandSink {
  db: Pick<TenantDb, '$transaction'>;
  kv?: Pick<KeyValueStore, 'sadd'> | null;
  now: () => Date;
}

/** Ghi outbox lệnh UI cho tab người ra lệnh (transaction riêng, sau khi tool đã kiểm schema). Không có tab → không ghi. */
export async function issueUiCommand(d: UiCommandSink, t: Pick<AssistantTurnCtx, 'ws' | 'runId' | 'userId' | 'tabId'>, command: UiCommandDto): Promise<boolean> {
  if (!t.tabId) return false;
  const now = d.now();
  await inEventTransaction(d.db as TenantDb, t.ws, (tx: TenantTx) => writeOutbox(tx, t.ws, [{ topic: UI_COMMAND_TOPIC, payload: { run_id: t.runId, user_id: t.userId, tab_id: t.tabId, command } }], now));
  if (d.kv) await markDirty(d.kv as KeyValueStore, t.ws).catch(() => undefined);
  return true;
}
