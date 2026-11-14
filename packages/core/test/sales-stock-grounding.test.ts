// TIP-022c AC5 / AC6 (unit, FixedClock): tồn kho có căn cứ — vật lý dương / 0 / âm / không đủ / không quản lý, sản phẩm nháp / lưu trữ /
// xoá / không thấy, số lượng sai, loại không quản lý tồn (dịch vụ / liệu trình / số / thuê), combo nhiều lá (lá lặp gộp + nhân số lượng,
// vòng, quá sâu, thành phần thiếu / ngừng bán, combo toàn dịch vụ); câu gửi khách server dựng từ quan sát (không số model), kết luận model
// lệch → không tự gửi; thay thế chỉ id đọc được còn hàng, ≤ 3, bỏ sản phẩm khách hỏi.
import { describe, expect, it } from 'vitest';
import { MAX_COMBO_DEPTH, observeSalesStock } from '../src/catalog/services/sales-stock-observation';
import { verifiedAlternatives } from '../src/ai/sales-behavior/alternatives';
import { renderSalesResponse } from '../src/ai/sales-behavior/response';
import type { TenantTx } from '../src/kernel/actions/action-context';

const NOW = new Date('2026-11-13T03:00:00Z');
const id = (n: number) => `0190f000-0000-7000-8000-${String(n).padStart(12, '0')}`;
type P = { id: string; code: string; name: string; type: string; unit: string; price: bigint; stock: number | null; status: string; deletedAt: Date | null };
const prod = (n: number, o: Partial<P> = {}): P => ({ id: id(n), code: `SP-${n}`, name: `SP ${n}`, type: 'physical', unit: 'hộp', price: 100_000n, stock: 10, status: 'active', deletedAt: null, ...o });

/** Transaction giả: product / productComponent findMany theo `id in` / `productId in`. Đếm truy vấn để kiểm lô. */
function fakeTx(products: P[], edges: { productId: string; childId: string; qty: number }[]) {
  const calls = { product: 0, component: 0 };
  const tx = {
    product: {
      findMany: async ({ where }: { where: { id: { in: string[] } } }) => (calls.product++, products.filter((p) => where.id.in.includes(p.id))),
    },
    productComponent: {
      findMany: async ({ where }: { where: { productId: { in: string[] } } }) => (calls.component++, edges.filter((e) => where.productId.in.includes(e.productId))),
    },
  } as unknown as TenantTx;
  return { tx, calls };
}
const observe = (products: P[], req: { productId: string; qty: number }[], edges: { productId: string; childId: string; qty: number }[] = []) => observeSalesStock(fakeTx(products, edges).tx, req, NOW);

describe('vật lý + trạng thái sản phẩm', () => {
  it('đủ / bằng / thiếu / 0 / âm / null', async () => {
    const r = await observe(
      [prod(1, { stock: 5 }), prod(2, { stock: 3 }), prod(3, { stock: 0 }), prod(4, { stock: -2 }), prod(5, { stock: null })],
      [{ productId: id(1), qty: 3 }, { productId: id(2), qty: 3 }, { productId: id(3), qty: 1 }, { productId: id(4), qty: 1 }, { productId: id(5), qty: 1 }],
    );
    expect(r.items.map((i) => [i.claim, i.stock])).toEqual([['available_now', 5], ['available_now', 3], ['shortage', 0], ['shortage', -2], ['unknown', null]]);
    expect(r.items[0]).toMatchObject({ code: 'SP-1', price: '100000', unit: 'hộp' });
    expect(r.items[0]).not.toHaveProperty('cost');
    expect(r.checkedAt).toBe(NOW.toISOString());
    expect(r.digest).toMatch(/^[0-9a-f]{64}$/);
  });

  it('nháp / lưu trữ / xoá / không thấy / id rác → unknown not_found; số lượng 0 / lẻ → quantity_unclear', async () => {
    const r = await observe(
      [prod(1, { status: 'draft' }), prod(2, { status: 'archived' }), prod(3, { deletedAt: NOW }), prod(4)],
      [{ productId: id(1), qty: 1 }, { productId: id(2), qty: 1 }, { productId: id(3), qty: 1 }, { productId: id(9), qty: 1 }, { productId: 'rac', qty: 1 }, { productId: id(4), qty: 0 }, { productId: id(4), qty: 1.5 }],
    );
    expect(r.items.map((i) => i.reason)).toEqual(['not_found', 'not_found', 'not_found', 'not_found', 'not_found', 'quantity_unclear', 'quantity_unclear']);
    expect(r.items[0]!.name).toBe('');
  });

  it('dịch vụ / liệu trình / số / thuê → không quản lý tồn (không bao giờ "hết hàng")', async () => {
    const r = await observe(['service', 'package', 'digital', 'rental'].map((t, i) => prod(i + 1, { type: t, stock: 0 })), [1, 2, 3, 4].map((n) => ({ productId: id(n), qty: 1 })));
    expect(r.items.every((i) => i.claim === 'not_stock_tracked' && i.stock === null)).toBe(true);
  });
});

