// Ma trận contact_opportunity.set_stage (TIP-026c §2): crm.edit + scope, write, agentGrantable (DC-922), undo 24h. Tiến / lùi tay; won thiếu
// chứng từ → 422 won_needs_document; lost không nhận (dùng mark_lost); lệch version 409; nguồn assistant → preview + xác nhận; giai đoạn khách
// nâng theo (Đủ điều kiện → potential); hoàn tác về giai đoạn trước; sales (own) 404.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let contact = '';
let opp = '';

beforeAll(async () => {
  m = await matrix('contact_opportunity.set_stage');
  contact = (await m.seed('contact.create', { full_name: 'Khách ma trận', phone: '0909400021' })).contact_id;
  opp = (await m.seed('contact_opportunity.create', { contact_id: contact, title: 'Cơ hội' })).opportunity_id;
}, 120_000);
afterAll(() => m?.close());

describe('contact_opportunity.set_stage', () => {
  it('tiến tay → khách nâng theo; cùng giai đoạn → không đổi version; lệch version 409; hoàn tác về Lead mới', async () => {
    const r = await m.act({ opportunity_id: opp, stage: 'qualified', if_version: 1 });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ stage: 'qualified', version: 2 });
    expect((await (await m.db()).contact.findUniqueOrThrow({ where: { id: contact } })).stage).toBe('potential');
    expect((await m.act({ opportunity_id: opp, stage: 'qualified' })).body.data.result.version).toBe(2);
    expect((await m.act({ opportunity_id: opp, stage: 'demo', if_version: 1 })).status).toBe(409);
    expect((await m.undo(r.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).contactOpportunity.findUniqueOrThrow({ where: { id: opp } })).stage).toBe('lead');
  });

  it('won thiếu chứng từ → 422 won_needs_document; lost → 422 (dùng mark_lost)', async () => {
    const w = await m.act({ opportunity_id: opp, stage: 'won' });
    expect([w.status, w.body.error.fields]).toEqual([422, { stage: 'won_needs_document' }]);
    expect((await m.act({ opportunity_id: opp, stage: 'lost' })).status).toBe(422);
  });

  it('nguồn assistant: preview giai đoạn + xác suất trước / sau rồi xác nhận', async () => {
    const { preview, done } = await m.confirm({ opportunity_id: opp, stage: 'demo' });
    expect(preview).toMatchObject({ risk: 'write', changes: [{ entity: 'contact_opportunity', before: { stage: 'lead', probability: 10 }, after: { stage: 'demo', probability: 50 } }] });
    expect(done.status).toBe(200);
  });

  it('sales (own) 404; ô không áp dụng có lý do', async () => {
    expect((await m.act({ opportunity_id: opp, stage: 'quote' }, m.sales)).status).toBe(404);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
