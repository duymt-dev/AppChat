// TIP-037 (unit) — phân khúc khách: AST ĐÓNG (trường / toán tử ngoài danh sách, quá sâu, quá nhiều nút, khoảng ngược → từ chối), biên dịch
// SQL chỉ dùng tham số cho giá trị (không ghép chuỗi người nhập), ngày tương đối tính từ Clock; đánh giá trong bộ nhớ (mock) cùng ngữ nghĩa.
import { describe, expect, it } from 'vitest';
import { evaluateSegment, segmentFilterSchema, type SegmentNode, type SegmentSubject } from '@appchat/shared';
import { parseFilter, segmentSql } from '../src/marketing/services/segments.service';

const NOW = new Date('2026-06-24T02:00:00.000Z');
const leaf = (n: number): SegmentNode => ({ field: 'order_count', op: 'gte', value: n });
const subject = (p: Partial<SegmentSubject> = {}): SegmentSubject => ({
  tags: ['vip'], stage: 'won', source: 'zalo', group: 'vip', tier: 'gold', total_spent: '12000000',
  last_order_at: '2026-03-01T00:00:00Z', last_interaction_at: '2026-06-20T00:00:00Z', order_count: 3, products: ['p1'], ...p,
});

describe('AST đóng', () => {
  it('trường / toán tử lạ, giá trị sai kiểu → từ chối; đúng → nhận', () => {
    expect(segmentFilterSchema.safeParse({ field: 'tag', op: 'has_any', value: ['vip'] }).success).toBe(true);
    expect(segmentFilterSchema.safeParse({ field: 'raw', op: 'eq', value: '1=1' }).success).toBe(false);
    expect(segmentFilterSchema.safeParse({ field: 'stage', op: 'like', value: ['won'] }).success).toBe(false);
    expect(segmentFilterSchema.safeParse({ field: 'group', op: 'in', value: ['hacker'] }).success).toBe(false);
    expect(segmentFilterSchema.safeParse({ field: 'total_spent', op: 'gte', value: '1e9' }).success).toBe(false);
    expect(segmentFilterSchema.safeParse({ field: 'tag', op: 'has_any', value: ['vip'], extra: 1 }).success).toBe(false);
  });

  it('lồng quá 3 tầng / quá 30 nút / khoảng tiền ngược → từ chối', () => {
    const deep: SegmentNode = { op: 'and', children: [{ op: 'or', children: [{ op: 'and', children: [{ op: 'or', children: [leaf(1)] }] }] }] };
    expect(segmentFilterSchema.safeParse(deep).success).toBe(false);
    expect(segmentFilterSchema.safeParse({ op: 'or', children: Array.from({ length: 30 }, (_, i) => leaf(i)) }).success).toBe(false);
    expect(segmentFilterSchema.safeParse({ field: 'total_spent', op: 'between', value: '5000000', value2: '1000000' }).success).toBe(false);
    expect(() => parseFilter({ op: 'xor', children: [] })).toThrow();
  });
});

describe('biên dịch SQL', () => {
  it('giá trị người nhập đi qua tham số — không xuất hiện trong chuỗi SQL', () => {
    const evil = "x'); DROP TABLE contact; --";
    const q = segmentSql({ op: 'and', children: [{ field: 'tag', op: 'has_any', value: [evil] }, { field: 'source', op: 'in', value: [evil] }] }, NOW);
    expect(q.sql).not.toContain('DROP');
    expect(q.values).toEqual(expect.arrayContaining([[evil]]));
  });

  it('ngày tương đối tính từ Clock; not_in trên cột có thể null giữ khách chưa có giá trị', () => {
    const q = segmentSql({ field: 'last_order_at', op: 'older_than_days', value: 90 }, NOW);
    expect(q.values).toEqual([new Date(NOW.getTime() - 90 * 86_400_000)]);
    expect(segmentSql({ field: 'group', op: 'not_in', value: ['vip'] }, NOW).sql).toContain('IS NULL OR NOT');
    expect(segmentSql({ op: 'or', children: [leaf(1), leaf(2)] }, NOW).sql).toContain(' OR ');
  });
});

describe('đánh giá trong bộ nhớ (cùng ngữ nghĩa SQL)', () => {
  it('and / or, thẻ, nhóm, tổng chi, ngày, chưa mua', () => {
    const f: SegmentNode = { op: 'and', children: [{ field: 'tag', op: 'has_any', value: ['vip'] }, { field: 'total_spent', op: 'between', value: '10000000', value2: '20000000' }] };
    expect(evaluateSegment(f, subject(), NOW)).toBe(true);
    expect(evaluateSegment(f, subject({ total_spent: '9000000' }), NOW)).toBe(false);
    expect(evaluateSegment({ field: 'last_order_at', op: 'older_than_days', value: 90 }, subject(), NOW)).toBe(true);
    expect(evaluateSegment({ field: 'last_interaction_at', op: 'within_days', value: 7 }, subject(), NOW)).toBe(true);
    expect(evaluateSegment({ field: 'last_order_at', op: 'never' }, subject({ last_order_at: null }), NOW)).toBe(true);
    expect(evaluateSegment({ field: 'group', op: 'not_in', value: ['vip'] }, subject({ group: null }), NOW)).toBe(true);
    expect(evaluateSegment({ op: 'or', children: [{ field: 'stage', op: 'in', value: ['lost'] }, leaf(3)] }, subject(), NOW)).toBe(true);
  });
});
