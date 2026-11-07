// Ma trận campaign.cancel (TIP-037, write): huỷ chiến dịch chưa xong — người nhận chưa gọi kênh → skipped; preview Trợ lý → xác nhận; sales /
// cs → 403; idempotency cùng khoá → một sự kiện; trạng thái: đang chạy phải tạm dừng trước → 409.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { na } from '../helpers/action-matrix';
import { mkMatrix, sentCampaign, type MkMatrix } from '../helpers/marketing-matrix';

let x: MkMatrix;
const approved = async () => (await x.mk.campaign({ contacts: [await x.mk.contact({ zaloAccount: x.zalo })], account: x.zalo, approve: true })).id;

beforeAll(async () => {
  x = await mkMatrix('campaign.cancel');
}, 120_000);
afterAll(() => x?.close());

describe('campaign.cancel', () => {
  it('preview Trợ lý → xác nhận → cancelled, người nhận chưa gửi skipped', async () => {
    const id = await approved();
    const { done } = await x.m.confirm({ campaign_id: id });
    expect(done.body.data.result.status).toBe('cancelled');
    expect((await x.mk.recipients(id)).every((r) => r.status === 'skipped')).toBe(true);
  });

  it('sales / cs 403; idempotency cùng khoá → một sự kiện huỷ', async () => {
    const id = await approved();
    expect((await x.m.act({ campaign_id: id }, x.m.sales)).status).toBe(403);
    expect((await x.m.act({ campaign_id: id }, x.m.cs)).status).toBe(403);
    await x.m.actWithKey('cmp-cancel-key', { campaign_id: id });
    await x.m.actWithKey('cmp-cancel-key', { campaign_id: id });
    expect(await (await x.m.db()).campaignEvent.count({ where: { campaignId: id, kind: 'cancelled' } })).toBe(1);
  });

  it('trạng thái: đang chạy → 409 (tạm dừng trước)', async () => {
    expect((await x.m.act({ campaign_id: await sentCampaign(x) })).body.error.code).toBe('INVALID_TRANSITION');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(x.m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(x.m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
