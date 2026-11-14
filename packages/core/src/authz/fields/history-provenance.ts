// Lược bỏ câu hỏi tự do của "tool mang dữ liệu nhạy" trong lịch sử / replay (TIP-023e §3.5): `find_actions` nhận câu hỏi tự do của
// người dùng (có thể chứa tên khách, SĐT, nội dung riêng tư) — câu RAW không bao giờ nằm lại trong `ai_run_step` (vết ai:live, GenUI,
// run-detail, SSE đều chỉ đọc từ đây — một điểm che DUY NHẤT ở `RunStore.step()` thì mọi nơi đọc lại tự động an toàn, không cần sửa
// từng nơi đọc). `ai_run.state` (trạng thái chờ tiếp tục, cột riêng cho resume) KHÔNG đi qua đây — che ở đây không ảnh hưởng khả năng
// chạy tiếp đúng của run đang tạm dừng (resume đọc `state`, không đọc lại từ `ai_run_step`).
import { REDACT_CENSOR } from '@appchat/shared';

/** Tool/action mang câu hỏi tự do của người dùng trong input — đăng ký tường minh ở đây, không tự suy luận theo tên/mô tả. */
export const SENSITIVE_QUERY_TOOLS: ReadonlySet<string> = new Set(['find_actions']);
/** TIP-021b: action gọi qua `call_action` mang văn bản tự do của người dùng (mô tả agent có thể chứa dữ liệu khách) → che ô đó trong bước. */
export const SENSITIVE_ACTION_FIELDS: ReadonlyMap<string, readonly string[]> = new Map([['agent.draft_from_description', ['description']]]);

const get = (o: unknown, k: string): unknown =>
  o && typeof o === 'object' && !Array.isArray(o) && Object.prototype.hasOwnProperty.call(o, k) ? (o as Record<string, unknown>)[k] : undefined;

/**
 * Input của tool nhạy trước khi ghi bước run: bỏ câu hỏi tự do (`query`), giữ metadata an toàn không phải văn bản tự do (vd. `module`
 * — tên module cố định trong registry, không phải nội dung khách). Action không trong danh sách → giữ nguyên (không đụng tool khác).
 */
export function redactSensitiveQueryInput(actionId: string | null, input: unknown): unknown {
  if (actionId === 'call_action') return redactCallAction(input);
  if (!actionId || !SENSITIVE_QUERY_TOOLS.has(actionId) || !input || typeof input !== 'object' || Array.isArray(input)) return input;
  const module = get(input, 'module');
  return { query: REDACT_CENSOR, ...(typeof module === 'string' ? { module } : {}) };
}

function redactCallAction(input: unknown): unknown {
  const id = get(input, 'action_id');
  const fields = typeof id === 'string' ? SENSITIVE_ACTION_FIELDS.get(id) : undefined;
  const inner = get(input, 'input');
  if (!fields || !inner || typeof inner !== 'object' || Array.isArray(inner)) return input;
  const masked = { ...(inner as Record<string, unknown>) };
  for (const f of fields) if (Object.prototype.hasOwnProperty.call(masked, f)) masked[f] = REDACT_CENSOR;
  return { ...(input as Record<string, unknown>), input: masked };
}
