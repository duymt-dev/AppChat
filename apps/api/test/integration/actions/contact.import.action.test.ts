// Ma trận contact.import (TIP-023b, bulk → preview): đếm tạo / trùng / của người khác / lỗi + danh sách sẽ tạo (không lộ khách người khác);
// undo xoá khách vừa tạo. 403 sales (không có crm.import).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('contact.import');
  await m.seed('contact.create', { full_name: 'Chị Có Sẵn', phone: '0909560001' }, m.sales);
}, 120_000);
afterAll(() => m?.close());

describe('contact.import', () => {
  it('403 sales', async () => {
    expect((await m.act({ rows: [{ full_name: 'X', phone: '0909560009' }] }, m.sales)).status).toBe(403);
  });

  it('preview → xác nhận → undo; khách của người khác chỉ đếm', async () => {
    const rows = [{ full_name: 'Chị Hoa Nhập', phone: '0909 560 002' }, { full_name: 'Trùng người khác', phone: '0909560001' }, { full_name: 'Lỗi', email: 'sai' }];
    const { preview, done } = await m.confirm({ rows });
    expect(preview).toMatchObject({ risk: 'write', count: 1, changes: [{ entity: 'contact', after: { name: 'Chị Hoa Nhập', phone: '0909560002', email: null } }] });
    expect(JSON.stringify(preview.changes)).not.toContain('Chị Có Sẵn');
    expect(done.body.data.result).toMatchObject({ created: 1, owned: 1, invalid: 1 });
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect(await (await m.db()).contact.count({ where: { name: 'Chị Hoa Nhập', deletedAt: null } })).toBe(0);
  });

  it('bulk: gọi từ UI cũng phải qua preview kèm số bản ghi', async () => {
    const r = await m.act({ rows: [{ full_name: 'Chị Bulk', phone: '0909560077' }] });
    expect(r.status, JSON.stringify(r.body)).toBe(202);
    expect(r.body.data.preview.count).toBe(1);
  });
});
