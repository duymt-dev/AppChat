// Ma trận contact_opportunity.archive (TIP-026b §2): không xoá cứng; lưu trữ lặp không đổi version; hoàn tác bỏ lưu trữ.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let contact = '';
let opp = '';

beforeAll(async () => {
  m = await matrix('contact_opportunity.archive');
  contact = (await m.seed('contact.create', { full_name: 'Khách ma trận', phone: '0909400009' })).contact_id;
  opp = (await m.seed('contact_opportunity.create', { contact_id: contact, title: 'Lưu trữ' })).opportunity_id;
}, 120_000);
afterAll(() => m?.close());

describe('contact_opportunity.archive', () => {
  it('lưu trữ → lặp cùng version → hoàn tác → bỏ lưu trữ', async () => {
    const r = await m.act({ opportunity_id: opp, if_version: 1 });
    expect(r.body.data.result).toMatchObject({ archived: true, version: 2 });
    expect((await m.act({ opportunity_id: opp })).body.data.result.version).toBe(2);
    expect((await m.undo(r.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).contactOpportunity.findUniqueOrThrow({ where: { id: opp } })).archivedAt).toBeNull();
  });
  it('sales 404', async () => {
    expect((await m.act({ opportunity_id: opp }, m.sales)).status).toBe(404);
  });
  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
