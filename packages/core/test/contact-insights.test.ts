// TIP-015b gợi ý bước tiếp theo (bộ luật, không DB / không model): thứ tự ưu tiên quá hạn → lâu không tương tác → báo giá → tư vấn; đã mua
// / thất bại không cần; công nợ không thấy được (null) thì không vào luật. Số liệu DB: apps/api/test/integration/contact-insights.test.ts.
import { describe, expect, it } from 'vitest';
import { IDLE_DAYS, nextActionOf } from '../src/crm/insights/next-action';

const now = new Date('2026-11-04T03:00:00Z');
const ago = (d: number) => new Date(now.getTime() - d * 86_400_000);
const c = (stage: string, idle = 0) => ({ id: 'k', stage, lastInteractionAt: ago(idle) });

describe('nextActionOf', () => {
  it('quá hạn thắng mọi luật khác, kể cả đã mua', () => {
    expect(nextActionOf(c('won', 40), '1200000', now)).toEqual({ key: 'collect', kind: 'wait', source: 'rule', params: { amount: '1200000' } });
  });

  it('không thấy công nợ (null) hoặc 0 → bỏ qua luật nhắc thu', () => {
    expect(nextActionOf(c('quote'), null, now).key).toBe('close_quote');
    expect(nextActionOf(c('quote'), '0', now).key).toBe('close_quote');
  });

  it(`không tương tác ≥ ${IDLE_DAYS} ngày → chăm sóc lại (kèm số ngày); ngay dưới ngưỡng → theo giai đoạn`, () => {
    expect(nextActionOf(c('consulting', IDLE_DAYS), null, now)).toMatchObject({ key: 'reengage', params: { days: IDLE_DAYS } });
    expect(nextActionOf(c('consulting', IDLE_DAYS - 1), null, now).key).toBe('consult');
  });

  it('đã mua / thất bại → không cần (kind user); lead / tiềm năng → tư vấn', () => {
    expect(nextActionOf(c('won', 90), null, now)).toMatchObject({ key: 'none', kind: 'user' });
    expect(nextActionOf(c('lost'), null, now).kind).toBe('user');
    expect(nextActionOf(c('lead'), null, now).key).toBe('consult');
    expect(nextActionOf(c('potential'), null, now).key).toBe('consult');
  });
});
