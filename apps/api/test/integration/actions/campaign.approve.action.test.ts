// Ma trận campaign.approve (TIP-037, send, bulk, agent ✗, FORCE_APPROVAL): luôn xác nhận kể cả UI (202 preview số người nhận) → duyệt đúng
// snapshot, không gửi trong request; Trợ lý xem trước → xác nhận; sales / cs / marketer (không campaign.approve) → 403; idempotency cùng
// khoá → một lần duyệt; duyệt lần hai → 409. Đua duyệt đôi: marketing-concurrency.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { draftOf, mkMatrix, type MkMatrix } from '../helpers/marketing-matrix';

let x: MkMatrix;
const pending = async () => {
  const id = await draftOf(x);
  await x.mk.act('campaign.submit', { campaign_id: id });
  return id;
};

beforeAll(async () => {
  x = await mkMatrix('campaign.approve');
}, 120_000);
afterAll(() => x?.close());

describe('campaign.approve', () => {
  it('bulk: UI cũng 202 preview (số người nhận), chưa đổi trạng thái; xác nhận → approved, chưa nhận lô', async () => {
    const id = await pending();
    const p = await x.m.act({ campaign_id: id });
    expect(p.status).toBe(202);
    expect(p.body.data.preview).toMatchObject({ risk: 'send', count: 1 });
    expect((await x.mk.get(`/campaigns/${id}`)).body.data.status).toBe('pending_approval');
    const ok = await x.mk.confirmed('campaign.approve', { campaign_id: id });
    expect(ok.status, JSON.stringify(ok.body)).toBe(200);
    expect(ok.body.data.result).toMatchObject({ status: 'approved', recipients: 1 });
    expect((await x.mk.recipients(id)).every((r) => !r.claimedAt)).toBe(true);
  });

  it('Trợ lý: preview → người bấm xác nhận', async () => {
    const id = await pending();
    const { preview, done } = await x.m.confirm({ campaign_id: id });
    expect(preview.count).toBe(1);
    expect(done.body.data.result.status).toBe('approved');
  });

  it('sales / cs 403; idempotency cùng khoá → một lần duyệt; duyệt lần hai → 409', async () => {
    const id = await pending();
    expect((await x.m.act({ campaign_id: id }, x.m.sales)).status).toBe(403);
    expect((await x.m.act({ campaign_id: id }, x.m.cs)).status).toBe(403);
    expect((await x.mk.confirmed('campaign.approve', { campaign_id: id })).status).toBe(200);
    expect((await x.mk.confirmed('campaign.approve', { campaign_id: id })).body.error.code).toBe('INVALID_TRANSITION');
    expect(await (await x.m.db()).campaignEvent.count({ where: { campaignId: id, kind: 'approved' } })).toBe(1);
  });

  it('không agentGrantable, không khai undo (gửi hàng loạt không thu hồi được)', () => {
    expect(x.m.def.agentGrantable).toBe(false);
    expect(x.m.def.bulk).toBe(true);
    expect(x.m.def.undo).toBeUndefined();
  });
});
