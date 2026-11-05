// Kết quả executor → ToolOutcome cho model (TIP-023b R1, SPEC B.4): một hàm dùng chung cho Trợ lý (`call_action`) và tool action của agent /
// task (`runs/tools.ts`). Phân nhánh 202 EXHAUSTIVE theo `status` — loại 202 mới (032b `job_accepted`) phải thêm nhánh, không rơi vào
// "approval" mặc định (approvalId undefined). Kết quả đọc đưa cho model được cắt ≤ 20 dòng mỗi mảng và bỏ ô bí mật theo tên (token,
// secret, password, credentials, prompt…) — action đọc vốn không trả, đây là lưới an toàn cuối trước model.
import type { ActionAccepted } from '@appchat/actions';
import type { ToolOutcome } from '@appchat/ai';
import type { ExecuteOutcome } from '../../kernel/actions/executor';

export const READ_MAX_ROWS = 20;
const SECRET = /(token|secret|password|passwd|credential|api_?key|cookie|imei|session_key|private|system_prompt|^prompt$|persona)/i;

/** Bỏ ô bí mật + cắt mảng ≤ `maxRows` (độ sâu ≤ 6) — giữ nguyên kiểu nguyên thuỷ. */
export function safeForModel(v: unknown, maxRows = READ_MAX_ROWS, depth = 0): unknown {
  if (depth > 6 || v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.slice(0, maxRows).map((x) => safeForModel(x, maxRows, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) if (!SECRET.test(k)) out[k] = safeForModel(x, maxRows, depth + 1);
  return out;
}

const never = (x: never): never => {
  throw new Error(`202 chưa xử lý: ${JSON.stringify(x)}`);
};

/** 202 → outcome dừng run (thẻ xác nhận / chờ duyệt). */
export function acceptedOutcome(a: ActionAccepted, canonicalInput: unknown): ToolOutcome {
  switch (a.status) {
    case 'preview_required':
      return { kind: 'needs_confirmation', preview: a.preview, confirmToken: a.confirm_token, canonicalInput };
    case 'approval_required':
      return { kind: 'needs_approval', approvalId: a.approval_id };
    case 'job_accepted':
      return { kind: 'job_accepted', jobId: a.job_id, actionLogId: a.action_log_id, statusUrl: a.status_url };
    case 'operation_pending':
      return { kind: 'operation_pending', operationId: a.operation_id, actionLogId: a.action_log_id, statusUrl: a.status_url };
    default:
      return never(a);
  }
}

/** 200 → `ok` (đã lọc cho model); 202 → acceptedOutcome. */
export function dispatchOutcome(out: ExecuteOutcome, canonicalInput: unknown): ToolOutcome {
  return out.status === 200 ? { kind: 'ok', output: safeForModel(out.data.result) } : acceptedOutcome(out.data, canonicalInput);
}
