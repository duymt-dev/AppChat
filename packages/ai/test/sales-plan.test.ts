// TIP-022c §3.5 (unit): kế hoạch bán hàng có kiểu — schema đóng (không trường số tồn / giá do model tự viết), sản phẩm không trùng, số lượng
// nguyên dương, ≤ 5 sản phẩm / ≤ 3 thay thế; sai khuôn → `invalid` (chặn tự gửi), vắng → null; đọc kèm output agent-reply.
import { describe, expect, it } from 'vitest';
import { parseAgentReply, parseSalesPlan } from '../src';

describe('parseSalesPlan', () => {
  it('hợp lệ / vắng / sai khuôn / trùng / thừa trường / số lượng ≤ 0 / quá 3 thay thế', () => {
    expect(parseSalesPlan({ items: [{ product_id: 'p1', qty: 2, claim: 'available_now' }], narrative: 'Dạ' })).toEqual({ items: [{ product_id: 'p1', qty: 2, claim: 'available_now' }], alternatives: [], narrative: 'Dạ' });
    expect(parseSalesPlan(undefined)).toBeNull();
    for (const bad of [
      { items: [] },
      { items: [{ product_id: 'p1', qty: 0, claim: 'available_now' }] },
      { items: [{ product_id: 'p1', qty: 1, claim: 'in_stock' }] },
      { items: [{ product_id: 'p1', qty: 1, claim: 'available_now', stock: 99 }] },
      { items: [{ product_id: 'p1', qty: 1, claim: 'available_now' }, { product_id: 'p1', qty: 2, claim: 'shortage' }] },
      { items: [{ product_id: 'p1', qty: 1, claim: 'shortage' }], alternatives: ['a', 'b', 'c', 'd'] },
      'chuỗi',
    ]) expect(parseSalesPlan(bad)).toBe('invalid');
  });
});

describe('parseAgentReply + sales_plan', () => {
  it('khối sales_plan trong JSON cuối → kế hoạch; sai khuôn → invalid; vắng → null', () => {
    const ok = parseAgentReply(JSON.stringify({ reply: 'Dạ', confidence: 0.9, intent: 'buy', sentiment: 'neutral', needs_human: null, sales_plan: { items: [{ product_id: 'p1', qty: 1, claim: 'shortage' }], alternatives: ['p2'] } }));
    expect(ok.sales_plan).toEqual({ items: [{ product_id: 'p1', qty: 1, claim: 'shortage' }], alternatives: ['p2'], narrative: '' });
    expect(parseAgentReply(JSON.stringify({ reply: 'Dạ', confidence: 0.9, sales_plan: { items: [{ product_id: 'p1', qty: 1, claim: 'available_now', stock: 5 }] } })).sales_plan).toBe('invalid');
    expect(parseAgentReply(JSON.stringify({ reply: 'Dạ', confidence: 0.9 })).sales_plan).toBeNull();
    expect(parseAgentReply('Dạ còn hàng ạ').sales_plan).toBeNull();
  });
});
