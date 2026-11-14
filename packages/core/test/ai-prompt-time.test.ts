import { describe, expect, it } from 'vitest';
import { nowLine } from '../src/ai/runs/runner';

describe('dòng thời gian trong system prompt', () => {
  it('ngày + thứ + giờ theo múi workspace (model mới hiểu "ngày mai", "3 ngày tới")', () => {
    // 2026-11-01T16:30Z = 23:30 Chủ nhật giờ VN; 2026-11-01T17:30Z = 00:30 Thứ Hai 02/11.
    expect(nowLine(new Date('2026-11-01T16:30:00Z'), 'Asia/Ho_Chi_Minh')).toContain('Chủ nhật, 2026-11-01 23:30 (Asia/Ho_Chi_Minh, +07:00)');
    expect(nowLine(new Date('2026-11-01T17:30:00Z'), 'Asia/Ho_Chi_Minh')).toContain('Thứ Hai, 2026-11-02 00:30');
    expect(nowLine(new Date('2026-11-01T17:30:00Z'), 'UTC')).toContain('Chủ nhật, 2026-11-01 17:30 (UTC, +00:00)');
  });
});
