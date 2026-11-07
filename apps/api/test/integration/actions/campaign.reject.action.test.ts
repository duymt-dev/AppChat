// Ma trận campaign.reject (TIP-037, write, campaign.approve): từ chối kèm lý do; preview Trợ lý → xác nhận; sales / cs → 403; lý do rỗng → 422;
// idempotency cùng khoá → một sự kiện từ chối; trạng thái: nháp → 409.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { na } from '../helpers/action-matrix';
import { draftOf, mkMatrix, type MkMatrix } from '../helpers/marketing-matrix';

let x: MkMatrix;
const pending = async () => {
  const id = await draftOf(x);
  await x.mk.act('campaign.submit', { campaign_id: id });
  return id;
};

beforeAll(async () => {
  x = await mkMatrix('campaign.reject');
}, 120_000);
afterAll(() => x?.close());

describe('campaign.reject', () => {
  it('preview Trợ lý → xác nhận → rejected + lý do', async () => {
    const id = await pending();
    const { done } = await x.m.confirm({ campaign_id: id, reason: 'Sai giọng văn' });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await x.mk.get(`/campaigns/${id}`)).body.data).toMatchObject({ status: 'rejected' });
  });

  it('sales / cs 403; lý do rỗng 422; idempotency cùng khoá → một sự kiện', async () => {
    const id = await pending();
    expect((await x.m.act({ campaign_id: id, reason: 'x' }, x.m.sales)).status).toBe(403);
    expect((await x.m.act({ campaign_id: id, reason: 'x' }, x.m.cs)).status).toBe(403);
    expect((await x.m.act({ campaign_id: id, reason: '' })).status).toBe(422);
    await x.m.actWithKey('cmp-rej-key', { campaign_id: id, reason: 'Thiếu CTA' });
    await x.m.actWithKey('cmp-rej-key', { campaign_id: id, reason: 'Thiếu CTA' });
    expect(await (await x.m.db()).campaignEvent.count({ where: { campaignId: id, kind: 'rejected' } })).toBe(1);
  });

  it('trạng thái: nháp → 409', async () => {
    expect((await x.m.act({ campaign_id: await draftOf(x), reason: 'x' })).body.error.code).toBe('INVALID_TRANSITION');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(x.m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(x.m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
