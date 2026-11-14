// Ma trận campaign.update (TIP-037, write): sửa nháp (tên / nội dung) có khoá version; preview Trợ lý trước / sau → xác nhận; sales / cs →
// 403; idempotency cùng khoá → version tăng một lần; trạng thái: chờ duyệt → 409 INVALID_TRANSITION, bị từ chối → sửa → nháp.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { na } from '../helpers/action-matrix';
import { draftOf, mkMatrix, type MkMatrix } from '../helpers/marketing-matrix';

let x: MkMatrix;
const row = async (id: string) => (await x.m.db()).campaign.findUniqueOrThrow({ where: { id } });

beforeAll(async () => {
  x = await mkMatrix('campaign.update');
}, 120_000);
afterAll(() => x?.close());

describe('campaign.update', () => {
  it('preview Trợ lý (trước / sau) → xác nhận', async () => {
    const id = await draftOf(x, 'Cũ');
    const { preview, done } = await x.m.confirm({ campaign_id: id, name: 'Mới', if_version: 1 });
    expect(preview).toMatchObject({ risk: 'write', changes: [{ entity: 'campaign', id, before: { name: 'Cũ' }, after: { name: 'Mới' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await row(id)).name).toBe('Mới');
  });

  it('sales / cs 403; idempotency cùng khoá → version tăng một lần; lệch version → 409', async () => {
    const id = await draftOf(x);
    expect((await x.m.act({ campaign_id: id, name: 'X' }, x.m.sales)).status).toBe(403);
    expect((await x.m.act({ campaign_id: id, name: 'X' }, x.m.cs)).status).toBe(403);
    await x.m.actWithKey('cmp-upd-key', { campaign_id: id, name: 'Idem' });
    await x.m.actWithKey('cmp-upd-key', { campaign_id: id, name: 'Idem' });
    expect((await row(id)).version).toBe(2);
    expect((await x.m.act({ campaign_id: id, name: 'Y', if_version: 1 })).status).toBe(409);
  });

  it('trạng thái: chờ duyệt → 409; bị từ chối → sửa → nháp', async () => {
    const id = await draftOf(x);
    await x.mk.act('campaign.submit', { campaign_id: id });
    expect((await x.m.act({ campaign_id: id, name: 'Sửa lén' })).body.error.code).toBe('INVALID_TRANSITION');
    await x.mk.act('campaign.reject', { campaign_id: id, reason: 'Sai giọng' });
    expect((await x.m.act({ campaign_id: id, content: { text: 'Chào {ten}, bản sửa' } })).body.data.result.status).toBe('draft');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(x.m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(x.m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
