// Ma trận contact_opportunity.update (TIP-026b §2, TIP-026c §2): CAS if_version; không đổi giai đoạn (use_set_stage); hoàn tác trả bản trước.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let contact = '';
let opp = '';

beforeAll(async () => {
  m = await matrix('contact_opportunity.update');
  contact = (await m.seed('contact.create', { full_name: 'Khách ma trận', phone: '0909400008' })).contact_id;
  opp = (await m.seed('contact_opportunity.create', { contact_id: contact, title: 'Cơ hội' })).opportunity_id;
}, 120_000);
afterAll(() => m?.close());

describe('contact_opportunity.update', () => {
  it('lệch version 409; patch stage → 422 use_set_stage; hoàn tác trả tên trước', async () => {
    expect((await m.act({ opportunity_id: opp, if_version: 5, patch: { need: 'x' } })).status).toBe(409);
    const st = await m.act({ opportunity_id: opp, patch: { stage: 'won' } });
    expect([st.status, st.body.error.fields]).toEqual([422, { 'patch.stage': 'use_set_stage' }]);
    const r = await m.act({ opportunity_id: opp, if_version: 1, patch: { title: 'Cơ hội đổi tên' } });
    expect(r.body.data.result.version).toBe(2);
    expect((await m.undo(r.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).contactOpportunity.findUniqueOrThrow({ where: { id: opp } }))).toMatchObject({ title: 'Cơ hội', stage: 'lead' });
  });
  it('sales 404', async () => {
    expect((await m.act({ opportunity_id: opp, patch: { need: 'x' } }, m.sales)).status).toBe(404);
  });
  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
