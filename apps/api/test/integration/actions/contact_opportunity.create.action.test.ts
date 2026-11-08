// Ma trận contact_opportunity.create (TIP-026b §1.3): crm.edit (+ quote.create cho tiền), write, agentGrantable=false, undo 24h —
// giá trị kỳ vọng, không doanh thu. Tạo ở won → 422; CS (không quote.create) ghi tiền → 403; hoàn tác → lưu trữ.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let contact = '';

beforeAll(async () => {
  m = await matrix('contact_opportunity.create');
  contact = (await m.seed('contact.create', { full_name: 'Khách ma trận', phone: '0909400007' })).contact_id;
}, 120_000);
afterAll(() => m?.close());

describe('contact_opportunity.create', () => {
  it('Owner → v1; won khi tạo 422; hoàn tác lưu trữ', async () => {
    const r = await m.act({ contact_id: contact, title: 'Gói', amount_vnd: '5000000' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect((await m.act({ contact_id: contact, title: 'x', stage: 'won' })).status).toBe(422);
    expect((await m.undo(r.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).contactOpportunity.findUniqueOrThrow({ where: { id: r.body.data.result.opportunity_id } })).archivedAt).not.toBeNull();
  });
  it('CS ghi tiền → 403 (không thêm quyền); không tiền → 200; sales 404', async () => {
    await (await m.db()).contact.update({ where: { id: contact }, data: { ownerUserId: m.cs.id } });
    expect((await m.act({ contact_id: contact, title: 'x', amount_vnd: '1' }, m.cs)).status).toBe(403);
    expect((await m.act({ contact_id: contact, title: 'Không tiền' }, m.cs)).status).toBe(200);
    expect((await m.act({ contact_id: contact, title: 'x' }, m.sales)).status).toBe(404);
  });
  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
