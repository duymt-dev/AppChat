// Ma trận campaign.submit (TIP-037, write, undo 24h): nháp → chờ duyệt + snapshot người nhận; preview Trợ lý → xác nhận → hoàn tác về nháp
// (xoá snapshot); sales / cs → 403; idempotency cùng khoá → một snapshot; trạng thái: gửi duyệt lần hai → 409; đã duyệt → hoàn tác 409.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { na } from '../helpers/action-matrix';
import { draftOf, mkMatrix, type MkMatrix } from '../helpers/marketing-matrix';

let x: MkMatrix;
const status = async (id: string) => (await (await x.m.db()).campaign.findUniqueOrThrow({ where: { id } })).status;

beforeAll(async () => {
  x = await mkMatrix('campaign.submit');
}, 120_000);
afterAll(() => x?.close());

describe('campaign.submit', () => {
  it('preview Trợ lý → xác nhận (snapshot) → hoàn tác về nháp, xoá snapshot', async () => {
    const id = await draftOf(x);
    const { preview, done } = await x.m.confirm({ campaign_id: id });
    expect(preview.risk).toBe('write');
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(await status(id)).toBe('pending_approval');
    expect(await x.mk.recipients(id)).toHaveLength(1);
    expect((await x.m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect(await status(id)).toBe('draft');
    expect(await x.mk.recipients(id)).toHaveLength(0);
  });

  it('sales / cs 403; idempotency cùng khoá → một snapshot', async () => {
    const id = await draftOf(x);
    expect((await x.m.act({ campaign_id: id }, x.m.sales)).status).toBe(403);
    expect((await x.m.act({ campaign_id: id }, x.m.cs)).status).toBe(403);
    const a = await x.m.actWithKey('cmp-sub-key', { campaign_id: id });
    const b = await x.m.actWithKey('cmp-sub-key', { campaign_id: id });
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(await x.mk.recipients(id)).toHaveLength(1);
  });

  it('trạng thái: gửi duyệt lần hai → 409; đã duyệt → hoàn tác 409', async () => {
    const id = await draftOf(x);
    const s = await x.m.act({ campaign_id: id });
    expect((await x.m.act({ campaign_id: id })).body.error.code).toBe('INVALID_TRANSITION');
    await x.mk.confirmed('campaign.approve', { campaign_id: id });
    expect((await x.m.undo(s.body.data.action_log_id)).status).toBe(409);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(x.m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