describe('combo', () => {
  const combo = (n: number, o: Partial<P> = {}) => prod(n, { type: 'combo', stock: null, ...o });

  it('lá lặp gộp + nhân số lượng (2 combo × (2 + 1×3) lá A) — đủ thì còn, thiếu một lá thì thiếu', async () => {
    const products = [combo(1), combo(2), prod(10, { stock: 10 }), prod(11, { stock: 3 }), prod(12, { type: 'service' })];
    const edges = [{ productId: id(1), childId: id(10), qty: 2 }, { productId: id(1), childId: id(2), qty: 1 }, { productId: id(2), childId: id(10), qty: 3 }, { productId: id(2), childId: id(11), qty: 1 }, { productId: id(1), childId: id(12), qty: 1 }];
    const ok = await observe(products, [{ productId: id(1), qty: 2 }], edges);
    expect(ok.items[0]).toMatchObject({ claim: 'available_now', leaves: [{ productId: id(10), need: 10, stock: 10 }, { productId: id(11), need: 2, stock: 3 }] });
    const short = await observe(products, [{ productId: id(1), qty: 4 }], edges);
    expect(short.items[0]!.claim).toBe('shortage');
  });

  it('vòng / số lượng sai / thành phần ngừng bán / thiếu thành phần → unknown', async () => {
    const cyc = await observe([combo(1), combo(2)], [{ productId: id(1), qty: 1 }], [{ productId: id(1), childId: id(2), qty: 1 }, { productId: id(2), childId: id(1), qty: 1 }]);
    expect(cyc.items[0]).toMatchObject({ claim: 'unknown', reason: 'combo_cycle' });
    const bad = await observe([combo(1), prod(10)], [{ productId: id(1), qty: 1 }], [{ productId: id(1), childId: id(10), qty: 0 }]);
    expect(bad.items[0]!.reason).toBe('combo_invalid_qty');
    const off = await observe([combo(1), prod(10, { status: 'archived' })], [{ productId: id(1), qty: 1 }], [{ productId: id(1), childId: id(10), qty: 1 }]);
    expect(off.items[0]!.reason).toBe('combo_component_unavailable');
    const none = await observe([combo(1)], [{ productId: id(1), qty: 1 }]);
    expect(none.items[0]!.reason).toBe('combo_component_missing');
  });

  it('quá 5 tầng / quá 50 thành phần → unknown (không thành công một phần); combo toàn dịch vụ → không quản lý tồn', async () => {
    const chain = Array.from({ length: MAX_COMBO_DEPTH + 1 }, (_, i) => combo(i + 1));
    const edges = chain.slice(0, -1).map((c, i) => ({ productId: c.id, childId: chain[i + 1]!.id, qty: 1 }));
    expect((await observe([...chain, prod(99)], [{ productId: id(1), qty: 1 }], [...edges, { productId: chain.at(-1)!.id, childId: id(99), qty: 1 }])).items[0]!.reason).toBe('combo_too_deep');
    const many = Array.from({ length: 51 }, (_, i) => prod(100 + i));
    expect((await observe([combo(1), ...many], [{ productId: id(1), qty: 1 }], many.map((m) => ({ productId: id(1), childId: m.id, qty: 1 })))).items[0]!.reason).toBe('combo_too_large');
    expect((await observe([combo(1), prod(10, { type: 'service' })], [{ productId: id(1), qty: 1 }], [{ productId: id(1), childId: id(10), qty: 1 }])).items[0]!.claim).toBe('not_stock_tracked');
  });

  it('đọc theo lô: một truy vấn sản phẩm + mỗi tầng một truy vấn + một lô tồn lá', async () => {
    const { tx, calls } = fakeTx([combo(1), prod(10), prod(11), prod(20)], [{ productId: id(1), childId: id(10), qty: 1 }, { productId: id(1), childId: id(11), qty: 1 }]);
    await observeSalesStock(tx, [{ productId: id(1), qty: 1 }, { productId: id(20), qty: 1 }], NOW);
    expect(calls).toEqual({ product: 3, component: 1 });
  });
});

