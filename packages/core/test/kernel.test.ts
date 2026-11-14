// TIP-001 AC5, AC6: Clock, uuidv7, RequestContext, loadEnv.
import { describe, expect, it } from 'vitest';
import { EnvError, FixedClock, RequestContext, UUID_V7, acceptTraceId, loadEnv, uuidv7 } from '../src/kernel';

describe('FixedClock', () => {
  it('trả đúng thời điểm và dịch theo advance / set', () => {
    const c = new FixedClock('2026-10-30T01:00:00.000Z');
    expect(c.now().toISOString()).toBe('2026-10-30T01:00:00.000Z');
    c.advance(90_000);
    expect(c.now().toISOString()).toBe('2026-10-30T01:01:30.000Z');
    c.set('2027-01-01T00:00:00.000Z');
    expect(c.now().getUTCFullYear()).toBe(2027);
  });

  it('now() trả bản sao, sửa kết quả không đổi đồng hồ', () => {
    const c = new FixedClock(0);
    c.now().setTime(999);
    expect(c.now().getTime()).toBe(0);
  });
});

describe('uuidv7', () => {
  it('đúng version 7 / variant 10', () => {
    for (let i = 0; i < 200; i++) expect(uuidv7()).toMatch(UUID_V7);
  });

  it('mã hoá timestamp ms ở 48 bit đầu', () => {
    // Mốc phải sau mọi id đã sinh trong tiến trình (uuidv7 đơn điệu: ms nhỏ hơn bị kẹp lên ms gần nhất) — mốc cố định thành bom hẹn giờ.
    const ms = Date.now();
    const id = uuidv7(ms + 10_000_000);
    const hex = id.replace(/-/g, '').slice(0, 12);
    expect(parseInt(hex, 16)).toBe(ms + 10_000_000);
  });

  it('tăng dần đơn điệu kể cả nhiều id trong cùng 1 ms', () => {
    const ids = Array.from({ length: 5000 }, () => uuidv7());
    expect([...ids].sort()).toEqual(ids);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('RequestContext', () => {
  it('giữ ngữ cảnh qua await, patch thêm trường, ngoài run thì rỗng', async () => {
    expect(RequestContext.get()).toBeUndefined();
    await RequestContext.run({ traceId: 't1', source: 'http' }, async () => {
      await new Promise((r) => setTimeout(r, 1));
      RequestContext.patch({ userId: 'u1' });
      expect(RequestContext.get()).toEqual({ traceId: 't1', source: 'http', userId: 'u1' });
    });
    expect(RequestContext.get()).toBeUndefined();
  });

  it('acceptTraceId chỉ nhận 1–128 ký tự [A-Za-z0-9._-]', () => {
    expect(acceptTraceId('abc-123')).toBe('abc-123');
    expect(acceptTraceId(['a.b_c', 'x'])).toBe('a.b_c');
    expect(acceptTraceId(undefined)).toBeUndefined();
    expect(acceptTraceId('')).toBeUndefined();
    expect(acceptTraceId('có dấu')).toBeUndefined();
    expect(acceptTraceId('a\nb')).toBeUndefined();
    expect(acceptTraceId('x'.repeat(129))).toBeUndefined();
    expect(acceptTraceId('x'.repeat(128))).toHaveLength(128);
  });
});

describe('loadEnv', () => {
  it('áp mặc định', () => {
    expect(loadEnv({})).toEqual({ NODE_ENV: 'development', LOG_LEVEL: 'info', API_PORT: 4000, ROLE: 'all' });
  });

  it('ép kiểu số cho API_PORT', () => {
    expect(loadEnv({ API_PORT: '4100', ROLE: 'jobs' })).toMatchObject({ API_PORT: 4100, ROLE: 'jobs' });
  });

  it('biến sai → EnvError nêu tên biến, không lộ giá trị', () => {
    let err: unknown;
    try {
      loadEnv({ API_PORT: 'abc', ROLE: 'foo', LOG_LEVEL: 'info' });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(EnvError);
    expect((err as EnvError).keys.sort()).toEqual(['API_PORT', 'ROLE']);
    expect((err as EnvError).message).not.toContain('abc');
    expect((err as EnvError).message).not.toContain('foo');
  });
});
