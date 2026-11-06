// Ma trận campaign.resend_unread (TIP-037, write, undo 24h): tạo NHÁP mới cho người đã gửi chưa có bằng chứng đọc / trả lời (không gửi);
// preview Trợ lý → xác nhận → hoàn tác xoá mềm nháp; sales / cs → 403; idempotency cùng khoá → một nháp; trạng thái: chưa chạy → 409,
// nháp gửi lại đã rời trạng thái nháp → hoàn tác 409.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { na } from '../helpers/action-matrix';
import { mkMatrix, sentCampaign, type MkMatrix } from '../helpers/marketing-matrix';

let x: MkMatrix;
let src: string;
const resends = async () => (await x.m.db()).campaign.count({ where: { name: { endsWith: '· gửi lại' }, deletedAt: null } });

beforeAll(async () => {
  x = await mkMatrix('campaign.resend_unread');
  src = await sentCampaign(x);
}, 120_000);
afterAll(() => x?.close());

describe('campaign.resend_unread', () => {
  it('preview Trợ lý (nháp mới, Zalo không có xác nhận đọc) → xác nhận nháp → hoàn tác xoá mềm', async () => {
    const { preview, done } = await x.m.confirm({ campaign_id: src });
    expect(preview).toMatchObject({ risk: 'write', count: 1, warnings: ['no_read_receipt'] });
    expect(done.body.data.result).toMatchObject({ est_recipients: 1, read_evidence: false });
    const id = done.body.data.result.campaign_id;
    expect((await x.mk.get(`/campaigns/${id}`)).body.data.status).toBe('draft');
    expect((await x.m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await x.mk.get(`/campaigns/${id}`)).status).toBe(404);
  });

  it('sales / cs 403; idempotency cùng khoá → một nháp', async () => {
    expect((await x.m.act({ campaign_id: src }, x.m.sales)).status).toBe(403);
    expect((await x.m.act({ campaign_id: src }, x.m.cs)).status).toBe(403);
    const n = await resends();
    await x.m.actWithKey('cmp-resend-key', { campaign_id: src });
    await x.m.actWithKey('cmp-resend-key', { campaign_id: src });
    expect(await resends()).toBe(n + 1);
  });

  it('trạng thái: chiến dịch chưa chạy → 409; nháp gửi lại đã rời nháp → hoàn tác 409', async () => {
    const { id } = await x.mk.campaign({ contacts: [await x.mk.contact({ zaloAccount: x.zalo })], account: x.zalo, approve: true });
    expect((await x.m.act({ campaign_id: id })).status).toBe(409);
    const r = await x.m.act({ campaign_id: src });
    // Người nhận vẫn trong khoá 48 giờ → nháp gửi lại chưa gửi duyệt được; huỷ nháp cũng làm nó rời trạng thái nháp.
    expect((await x.mk.act('campaign.cancel', { campaign_id: r.body.data.result.campaign_id })).status).toBe(200);
    expect((await x.m.undo(r.body.data.action_log_id)).status).toBe(409);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(x.m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
