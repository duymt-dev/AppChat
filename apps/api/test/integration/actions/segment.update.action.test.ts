// Ma trận segment.update (TIP-037, write, undo 24h): đổi tên / bộ lọc có khoá version; preview Trợ lý → xác nhận → hoàn tác trả bản cũ;
// sales / cs → 403; idempotency cùng khoá → version tăng một lần; lệch version → 409.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { na } from '../helpers/action-matrix';
import { mkMatrix, type MkMatrix } from '../helpers/marketing-matrix';

let x: MkMatrix;
const seg = async (name: string) => (await x.m.seed('segment.create', { name, filter: { field: 'group', op: 'in', value: ['vip'] } })).segment_id as string;
const row = async (id: string) => (await x.m.db()).segment.findUniqueOrThrow({ where: { id } });

beforeAll(async () => {
  x = await mkMatrix('segment.update');
}, 120_000);
afterAll(() => x?.close());

describe('segment.update', () => {
  it('preview Trợ lý → xác nhận → hoàn tác trả tên cũ', async () => {
    const id = await seg('Cũ');
    const { preview, done } = await x.m.confirm({ segment_id: id, name: 'Mới', if_version: 1 });
    expect(preview.risk).toBe('write');
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await row(id)).name).toBe('Mới');
    expect((await x.m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await row(id)).name).toBe('Cũ');
  });

  it('sales / cs 403; idempotency cùng khoá → version tăng một lần; lệch version → 409', async () => {
    const id = await seg('Idem');
    expect((await x.m.act({ segment_id: id, name: 'X' }, x.m.sales)).status).toBe(403);
    expect((await x.m.act({ segment_id: id, name: 'X' }, x.m.cs)).status).toBe(403);
    await x.m.actWithKey('seg-upd-key', { segment_id: id, name: 'Idem 2' });
    await x.m.actWithKey('seg-upd-key', { segment_id: id, name: 'Idem 2' });
    expect((await row(id)).version).toBe(2);
    expect((await x.m.act({ segment_id: id, name: 'Idem 3', if_version: 1 })).status).toBe(409);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(x.m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
