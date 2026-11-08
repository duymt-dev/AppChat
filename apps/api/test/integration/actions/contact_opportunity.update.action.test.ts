// Ma trận contact_opportunity.update (TIP-026b §2): CAS if_version; won không đổi giai đoạn khách; hoàn tác trả bản trước.
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
  it('lệch version 409; won → giai đoạn khách giữ nguyên; hoàn tác về open', async () => {
    expect((await m.act({ opportunity_id: opp, if_version: 5, patch: { stage: 'won' } })).status).toBe(409);
    const before = (await (await m.db()).contact.findUniqueOrThrow({ where: { id: contact } })).stage;
    const r = await m.act({ opportunity_id: opp, if_version: 1, patch: { stage: 'won' } });
    expect(r.body.data.result.version).toBe(2);
    expect((await (await m.db()).contact.findUniqueOrThrow({ where: { id: contact } })).stage).toBe(before);
    expect((await m.undo(r.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).contactOpportunity.findUniqueOrThrow({ where: { id: opp } })).stage).toBe('open');
  });
  it('sales 404', async () => {
    expect((await m.act({ opportunity_id: opp, patch: { need: 'x' } }, m.sales)).status).toBe(404);
  });
  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
