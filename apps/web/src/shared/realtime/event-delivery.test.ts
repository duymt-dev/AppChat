// TIP-006b §3.6: invalidation realtime at-least-once — trùng `rt_id` bỏ qua, khác id / không id luôn làm mới; thứ tự lệch chỉ là làm mới
// thêm (không áp payload). Khoá làm mới theo sự kiện không đổi.
import { describe, expect, it } from 'vitest';
import { dedupe, keysFor } from './event-invalidation';

describe('dedupe', () => {
  it('cùng rt_id → chỉ lần đầu; khác id / không id → luôn xử lý', () => {
    const fresh = dedupe();
    expect(fresh({ rt_id: 'a' })).toBe(true);
    expect(fresh({ rt_id: 'a' })).toBe(false);
    expect(fresh({ rt_id: 'b' })).toBe(true);
    expect(fresh({ id: 'x' })).toBe(true);
    expect(fresh(null)).toBe(true);
    expect(fresh(undefined)).toBe(true);
  });

  it('nhớ có giới hạn: id cũ nhất bị quên khi vượt trần', () => {
    const fresh = dedupe(2);
    for (const id of ['a', 'b', 'c']) fresh({ rt_id: id });
    expect(fresh({ rt_id: 'a' })).toBe(true);
    expect(fresh({ rt_id: 'c' })).toBe(false);
  });

  it('khoá làm mới theo sự kiện không đổi (notification.new → chuông + badge)', () => {
    expect(keysFor('notification.new', { rt_id: 'z' }).length).toBeGreaterThan(0);
    expect(keysFor('message.new', { conversation_id: 'c1', rt_id: 'z' })).toContainEqual(['inbox', 'messages', 'c1']);
  });

  it('TIP-016b: tin / hội thoại / ticket / lịch hẹn đổi → số đếm rail đọc lại; sự kiện không liên quan thì không', () => {
    for (const e of ['message.new', 'message.updated', 'conversation.updated', 'ticket.updated', 'appointment.updated']) expect(keysFor(e, { rt_id: 'z' }), e).toContainEqual(['nav', 'badges']);
    expect(keysFor('run.step', {})).not.toContainEqual(['nav', 'badges']);
  });
});