describe('câu gửi khách + thay thế', () => {
  const plan = (claim: 'available_now' | 'shortage' | 'unknown' | 'not_stock_tracked', alternatives: string[] = []) => ({ items: [{ product_id: id(1), qty: 2, claim }], alternatives, narrative: 'Dạ em kiểm giúp chị nhé.' });

  it('còn hàng: số / giá / giờ kiểm từ quan sát, nói rõ chưa giữ hàng; model khai sai kết luận → mismatch', async () => {
    const obs = await observe([prod(1, { stock: 5, price: 250_000n, name: 'Serum B5' })], [{ productId: id(1), qty: 2 }]);
    const r = renderSalesResponse(plan('available_now'), obs, null, { locale: 'vi', timeZone: 'Asia/Ho_Chi_Minh' });
    expect(r.kind).toBe('ready');
    expect(r.text).toContain('Dạ em kiểm giúp chị nhé.');
    expect(r.text).toContain('Serum B5: còn hàng cho 2 hộp');
    expect(r.text).toContain('250.000₫');
    expect(r.text).toContain('chưa được giữ');
    expect(renderSalesResponse(plan('shortage'), obs, null, { locale: 'vi', timeZone: 'Asia/Ho_Chi_Minh' }).kind).toBe('mismatch');
  });

  it('thiếu hàng → thay thế đã kiểm còn hàng (≤ 3, bỏ sản phẩm hỏi) hoặc câu "chưa tìm được"; unknown → không hứa', async () => {
    const obs = await observe([prod(1, { stock: 1 })], [{ productId: id(1), qty: 2 }]);
    const alts = await observe([prod(1), prod(2, { stock: 0 }), prod(3, { stock: 9, name: 'Serum C' }), prod(4, { type: 'service' })], [1, 2, 3, 4].map((n) => ({ productId: id(n), qty: 2 })));
    expect(verifiedAlternatives([id(1)], alts.items).map((a) => a.productId)).toEqual([id(3)]);
    const r = renderSalesResponse(plan('shortage', [id(1), id(2), id(3), id(4)]), obs, alts, { locale: 'vi', timeZone: 'Asia/Ho_Chi_Minh' });
    expect(r.kind).toBe('ready');
    expect(r.text).toContain('chưa đủ 2 hộp');
    expect(r.text).toContain('Serum C');
    expect(r.text).not.toContain('SP 2');
    const none = renderSalesResponse(plan('shortage'), obs, null, { locale: 'en', timeZone: 'Asia/Ho_Chi_Minh' });
    expect(none.text).toContain('could not find a verified in-stock alternative');
    const unk = renderSalesResponse(plan('unknown'), await observe([prod(1, { stock: null })], [{ productId: id(1), qty: 2 }]), null, { locale: 'vi', timeZone: 'Asia/Ho_Chi_Minh' });
    expect(unk.kind).toBe('unknown');
    expect(unk.text).toContain('chưa kiểm được tồn kho');
  });
});
