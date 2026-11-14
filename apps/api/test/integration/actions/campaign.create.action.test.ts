// Ma trận campaign.create (TIP-037, write, undo 24h, agent ✗): nháp theo khách / phân khúc; preview Trợ lý có số người nhận gửi được →
// xác nhận → hoàn tác xoá mềm nháp; sales / cs → 403; khách ngoài scope → 404; idempotency cùng khoá → một nháp; nháp đã gửi duyệt → hoàn tác 409.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { na } from '../helpers/action-matrix';
import { mkMatrix, type MkMatrix } from '../helpers/marketing-matrix';

let x: MkMatrix;
let k: string;
const input = (name: string, contacts = [k]) => ({ name, channel: 'zalo', account_id: x.zalo, contact_ids: contacts, content: { text: 'Chào {ten}' } });

beforeAll(async () => {
  x = await mkMatrix('campaign.create');
  k = await x.mk.contact({ zaloAccount: x.zalo });
}, 120_000);
afterAll(() => x?.close());

describe('campaign.create', () => {
  it('preview Trợ lý (người nhận gửi được) → xác nhận nháp → hoàn tác xoá mềm', async () => {
    const { preview, done } = await x.m.confirm(input('Tri ân'));
    expect(preview).toMatchObject({ risk: 'write', count: 1, changes: [{ entity: 'campaign', after: { name: 'Tri ân', status: 'draft', reachable: 1 } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    const id = done.body.data.result.campaign_id;
    expect((await x.mk.get(`/campaigns/${id}`)).body.data).toMatchObject({ status: 'draft', est_recipients: 1 });
    expect((await x.m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await x.mk.get(`/campaigns/${id}`)).status).toBe(404);
  });

  it('sales / cs 403; khách ngoài scope (marketer CRM own) → 404; idempotency cùng khoá → một nháp', async () => {
    expect((await x.m.act(input('S'), x.m.sales)).status).toBe(403);
    expect((await x.m.act(input('C'), x.m.cs)).status).toBe(403);
    const key = (await x.mk.act('role.create', { name: 'Marketer', permissions: ['crm.view', 'campaign.view', 'campaign.manage'], data_scope: { inbox: 'own', crm: 'own', sales: 'own', booking: 'own', support: 'own', insights: 'own' } })).body.data.result.key;
    const marketer = await x.m.h.member(key);
    expect((await x.m.act(input('Ngoài scope'), marketer)).status).toBe(404);
    await x.m.actWithKey('cmp-create-key', input('Một lần'));
    await x.m.actWithKey('cmp-create-key', input('Một lần'));
    expect(await (await x.m.db()).campaign.count({ where: { name: 'Một lần' } })).toBe(1);
  });

  it('trạng thái: nháp đã gửi duyệt → hoàn tác tạo 409', async () => {
    const r = await x.m.act(input('Đã gửi duyệt'));
    await x.mk.act('campaign.submit', { campaign_id: r.body.data.result.campaign_id });
    expect((await x.m.undo(r.body.data.action_log_id)).status).toBe(409);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(x.m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
