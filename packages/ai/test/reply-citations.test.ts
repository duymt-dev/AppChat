// TIP-020d (unit): khối `citations` của câu trả lời kênh — ≤ 12, khuôn chặt; sai khuôn / quá số → `invalid` (không âm thầm bỏ);
// không có / rỗng → null; `raw_reply` giữ chuỗi thô (gốc toạ độ, trước trim); chữ thường (không JSON) không có trích dẫn.
import { describe, expect, it } from 'vitest';
import { MAX_ANSWER_CITATIONS, parseAgentReply } from '../src/reply/output';

const j = (o: object) => JSON.stringify({ reply: ' Dạ spa mở 8h ', confidence: 0.9, intent: 'question', sentiment: 'neutral', needs_human: null, ...o });

describe('citations trong câu trả lời', () => {
  it('hợp lệ → giữ nguyên (ref + quote | vị trí); raw_reply là chuỗi thô', () => {
    const r = parseAgentReply(j({ citations: [{ ref: 'S1', quote: 'spa mở 8h' }, { ref: 'S2', claim_start: 1, claim_end: 3 }] }));
    expect(r.reply).toBe('Dạ spa mở 8h');
    expect(r.raw_reply).toBe(' Dạ spa mở 8h ');
    expect(r.citations).toEqual([{ ref: 'S1', quote: 'spa mở 8h' }, { ref: 'S2', claim_start: 1, claim_end: 3 }]);
  });

  it('không có / rỗng → null; sai khuôn / khoá lạ / quá 12 → invalid', () => {
    expect(parseAgentReply(j({})).citations).toBeNull();
    expect(parseAgentReply(j({ citations: [] })).citations).toBeNull();
    expect(parseAgentReply(j({ citations: [{ ref: 'S1', url: 'https://x' }] })).citations).toBe('invalid');
    expect(parseAgentReply(j({ citations: 'S1' })).citations).toBe('invalid');
    expect(parseAgentReply(j({ citations: Array.from({ length: MAX_ANSWER_CITATIONS + 1 }, () => ({ ref: 'S1', quote: 'x' })) })).citations).toBe('invalid');
  });

  it('chữ thường → không trích dẫn đã kiểm', () => {
    expect(parseAgentReply('Dạ em chào chị')).toMatchObject({ citations: null, raw_reply: null });
  });
});
