// Mock tóm tắt bàn giao + ý định (TIP-022b C) — GET /conversations/:id/handoff-summary như server: chỉ hội thoại đang "Cần người" có
// tóm tắt; hành động AI đã thử giữ KẾT QUẢ THẬT (pending ≠ xong). `?handoff=error` (e2e) mô phỏng lỗi tải để kiểm trạng thái thử lại.
import { ApiRequestError, type AgentIntent, type HandoffSummaryDto } from '@appchat/shared';
import type { MockRoute } from '../routes';

/** Ý định + có tóm tắt theo hội thoại seed (server: conversation.intent_source / handoff_summary). */
export const SEED_INTENT: Record<string, AgentIntent> = { c_hieu: 'buy' };

const SEED_SUMMARY: Record<string, Omit<HandoffSummaryDto, 'created_at'>> = {
  c_hieu: {
    version: 1,
    reason: 'needs_human',
    request: 'Khách muốn chuyển khoản ngay và hỏi số tài khoản nhận tiền.',
    facts: [
      { label: 'Khách', value: 'Anh Hiếu', ref: { type: 'contact', id: 'ct_hieu' } },
      { label: 'Báo giá', value: 'BG-0412', ref: { type: 'quote', id: 'q_0412' } },
    ],
    actions: [{ action_id: 'payment_request.create', status: 'pending', detail: 'Chờ chủ shop duyệt' }],
    unresolved: 'Xác nhận số tài khoản nhận tiền với khách',
    last_message_id: null,
    source: 'extractive',
    intent: 'buy',
    attachments_unreadable: 0,
  },
};

export const hasHandoffSummary = (id: string) => id in SEED_SUMMARY;

const failSeed = () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('handoff') === 'error';

export const handoffSummaryRoute = (path: string): MockRoute | null => {
  const m = path.match(/^\/conversations\/([^/]+)\/handoff-summary$/);
  if (!m) return null;
  return (db) => {
    if (failSeed()) throw new ApiRequestError(500, { code: 'INTERNAL', message: 'handoff_summary' });
    const c = db.inbox.conversations.find((x) => x.id === m[1]);
    const s = c && c.ai_state === 'handoff' ? SEED_SUMMARY[c.id] : undefined;
    return s ? { ...s, created_at: '2026-11-02T09:00:00+07:00' } : null;
  };
};
