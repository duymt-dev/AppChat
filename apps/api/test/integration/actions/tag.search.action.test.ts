// Ma trận tag.search (TIP-023b R2): happy (bỏ dấu) · 403 (kế toán không có inbox.view) · sales đọc được (danh mục thẻ dùng chung, không có
// data scope) · nguồn assistant. Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let vip: string;

beforeAll(async () => {
  m = await matrix('tag.search');
  vip = (await m.seed('tag.create', { name: 'Khách quen VIP' })).tag_id;
  await m.seed('tag.create', { name: 'Khiếu nại' });
}, 120_000);
afterAll(() => m?.close());

describe('tag.search', () => {
  it('happy: bỏ dấu', async () => {
    const r = await m.act({ q: 'khach quen' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.tags).toEqual([expect.objectContaining({ id: vip, name: 'Khách quen VIP' })]);
  });

  it('403: kế toán; sales đọc được', async () => {
    expect((await m.act({}, await m.h.member('accountant'))).status).toBe(403);
    expect((await m.act({ q: 'vip' }, m.sales)).body.data.result.tags.map((t: { id: string }) => t.id)).toEqual([vip]);
  });

  it('nguồn assistant · limit > 20 bị từ chối', async () => {
    expect((await m.act({}, undefined, { 'x-action-source': 'assistant' })).status).toBe(200);
    expect((await m.act({ limit: 21 })).status).toBe(422);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
  });
});
