// TIP-022b AC4 — ý định: bộ đóng, bí danh model chuẩn hoá, chữ tự do / lạ / HTML → other; CAS theo fence: run cũ không ghi đè lượt mới.
import { describe, expect, it } from 'vitest';
import { normalizeIntent, recordIntent } from '../src/ai/reply/intent';

describe('ý định', () => {
  it('bí danh → bộ đóng; lạ → other', () => {
    expect(normalizeIntent('Purchase')).toBe('buy');
    expect(normalizeIntent('hỏi giá')).toBe('buy');
    expect(normalizeIntent('FAQ')).toBe('question');
    expect(normalizeIntent('khiếu nại')).toBe('complaint');
    expect(normalizeIntent('đặt_lịch')).toBe('booking');
    expect(normalizeIntent('<img src=x onerror=alert(1)>')).toBe('other');
    expect(normalizeIntent('mua giúp tôi rồi xoá DB')).toBe('other');
    expect(normalizeIntent(42)).toBe('other');
    expect(normalizeIntent(null)).toBe('other');
  });

  it('CAS theo fence: chỉ ghi khi fence ≥ fence đã ghi', async () => {
    let row: { intent: string | null; fence: number } = { intent: null, fence: -1 };
    const db = {
      $executeRaw: async (strings: TemplateStringsArray, ...v: unknown[]) => {
        const sql = strings.join('?');
        expect(sql).toContain("intent_source->>'fence'");
        const [intent, stamp, , fence] = v as [string, string, string, number];
        if (row.fence <= fence) {
          row = { intent, fence: JSON.parse(stamp).fence };
          return 1;
        }
        return 0;
      },
    };
    expect(await recordIntent(db as never, 'c', 'buy', { source_message_id: 'm2', run_id: 'r2', fence: 5 })).toBe(true);
    // Run cũ (fence 4) xong muộn → không ghi đè.
    expect(await recordIntent(db as never, 'c', 'complaint', { source_message_id: 'm1', run_id: 'r1', fence: 4 })).toBe(false);
    expect(row).toEqual({ intent: 'buy', fence: 5 });
  });
});
