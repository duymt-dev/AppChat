// Ma trận contact_opportunity.set_owner (TIP-026c §2): crm.reassign (hoặc phụ trách khách tự nhận); người ngoài workspace → 422; cùng người →
// không đổi version; nhóm chụp lại; hoàn tác trả người cũ; CS (không crm.reassign, không phụ trách) → 403.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let contact = '';
let opp = '';

beforeAll(async () => {
  m = await matrix('contact_opportunity.set_owner');
  contact = (await m.seed('contact.create', { full_name: 'Khách ma trận', phone: '0909400024' })).contact_id;
  opp = (await m.seed('contact_opportunity.create', { contact_id: contact, title: 'Đổi phụ trách' })).opportunity_id;
}, 120_000);
afterAll(() => m?.close());

describe('contact_opportunity.set_owner', () => {
  it('Owner giao cho sales → v+1 + lịch sử owner; lặp không đổi; hoàn tác trả người cũ', async () => {
    const db = await m.db();
    const before = (await db.contactOpportunity.findUniqueOrThrow({ where: { id: opp } })).ownerUserId;
    const r = await m.act({ opportunity_id: opp, owner_user_id: m.sales.id });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect((await db.contactOpportunity.findUniqueOrThrow({ where: { id: opp } })).ownerUserId).toBe(m.sales.id);
    expect(await db.contactOpportunityEvent.count({ where: { opportunityId: opp, kind: 'owner' } })).toBe(1);
    const v = r.body.data.result.version;
    expect((await m.act({ opportunity_id: opp, owner_user_id: m.sales.id })).body.data.result.version).toBe(v);
    expect((await m.undo(r.body.data.action_log_id)).status).toBe(200);
    expect((await db.contactOpportunity.findUniqueOrThrow({ where: { id: opp } })).ownerUserId).toBe(before);
  });

  it('người không thuộc workspace → 422; CS không quyền → 403/404', async () => {
    const { uuidv7 } = await import('@appchat/core');
    expect((await m.act({ opportunity_id: opp, owner_user_id: uuidv7() })).status).toBe(422);
    expect([403, 404]).toContain((await m.act({ opportunity_id: opp, owner_user_id: m.cs.id }, m.cs)).status);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
