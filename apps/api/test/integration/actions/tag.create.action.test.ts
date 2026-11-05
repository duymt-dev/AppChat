// Ma trận tag.create (TIP-023b): happy · preview Trợ lý (dữ liệu mới, xác nhận → tạo) · 403 (sales không có inbox.manage) · trùng tên không
// dấu → 409 · idempotency (cùng khoá → một thẻ). Scope: thẻ là cấu hình workspace, không có data scope. Undo: không khai (ActionDef);
// trạng thái: không có máy trạng thái.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('tag.create');
}, 120_000);
afterAll(() => m?.close());

describe('tag.create', () => {
  it('happy: tạo thẻ, đọc lại ở danh mục', async () => {
    const r = await m.act({ name: 'Khách quen', color: '#16A34A' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const t = (await m.db()).tag.findUnique({ where: { id: r.body.data.result.tag_id } });
    expect(await t).toMatchObject({ name: 'Khách quen', color: '#16A34A' });
  });

  it('preview Trợ lý: tóm tắt = tên, changes = dữ liệu mới; xác nhận mới tạo', async () => {
    const { preview, done } = await m.confirm({ name: 'Hẹn lại', emoji: '📅' });
    expect(preview).toEqual({ summary: 'Hẹn lại', risk: 'config', changes: [{ entity: 'tag', after: { name: 'Hẹn lại', emoji: '📅' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
  });

  it('403 sales; trùng tên không dấu → 409', async () => {
    expect((await m.act({ name: 'X' }, m.sales)).status).toBe(403);
    expect((await m.act({ name: 'khach QUEN' })).status).toBe(409);
  });

  it('idempotency: cùng khoá → cùng kết quả, một thẻ', async () => {
    const a = await m.actWithKey('tag-create-idem-1', { name: 'Lặp' });
    const b = await m.actWithKey('tag-create-idem-1', { name: 'Lặp' });
    expect(b.body.data.result).toEqual(a.body.data.result);
    expect(await (await m.db()).tag.count({ where: { name: 'Lặp' } })).toBe(1);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
