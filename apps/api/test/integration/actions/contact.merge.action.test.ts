// Ma trận contact.merge (TIP-023b, bulk → preview): cặp chính~phụ → bản phụ gộp vào bản chính (số ghi chú / timeline chuyển) + trường trống
// được lấp; undo tách lại. Cặp sai → 422, khách ngoài quyền sửa (sales own) → 404 ở preview.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let dup: string;

beforeAll(async () => {
  m = await matrix('contact.merge');
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan Gộp', phone: '0909570001' })).contact_id;
  dup = (await m.seed('contact.create', { full_name: 'Chị Lan Gộp', phone: '0909570002', email: 'lan.gop@khach.vn' })).contact_id;
}, 120_000);
afterAll(() => m?.close());

describe('contact.merge', () => {
  it('cặp sai → 422 · sales ngoài quyền → 404', async () => {
    expect((await m.act({ group_ids: ['sai'] }, undefined, { 'x-action-source': 'assistant' })).status).toBe(422);
    expect((await m.act({ group_ids: [`${lan}~${dup}`] }, m.sales)).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const codes = Object.fromEntries((await (await m.db()).contact.findMany({ where: { id: { in: [lan, dup] } }, select: { id: true, code: true } })).map((c) => [c.id, c.code]));
    const { preview, done } = await m.confirm({ group_ids: [`${lan}~${dup}`] });
    expect(preview).toMatchObject({
      summary: '1',
      risk: 'write',
      count: 1,
      changes: [
        { entity: 'contact', id: dup, before: { code: codes[dup], name: 'Chị Lan Gộp' }, after: { merged_into: codes[lan] } },
        { entity: 'contact', id: lan, before: { email: null }, after: { email: 'lan.gop@khach.vn' } },
      ],
    });
    expect(done.body.data.result).toEqual({ merged: 1 });
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).contact.findUniqueOrThrow({ where: { id: dup } })).deletedAt).toBeNull();
  });

  it('bulk: gọi từ UI cũng phải qua preview kèm số bản ghi', async () => {
    const r = await m.act({ group_ids: [`${lan}~${dup}`] });
    expect(r.status, JSON.stringify(r.body)).toBe(202);
    expect(r.body.data.preview.count).toBe(1);
  });
});
