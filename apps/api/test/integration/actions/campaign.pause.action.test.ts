// Ma trận campaign.pause (TIP-037, write): chiến dịch đang chạy → tạm dừng (người nhận chưa gọi kênh giữ lại); preview Trợ lý → xác nhận;
// sales / cs → 403; idempotency cùng khoá → một sự kiện; trạng thái: nháp → 409.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { na } from '../helpers/action-matrix';
import { draftOf, mkMatrix, sentCampaign, type MkMatrix } from '../helpers/marketing-matrix';

let x: MkMatrix;

beforeAll(async () => {
  x = await mkMatrix('campaign.pause');
}, 120_000);
afterAll(() => x?.close());

describe('campaign.pause', () => {
  it('preview Trợ lý (running → paused) → xác nhận', async () => {
    const id = await sentCampaign(x);
    const { preview, done } = await x.m.confirm({ campaign_id: id });
    expect(preview).toMatchObject({ changes: [{ entity: 'campaign', before: { status: 'running' }, after: { status: 'paused' } }] });
    expect(done.body.data.result.status).toBe('paused');
  });

  it('sales / cs 403; idempotency cùng khoá → một sự kiện tạm dừng', async () => {
    const id = await sentCampaign(x);
    expect((await x.m.act({ campaign_id: id }, x.m.sales)).status).toBe(403);
    expect((await x.m.act({ campaign_id: id }, x.m.cs)).status).toBe(403);
    await x.m.actWithKey('cmp-pause-key', { campaign_id: id });
    await x.m.actWithKey('cmp-pause-key', { campaign_id: id });
    expect(await (await x.m.db()).campaignEvent.count({ where: { campaignId: id, kind: 'paused' } })).toBe(1);
  });

  it('trạng thái: nháp → 409', async () => {
    expect((await x.m.act({ campaign_id: await draftOf(x) })).body.error.code).toBe('INVALID_TRANSITION');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(x.m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(x.m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
