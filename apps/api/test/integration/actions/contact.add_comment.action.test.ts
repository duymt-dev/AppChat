// Ma trận contact.add_comment (TIP-026b §2): crm.edit, write, agentGrantable=false, undo 24h — bình luận nội bộ (kind comment), không
// tin ra kênh. Trợ lý → preview; hoàn tác lần hai không thành công; sales ngoài scope 404.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let contact = '';

beforeAll(async () => {
  m = await matrix('contact.add_comment');
  contact = (await m.seed('contact.create', { full_name: 'Khách ma trận', phone: '0909400002' })).contact_id;
}, 120_000);
afterAll(() => m?.close());

describe('contact.add_comment', () => {
  it('Trợ lý → preview rồi xác nhận → kind comment', async () => {
    const { preview, done } = await m.confirm({ contact_id: contact, body: 'Bình luận ma trận' });
    expect(preview.changes[0].entity).toBe('contact_comment');
    expect(done.body.data.result.kind).toBe('comment');
  });
  it('hoàn tác lần hai không thành công; sales 404', async () => {
    const r = await m.act({ contact_id: contact, body: 'y' });
    expect((await m.undo(r.body.data.action_log_id)).status).toBe(200);
    expect((await m.undo(r.body.data.action_log_id)).status).not.toBe(200);
    expect((await m.act({ contact_id: contact, body: 'x' }, m.sales)).status).toBe(404);
  });
  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
