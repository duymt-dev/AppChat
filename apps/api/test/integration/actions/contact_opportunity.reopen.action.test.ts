// Ma trận contact_opportunity.reopen (TIP-026c §2): Thua → Đủ điều kiện, xoá lost_reason / closed_at; chưa Thua → 409; hoàn tác về Thua.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let contact = '';
let opp = '';

beforeAll(async () => {
  m = await matrix('contact_opportunity.reopen');
  contact = (await m.seed('contact.create', { full_name: 'Khách ma trận', phone: '0909400023' })).contact_id;
  opp = (await m.seed('contact_opportunity.create', { contact_id: contact, title: 'Mở lại' })).opportunity_id;
}, 120_000);
afterAll(() => m?.close());

describe('contact_opportunity.reopen', () => {
  it('chưa Thua → 409; Thua → Đủ điều kiện, lý do / closed_at xoá; hoàn tác về Thua', async () => {
    expect((await m.act({ opportunity_id: opp })).status).toBe(409);
    await m.seed('contact_opportunity.mark_lost', { opportunity_id: opp, lost_reason: 'no_need' });
    const r = await m.act({ opportunity_id: opp });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const db = await m.db();
    expect(await db.contactOpportunity.findUniqueOrThrow({ where: { id: opp } })).toMatchObject({ stage: 'qualified', lostReason: null, closedAt: null });
    expect((await m.undo(r.body.data.action_log_id)).status).toBe(200);
    expect((await db.contactOpportunity.findUniqueOrThrow({ where: { id: opp } })).stage).toBe('lost');
  });

  it('nguồn assistant: preview rồi xác nhận', async () => {
    const { preview, done } = await m.confirm({ opportunity_id: opp });
    expect(preview.risk).toBe('write');
    expect(done.status).toBe(200);
  });

  it('sales (own) 404; ô không áp dụng có lý do', async () => {
    expect((await m.act({ opportunity_id: opp }, m.sales)).status).toBe(404);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
