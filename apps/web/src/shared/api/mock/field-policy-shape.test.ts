// TIP-045b annex C: mock áp cùng luật quyền theo trường với server — key tuỳ biến giới hạn vai trò bị bỏ khỏi list / chi tiết, lọc `cf.*`
// trên key ẩn → 422 FIELD_FORBIDDEN, giá vốn sản phẩm của Sales không có khoá (hidden_fields) thay vì '0', ghi giá vốn khi ẩn bị chặn.
import { afterEach, describe, expect, it } from 'vitest';
import { ApiRequestError, productRowSchema } from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { setMockRole } from './store';

const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return 'ok';
  } catch (e) {
    return e instanceof ApiRequestError ? e.error.code : String(e);
  }
};
type Rows = { data: { id: string; custom?: Record<string, unknown>; cost?: string | null; hidden_fields?: string[] }[] };

afterEach(() => setMockRole('owner'));

describe('mock quyền theo trường', () => {
  it('ticket.sla (owner, manager): sales không thấy trong list / chi tiết; owner thấy', async () => {
    const own = (await mockTransport.get('/tickets', {})) as Rows;
    expect(own.data.find((t) => t.id === 'tk_2041')?.custom).toHaveProperty('sla');
    setMockRole('sales');
    const s = (await mockTransport.get('/tickets', {})) as Rows;
    const row = s.data.find((t) => t.id === 'tk_2041');
    if (row) expect(row.custom ?? {}).not.toHaveProperty('sla');
    expect(await code(mockTransport.get('/tickets', { 'cf.sla': '4' }))).toBe('FIELD_FORBIDDEN');
    expect(await code(mockTransport.get('/tickets', { 'cf.khong_co': '1' }))).toBe('FIELD_FORBIDDEN');
  });

  it('giá vốn: sales → không có khoá cost + hidden_fields; owner có giá trị', async () => {
    const own = (await mockTransport.get('/products', { page: 1, limit: 20 })) as Rows;
    const first = own.data.find((p) => p.cost);
    expect(first?.cost).toBeTruthy();
    setMockRole('sales');
    const s = (await mockTransport.get('/products', { page: 1, limit: 20 })) as Rows;
    for (const p of s.data) {
      expect(p).not.toHaveProperty('cost');
      expect(p.hidden_fields).toEqual(['cost']);
      productRowSchema.parse(p);
    }
    const d = (await mockTransport.get(`/products/${first!.id}`)) as Rows['data'][number];
    expect(d).not.toHaveProperty('cost');
  });
});
