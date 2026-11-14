// Cổng ràng buộc thực thi (TIP-023d §2.3): kernel KHÔNG import domain AI — domain kế hoạch Cowork cài một port nhỏ lúc boot
// (`ActionExecutor.setExecutionBinding`, mirror setApprovals). Khi ctx mang `planBinding` (server đặt, model / HTTP không đặt được):
//   admit  — trong CHÍNH transaction của action, sau quyền / policy / xem trước, TRƯỚC handler: claim hiệu ứng chính của bước
//            (plan_id + stable_step_id + execution_generation) — cùng đích + cùng digest đã xong → phát lại biên nhận cũ (không chạy handler
//            lần hai); khác digest / plan không còn active / sai epoch → 409. Khoá dòng claim lấy trước mọi khoá domain của handler.
//   settle — cùng transaction, sau action_log: gắn biên nhận (action_log) vào claim + attempt + trạng thái bước thật.
// Không có binding → executor chạy y như cũ.
import type { ActionResult } from '@appchat/actions';
import type { ActionContext, TenantTx } from './action-context';
import type { JobAccepted } from './job-accepted';

export interface ExecutionAdmission {
  /**
   * Claim đã có biên nhận cùng digest → biên nhận cũ (không chạy handler, không ghi action_log / outbox lần hai): `data` cho 200, `queued`
   * cho việc nền đã nhận (đúng handle cũ — không xếp việc lần hai).
   */
  replay?: { data: ActionResult<never>; queued?: JobAccepted };
  /** Gọi sau action_log (bỏ qua khi `replay`). `accepted`: 202 job_accepted — đã nhận, CHƯA xong (§2.4: accepted ≠ succeeded). */
  settle(tx: TenantTx, actionLogId: string, accepted?: { jobId: string; statusUrl: string }): Promise<void>;
}

export interface ExecutionBindingPort {
  admit(tx: TenantTx, ctx: ActionContext, actionId: string, inputDigest: string, now: Date): Promise<ExecutionAdmission>;
}
