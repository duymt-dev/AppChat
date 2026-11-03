// matchCatalog (TIP-030b F2 ai:live): số nằm sẵn trong tên gói ("Liệu trình trị mụn 10 buổi") mà model đọc thành số lượng 10 → vẫn 1 gói;
// số lượng thật ("3 chai Serum") giữ nguyên; dòng ngoài danh mục giá 0.
import { describe, expect, it } from 'vitest';
import { matchCatalog } from '../src/sales/quotes/services/quote-draft';
import type { TenantTx } from '../src/kernel/actions/action-context';

const products = [
  { id: 'p1', name: 'Liệu trình trị mụn 10 buổi', price: '4500000', taxRate: 8, sessions: null },
  { id: 'p2', name: 'Serum dưỡng ẩm 30ml', price: '350000', taxRate: 10, sessions: null },
];
const tx = { product: { findMany: async () => products } } as unknown as TenantTx;

describe('matchCatalog', () => {
  it('số trong tên gói đọc nhầm thành số lượng → 1 gói; số lượng thật giữ', async () => {
    const r = await matchCatalog(tx, { lines: [{ text: 'Liệu trình trị mụn 10 buổi', qty: 10 }, { text: 'Serum dưỡng ẩm 30ml', qty: 3 }], discountPct: null });
    expect(r.items.map((i) => [i.product_id, i.qty])).toEqual([['p1', 1], ['p2', 3]]);
  });

  it('"2 lần Liệu trình trị mụn 10 buổi" (số lượng khác số trong tên) → 2; ngoài danh mục giá 0', async () => {
    const r = await matchCatalog(tx, { lines: [{ text: '2 lần Liệu trình trị mụn 10 buổi', qty: 2 }, { text: 'Tắm trắng', qty: 1 }], discountPct: null });
    expect(r.items[0]).toMatchObject({ product_id: 'p1', qty: 2 });
    expect(r).toMatchObject({ offCatalog: 1, items: [{}, { unit_price: '0' }] });
  });

  it('"10 x Liệu trình trị mụn 10 buổi" (số lượng nhắc riêng ngoài tên) → giữ 10', async () => {
    const r = await matchCatalog(tx, { lines: [{ text: '10 x Liệu trình trị mụn 10 buổi', qty: 10 }], discountPct: null });
    expect(r.items[0]!.qty).toBe(10);
  });
});
