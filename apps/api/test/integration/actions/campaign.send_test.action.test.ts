// Ma trận campaign.send_test (TIP-037, send, agent ✗): thư thử chỉ tới email đăng nhập của người bấm qua tài khoản email đang kết nối (hàng gửi
// chung — không tính số đo / khoá 48 giờ); Trợ lý chỉ xem trước (send) → xác nhận; sales / cs → 403; không có tài khoản email → 409.
// Gửi thật qua Brevo / SMTP: chưa nghiệm thu với provider thật.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { na } from '../helpers/action-matrix';
import { draftOf, mkMatrix, type MkMatrix } from '../helpers/marketing-matrix';

let x: MkMatrix;
let id: string;
const tests = async () => (await x.m.db()).campaignEvent.count({ where: { campaignId: id, kind: 'test_sent' } });

beforeAll(async () => {
  x = await mkMatrix('campaign.send_test');
  id = await draftOf(x);
}, 120_000);
afterAll(() => x?.close());

describe('campaign.send_test', () => {
  it('trạng thái: chưa có tài khoản email kết nối → 409 connector', async () => {
    const r = await x.m.act({ campaign_id: id });
    expect(r.status).toBe(409);
    expect(r.body.error.fields).toEqual({ connector: 'email' });
  });

  it('preview Trợ lý (send, 1 người — chính mình) → xác nhận → sent_to = email người bấm, không tính người nhận', async () => {
    await x.mk.account('email', 'Email gửi thử');
    const { preview, done } = await x.m.confirm({ campaign_id: id });
    expect(preview).toMatchObject({ risk: 'send', count: 1 });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    const me = await x.m.h.platform.user.findUniqueOrThrow({ where: { id: x.m.h.user }, select: { email: true } });
    expect(done.body.data.result.sent_to).toBe(me.email);
    expect(await tests()).toBe(1);
    expect(await x.mk.recipients(id)).toHaveLength(0);
  });

  it('sales / cs 403; idempotency cùng khoá → một thư thử', async () => {
    expect((await x.m.act({ campaign_id: id }, x.m.sales)).status).toBe(403);
    expect((await x.m.act({ campaign_id: id }, x.m.cs)).status).toBe(403);
    const n = await tests();
    await x.m.actWithKey('cmp-test-key', { campaign_id: id });
    await x.m.actWithKey('cmp-test-key', { campaign_id: id });
    expect(await tests()).toBe(n + 1);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(x.m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(x.m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
