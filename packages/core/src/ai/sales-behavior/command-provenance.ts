// Nguồn lệnh NGƯỜI VẬN HÀNH cho quyết định báo giá (TIP-022c §2.2a–2.2b): agent / tác vụ làm thay người (`onBehalfOfUserId` — delegate
// của Trợ lý, Cowork) gọi chốt / từ chối / xin sửa báo giá mà không có căn cứ ý định khách → executor đẩy sang hàng chờ duyệt (customer-
// intent `escalateOperatorDecision`). Chỉ một người thật bấm Duyệt trên ĐÚNG dòng duyệt đó mới thành lệnh người vận hành — không phải
// `initiatedByUserId`, không phải câu "Chủ nhà bảo…" trong task / ngữ cảnh, không phải tin khách dán vào, không phải nhãn ý định của model.
// Dòng duyệt ràng: action + input (hash) + run + người ra lệnh + DẤU BÁO GIÁ lúc xin duyệt (ghi vào preview, server đọc lại). Lúc chạy sau
// duyệt (kể cả sau restart — job `ai-resume` dựng lại từ dòng duyệt): dấu báo giá hiện tại phải khớp; đổi → 409, không tự làm mới đích.
// Duyệt bị từ chối / hết hạn → không chạy (resume); duyệt đã tiêu thụ → 409 (gateway). Lượt kênh (không người ra lệnh) không vào đây.
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { QUOTE_BINDING_KEY, type CustomerIntentAction, type OperatorAdmission } from '../../kernel/actions/customer-intent';

type Preview = { bound?: Record<string, unknown> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Xác minh lời gọi sau duyệt: dòng duyệt `approved` / `edited` (người duyệt xác nhận đúng input đang lưu; sửa sang báo giá khác thì dấu
 * ràng không khớp → 409), người duyệt là người thật, đúng action / run / người ra lệnh / nguồn agent-task, dấu báo giá ràng lúc xin khớp dấu hiện tại (đọc SAU
 * khoá báo giá). Hợp lệ → tiêu thụ = ghi kết quả cuối vào dòng duyệt cùng transaction hiệu ứng (gateway đã chốt `executed_at`).
 */
export async function verifyOperatorApproval(tx: TenantTx, ctx: ActionContext, actionId: CustomerIntentAction, quote: { id: string; fingerprint: string }): Promise<OperatorAdmission> {
  const deny = (reason: string, status: 403 | 409 = 403): OperatorAdmission => ({ ok: false, reason, status });
  if (!ctx.approvalId || !UUID.test(ctx.approvalId) || !ctx.onBehalfOfUserId) return deny('operator_unconfirmed');
  const [a] = await tx.$queryRaw<{ action_id: string; status: string; run_id: string | null; source: string; on_behalf_of_user_id: string | null; decided_by: string | null; preview: Preview | null; input: { quote_id?: unknown } }[]>`
    SELECT action_id, status::text AS status, run_id, source, on_behalf_of_user_id, decided_by, preview, input FROM approval_request WHERE id = ${ctx.approvalId}::uuid FOR UPDATE`;
  if (!a || a.action_id !== actionId || a.input?.quote_id !== quote.id) return deny('operator_mismatch');
  if (a.status !== 'approved' && a.status !== 'edited') return deny('operator_unconfirmed');
  if (!a.decided_by || a.on_behalf_of_user_id !== ctx.onBehalfOfUserId || (a.source !== 'agent' && a.source !== 'task')) return deny('operator_mismatch');
  if (ctx.runId && a.run_id !== ctx.runId) return deny('operator_mismatch');
  const bound = a.preview?.bound?.[QUOTE_BINDING_KEY];
  if (typeof bound !== 'string') return deny('operator_unbound');
  if (bound !== quote.fingerprint) return deny('quote_changed', 409);
  return { ok: true, consume: async () => undefined };
}
