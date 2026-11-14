import { describe, expect, it } from 'vitest';
import { paginate } from './paginate';

const rows = Array.from({ length: 45 }, (_, i) => i + 1);

describe('paginate (D42)', () => {
  it('không có page → trả hết (ô chọn, modal)', () => {
    expect(paginate(rows, {}).data).toHaveLength(45);
  });

  it('cắt theo page + limit, kèm tổng và next_cursor', () => {
    const r = paginate(rows, { page: 2, limit: 20 });
    expect(r.data).toEqual(rows.slice(20, 40));
    expect(r.meta).toEqual({ total: 45, page: 2, limit: 20 });
    expect(r.next_cursor).toBe('3');
  });

  it('trang vượt quá → trang cuối; limit ≤ 100', () => {
    expect(paginate(rows, { page: 9, limit: 20 }).meta.page).toBe(3);
    expect(paginate(rows, { page: 1, limit: 500 }).meta.limit).toBe(100);
    expect(paginate(rows, { page: 3, limit: 20 }).next_cursor).toBeNull();
  });
});
