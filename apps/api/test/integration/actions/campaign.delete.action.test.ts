// Ma trận campaign.delete (TIP-037, delete): xoá mềm nháp / bị từ chối / đã huỷ; Trợ lý chỉ xem trước → xác nhận; sales / cs → 403;
// idempotency cùng khoá → một lần xoá; trạng thái: đã duyệt → 409.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { na } from '../helpers/action-matrix';
import { draftOf, mkMatrix, type MkMatrix } from '../helpers/marketing-matrix';

let x: MkMatrix;

beforeAll(async () => {
  x = await mkMatrix('campaign.delete');
}, 120_000);
afterAll(() => x?.close());

describe('campaign.delete', () => {
  it('preview Trợ lý (risk delete) → xác nhận → không còn trong danh sách', async () => {
    const id = await draftOf(x);
    const { preview, done } = await x.m.confirm({ campaign_id: id });
    expect(preview.risk).toBe('delete');
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await x.mk.get(`/campaigns/${id}`)).status).toBe(404);
  });

  it('sales / cs 403; idempotency cùng khoá → 200 hai lần, một lần xoá', async () => {
    const id = await draftOf(x);
    expect((await x.m.act({ campaign_id: id }, x.m.sales)).status).toBe(403);
    expect((await x.m.act({ campaign_id: id }, x.m.cs)).status).toBe(403);
    const a = await x.m.actWithKey('cmp-del-key', { campaign_id: id });
    const b = await x.m.actWithKey('cmp-del-key', { campaign_id: id });
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(await (await x.m.db()).actionLog.count({ where: { actionId: 'campaign.delete', status: 'succeeded', input: { path: ['campaign_id'], equals: id } } })).toBe(1);
  });

  it('trạng thái: đã duyệt → 409', async () => {
    const { id } = await x.mk.campaign({ contacts: [await x.mk.contact({ zaloAccount: x.zalo })], account: x.zalo, approve: true });
    expect((await x.m.act({ campaign_id: id })).status).toBe(409);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(x.m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(x.m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
