// Ma trận kb.source_search (TIP-023b R2): happy (bỏ dấu theo tên / thẻ, không trả nội dung / URL / tệp) · 403 (sales không có kb.manage)
// · nguồn assistant. Nguồn ghi bằng kb.add_source learn=false (không cần worker nạp). Idempotency / undo / trạng thái: không áp dụng.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let price: string;

beforeAll(async () => {
  m = await matrix('kb.source_search');
  price = (await m.seed('kb.add_source', { name: 'Bảng giá 2026', text: 'Gội đầu dưỡng sinh 150.000đ', tags: ['Giá'], learn: false })).source_id;
  await m.seed('kb.add_source', { name: 'Chính sách đổi lịch', text: 'Đổi lịch trước 2 giờ.', tags: ['Policy'], learn: false, visibility: 'internal' });
}, 120_000);
afterAll(() => m?.close());

describe('kb.source_search', () => {
  it('happy: bỏ dấu theo tên hoặc thẻ, không trả nội dung', async () => {
    const r = await m.act({ q: 'bang gia' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.sources).toEqual([expect.objectContaining({ id: price, name: 'Bảng giá 2026', visibility: 'public', tags: ['Giá'] })]);
    expect(Object.keys(r.body.data.result.sources[0]).sort()).toEqual(['id', 'kind', 'name', 'status', 'tags', 'visibility']);
    expect((await m.act({ q: 'policy' })).body.data.result.sources.map((s: { name: string }) => s.name)).toEqual(['Chính sách đổi lịch']);
  });

  it('403: sales không có kb.manage', async () => {
    expect((await m.act({}, m.sales)).status).toBe(403);
  });

  it('nguồn assistant · limit > 20 bị từ chối', async () => {
    expect((await m.act({}, undefined, { 'x-action-source': 'assistant' })).status).toBe(200);
    expect((await m.act({ limit: 21 })).status).toBe(422);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
  });
});
