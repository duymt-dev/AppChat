// Policy nguồn × rủi ro (Blueprint §3.3). Governance cứng (FORCE_APPROVAL — COMMERCE / D05, TIP-032b): ngưỡng báo giá (> ngưỡng
// workspace, giảm vượt trần agent) do handler domain chặn bằng QUOTE_NEEDS_APPROVAL; hợp đồng / hoàn tiền / gửi hàng loạt do agent / tác vụ
// gọi LUÔN qua duyệt ở đây — "agent trực kênh trong hội thoại đang phục vụ" hay "tác vụ không hỏi trước khi gửi" không miễn được.
import type { Risk } from '@appchat/actions';
import type { ActionPolicyInput, ActionSource } from './action-context';

export type PolicyDecision = 'run' | 'preview' | 'approval' | 'forbidden';

const TABLE: Record<ActionSource, Record<Risk, PolicyDecision>> = {
  ui: { read: 'run', write: 'run', send: 'run', money: 'run', delete: 'run', config: 'run' },
  api: { read: 'run', write: 'run', send: 'run', money: 'run', delete: 'run', config: 'run' },
  system: { read: 'run', write: 'run', send: 'run', money: 'run', delete: 'run', config: 'run' },
  assistant: { read: 'run', write: 'preview', send: 'preview', money: 'preview', delete: 'preview', config: 'preview' },
  agent: { read: 'run', write: 'run', send: 'approval', money: 'approval', delete: 'forbidden', config: 'forbidden' },
  task: { read: 'run', write: 'run', send: 'approval', money: 'approval', delete: 'approval', config: 'forbidden' },
};

/** Action luôn duyệt khi agent / tác vụ gọi (FORCE_APPROVAL: contract · refund · bulk_send). */
export const FORCE_APPROVAL_ACTIONS: ReadonlySet<string> = new Set([
  'contract.send_for_signature',
  'contract.appendix_send',
  'payment.refund',
  'payment.refund_approve',
  'payment.refund_reject',
  'campaign.approve',
]);

/**
 * Action chỉ người bấm ở UI (TIP-045b annex A3 — đổi Chủ sở hữu bằng OTP email): mọi nguồn khác bị cấm TRƯỚC xem trước / duyệt — Trợ lý
 * không dựng thẻ xác nhận, agent / tác vụ / API không xin hay nhập mã.
 */
export const UI_ONLY_ACTIONS: ReadonlySet<string> = new Set(['workspace.request_transfer_otp', 'workspace.transfer_ownership']);

export function decidePolicy({ source, risk, bulk, servedConversation, autoSend, actionId }: ActionPolicyInput): PolicyDecision {
  if (actionId && UI_ONLY_ACTIONS.has(actionId) && source !== 'ui') return 'forbidden';
  if ((source === 'agent' || source === 'task') && actionId && FORCE_APPROVAL_ACTIONS.has(actionId)) return TABLE[source][risk] === 'forbidden' ? 'forbidden' : 'approval';
  // Agent trực kênh trả lời trong hội thoại đang phục vụ: chạy (§3.3 dòng `agent`, cột send) — gửi nơi khác vẫn duyệt.
  if (source === 'agent' && risk === 'send' && servedConversation && !bulk) return 'run';
  // Tác vụ Cowork tắt "hỏi trước khi gửi": send chạy (§3.3 dòng `task`); delete / money luôn duyệt.
  if (source === 'task' && risk === 'send' && autoSend && !bulk) return 'run';
  const base = TABLE[source][risk] as PolicyDecision;
  // bulk luôn preview kèm số bản ghi, kể cả ui (§3.3) — trừ khi nguồn đã bị cấm / phải duyệt.
  if (bulk && base === 'run' && risk !== 'read' && source !== 'system') return 'preview';
  return base;
}

/** Luật Idempotency-Key ở `packages/actions` (FE `useAction` dùng chung — TIP-013). */
export { requiresIdempotencyKey } from '@appchat/actions';
