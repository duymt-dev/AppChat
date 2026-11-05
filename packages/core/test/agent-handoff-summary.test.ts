// TIP-022b AC4 — tóm tắt bàn giao mọi lý do kể cả hết credit / lỗi model (tất định, không gọi LLM); kết quả hành động thật (chờ duyệt ≠
// xong, bị từ chối ≠ thành công); không bịa; chiếu tham chiếu theo quyền người xem; phiên bản theo lý do (chạy lại không tạo bản thứ hai).
import { describe, expect, it } from 'vitest';
import { HANDOFF_SUMMARY_REASONS, handoffSummarySchema } from '@appchat/shared';
import { buildHandoffSummary, nextSummaryVersion, projectSummary, summaryChanged } from '../src/ai/reply/handoff-summary';

const NOW = new Date('2026-11-06T03:00:00Z');
const Q = '00000000-0000-7000-8000-0000000000a1';
const T = '00000000-0000-7000-8000-0000000000b1';

function fakeDb(steps: { actionId: string; status: string; input: unknown; output: unknown }[]) {
  return {
    message: { findMany: async () => [{ id: 'm2', body: 'Báo giá BG-1 em đồng ý nhé', attachments: [{ name: 'C:\\x\\hop-dong.pdf', mime: 'application/pdf' }] }, { id: 'm1', body: 'Chào shop', attachments: [] }] },
    aiRunStep: { findMany: async () => steps },
  } as never;
}

describe('tóm tắt bàn giao', () => {
  it('mọi lý do có tóm tắt hữu ích, kể cả không run (hết credit / lỗi) — extractive, không gọi model', async () => {
    for (const reason of HANDOFF_SUMMARY_REASONS) {
      const s = await buildHandoffSummary(fakeDb([]), { conversationId: 'c', runId: null, reason, intent: null, now: NOW }, 1);
      expect(handoffSummarySchema.safeParse(s).success).toBe(true);
      expect(s.request).toContain('Báo giá BG-1 em đồng ý');
      expect(s.last_message_id).toBe('m2');
      expect(s.source).toBe('extractive');
      expect(s.actions).toEqual([]);
      expect(s.attachments_unreadable).toBe(1);
      expect(s.unresolved).toBe('attachment_unreadable');
    }
  });

  it('kết quả hành động thật: chờ duyệt = pending, bị chặn = denied, lỗi = error; không bịa thành công', async () => {
    const s = await buildHandoffSummary(
      fakeDb([
        { actionId: 'quote.get', status: 'ok', input: { quote_id: Q }, output: { kind: 'ok', output: { quote_id: Q } } },
        { actionId: 'quote.mark_accepted', status: 'paused', input: { quote_id: Q }, output: null },
        { actionId: 'ticket.create', status: 'ok', input: {}, output: { kind: 'error', code: 'FORBIDDEN' } },
        { actionId: 'appointment.cancel', status: 'error', input: {}, output: { kind: 'error', code: 'INVALID_STATE' } },
      ]),
      { conversationId: 'c', runId: 'r', reason: 'needs_human', intent: 'buy', modelNote: 'Khách hỏi chiết khấu thêm', now: NOW },
      2,
    );
    expect(s.actions.map((a) => [a.action_id, a.status])).toEqual([['quote.get', 'ok'], ['quote.mark_accepted', 'pending'], ['ticket.create', 'denied'], ['appointment.cancel', 'error']]);
    expect(s.facts).toEqual([{ label: 'quote_id', value: Q, ref: { type: 'quote', id: Q } }]);
    expect(s.unresolved).toBe('Khách hỏi chiết khấu thêm');
    expect(s.source).toBe('model');
    expect(s.intent).toBe('buy');
  });

  it('chiếu theo quyền người xem: tham chiếu không được thấy bị bỏ', async () => {
    const s = await buildHandoffSummary(fakeDb([{ actionId: 'ticket.get', status: 'ok', input: { ticket_id: T, quote_id: Q }, output: { kind: 'ok', output: {} } }]), { conversationId: 'c', runId: 'r', reason: 'complaint', intent: 'complaint', now: NOW }, 1);
    const p = await projectSummary(s, async (type) => type === 'quote');
    expect(p!.facts.map((f) => f.ref?.type)).toEqual(['quote']);
    expect(await projectSummary(null, async () => true)).toBeNull();
  });

  it('phiên bản theo lý do: cùng lý do + cùng tin cuối → không đổi; lý do mới → bản mới', () => {
    const cur = { reason: 'credit', last_message_id: 'm2', version: 3 };
    expect(summaryChanged(cur, { reason: 'credit', last_message_id: 'm2' })).toBe(false);
    expect(summaryChanged(cur, { reason: 'approval_rejected', last_message_id: 'm2' })).toBe(true);
    expect(nextSummaryVersion(cur)).toBe(4);
    expect(nextSummaryVersion(null)).toBe(1);
  });
});
