// Thẻ duyệt trong Hộp thư (TIP-025b §G.1): yêu cầu duyệt GẮN với một hội thoại qua quan hệ tin cậy `approval_request.run_id →
// ai_run.conversation_id` (run do server tạo khi agent / Trợ lý chạy trong hội thoại) — không dò chữ trong JSON input. Hội thoại ngoài
// scope inbox hiện hành → 404 (visibleConversation); trong scope nhưng không có quyền thấy hàng duyệt (`approvals.decide`) → danh sách
// rỗng nhất quán (không lộ input / số lượng). Dòng dùng lại `listApprovals`-shape (can_decide = approvals.decide ∩ quyền duyệt của action
// gốc). Truy vấn: run của hội thoại theo `ai_run_conversation_idx` → approval theo `approval_request_run_idx`, ≤ 50 mới nhất.
import { can, type ApprovalRowDto, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { visibleConversation } from '../services/access';
import { approvalRows } from '../../ai/approvals/approvals.read';
import { visibleApprovalSql } from '../../ai/approvals/domain-authorization';

export const CONVERSATION_APPROVALS_MAX = 50;
const RUNS_MAX = 500;

export async function conversationApprovals(tx: TenantTx, authz: AuthzContext, conversationId: string, now: Date, timeZone: string): Promise<{ items: ApprovalRowDto[]; pending: number }> {
  const c = await visibleConversation(tx, authz, conversationId);
  if (!can(authz, 'approvals.decide')) return { items: [], pending: 0 };
  const runs = await tx.aiRun.findMany({ where: { conversationId: c.id }, orderBy: { startedAt: 'desc' }, take: RUNS_MAX, select: { id: true } });
  if (!runs.length) return { items: [], pending: 0 };
  // TIP-015d: cùng vị từ thấy được theo domain với màn Cần duyệt, áp trước LIMIT.
  const ids = await tx.$queryRaw<{ id: string }[]>`
    SELECT ar.id FROM approval_request ar WHERE ar.run_id = ANY(${runs.map((r) => r.id)}::uuid[]) AND ${visibleApprovalSql(authz)}
    ORDER BY ar.requested_at DESC, ar.id DESC LIMIT ${CONVERSATION_APPROVALS_MAX}`;
  const byId = new Map((ids.length ? await tx.approvalRequest.findMany({ where: { id: { in: ids.map((r) => r.id) } } }) : []).map((r) => [r.id, r]));
  const rows = ids.map((r) => byId.get(r.id)!).filter(Boolean);
  const items = await approvalRows(tx, authz, rows, now, timeZone);
  return { items, pending: items.filter((r) => r.status === 'pending').length };
}
