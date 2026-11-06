// Ma trận campaign.resume (TIP-037, write): tạm dừng → chạy tiếp cùng snapshot đã duyệt; preview Trợ lý → xác nhận; sales / cs → 403;
// idempotency cùng khoá → một sự kiện; trạng thái: đang chạy → 409.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { na } from '../helpers/action-matrix';
import { mkMatrix, sentCampaign, type MkMatrix } from '../helpers/marketing-matrix';

let x: MkMatrix;
const paused = async () => {
  const id = await sentCampaign(x);
  await x.mk.act('campaign.pause', { campaign_id: id });
  return id;
};

beforeAll(async () => {
  x = await mkMatrix('campaign.resume');
}, 120_000);
afterAll(() => x?.close());

describe('campaign.resume', () => {
  it('preview Trợ lý (paused → running) → xác nhận', async () => {
    const id = await paused();
    const { preview, done } = await x.m.confirm({ campaign_id: id });
    expect(preview).toMatchObject({ changes: [{ entity: 'campaign', before: { status: 'paused' }, after: { status: 'running' } }] });
    expect(done.body.data.result.status).toBe('running');
  });

  it('sales / cs 403; idempotency cùng khoá → một sự kiện chạy tiếp', async () => {
    const id = await paused();
    expect((await x.m.act({ campaign_id: id }, x.m.sales)).status).toBe(403);
    expect((await x.m.act({ campaign_id: id }, x.m.cs)).status).toBe(403);
    await x.m.actWithKey('cmp-resume-key', { campaign_id: id });
    await x.m.actWithKey('cmp-resume-key', { campaign_id: id });
    expect(await (await x.m.db()).campaignEvent.count({ where: { campaignId: id, kind: 'resumed' } })).toBe(1);
  });

  it('trạng thái: đang chạy → 409', async () => {
    expect((await x.m.act({ campaign_id: await sentCampaign(x) })).body.error.code).toBe('INVALID_TRANSITION');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(x.m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(x.m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
