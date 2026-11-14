// Móc Executor cho action riêng (TIP-003c §3.3): trong transaction đã đăng ký của action — kiểm lại capability (cổng sớm không phải giấy
// phép vĩnh viễn), nhận biên nhận trigger; đã kết thúc → phát lại kết quả cũ (không chạy handler, không ghi action_log / outbox lần hai).
import type { ActionResult } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../action-context';
import { admitInternal } from './capability';
import { admitReceipt, settleReceipt } from './receipt';

export interface SystemAdmission {
  replay?: ActionResult<never>;
  settle(tx: TenantTx, output: unknown, actionLogId: string): Promise<void>;
}

export async function systemAdmission(tx: TenantTx, ctx: ActionContext, actionId: string, rawInput: unknown, now: Date): Promise<SystemAdmission> {
  const cap = admitInternal(ctx, actionId, rawInput);
  if (cap.receipt === 'domain') return { settle: async () => undefined };
  const r = await admitReceipt(tx, cap, now);
  return {
    ...(r.replay ? { replay: { result: r.replay.result as never, action_log_id: r.replay.actionLogId } } : {}),
    settle: (t, output, logId) => settleReceipt(t, r.id, output, logId, now),
  };
}
