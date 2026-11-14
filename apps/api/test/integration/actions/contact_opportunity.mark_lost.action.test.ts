// Ma trận contact_opportunity.mark_lost (TIP-026c §2, AC5): lý do bắt buộc 4 mã; báo giá ĐÃ GỬI của cơ hội → rejected cùng transaction, nháp giữ;
// preview liệt kê báo giá bị từ chối + cảnh báo; Thua lặp → không đổi; hoàn tác chỉ đảo cơ hội (báo giá giữ rejected); có đơn sống → 409.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let contact = '';
const line = { name: 'Gói', qty: 1, unit_price: '1000000', tax_rate: 0 };

beforeAll(async () => {
  m = await matrix('contact_opportunity.mark_lost');
  contact = (await m.seed('contact.create', { full_name: 'Khách ma trận', phone: '0909400022', email: 'mx.lost@example.com' })).contact_id;
  const { uuidv7 } = await import('@appchat/core');
  await (await m.db()).channelAccount.create({ data: { id: uuidv7(), type: 'email', name: 'cskh@spa.vn', externalId: 'cskh@spa.vn', status: 'connected', settings: {} } });
}, 120_000);
afterAll(() => m?.close());

const newOpp = async () => (await m.seed('contact_opportunity.create', { contact_id: contact, title: 'Thua', stage: 'quote' })).opportunity_id as string;

describe('contact_opportunity.mark_lost', () => {
  it('báo giá sent → rejected, nháp giữ; preview liệt kê + cảnh báo; Thua 0%; lặp không đổi; hoàn tác chỉ đảo cơ hội', async () => {
    const opp = await newOpp();
    const sent = (await m.seed('quote.create', { contact_id: contact, items: [line], opportunity_id: opp })).quote_id;
    await m.seed('quote.send', { quote_id: sent, channel: 'email' });
    const draft = (await m.seed('quote.create', { contact_id: contact, items: [line], opportunity_id: opp })).quote_id;
    const { preview, done } = await m.confirm({ opportunity_id: opp, lost_reason: 'price' });
    expect(preview.warnings).toEqual(['lost_rejects_quotes']);
    expect(preview.changes.filter((c: { entity: string }) => c.entity === 'quote').map((c: { id: string }) => c.id)).toEqual([sent]);
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(done.body.data.result).toMatchObject({ stage: 'lost', rejected_quote_ids: [sent] });
    const db = await m.db();
    expect((await db.quote.findUniqueOrThrow({ where: { id: sent } })).status).toBe('rejected');
    expect((await db.quote.findUniqueOrThrow({ where: { id: draft } })).status).toBe('draft');
    expect((await db.contactOpportunity.findUniqueOrThrow({ where: { id: opp } })).lostReason).toBe('price');
    expect((await m.act({ opportunity_id: opp, lost_reason: 'price' })).body.data.result.rejected_quote_ids).toEqual([]);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await db.contactOpportunity.findUniqueOrThrow({ where: { id: opp } })).stage).toBe('quote');
    expect((await db.quote.findUniqueOrThrow({ where: { id: sent } })).status).toBe('rejected');
  });

  it('thiếu lý do → 422; có đơn sống → 409 has_live_document', async () => {
    const opp = await newOpp();
    expect((await m.act({ opportunity_id: opp })).status).toBe(422);
    await m.seed('order.create', { contact_id: contact, items: [line], opportunity_id: opp });
    const r = await m.act({ opportunity_id: opp, lost_reason: 'competitor' });
    expect([r.status, r.body.error.fields]).toEqual([409, { opportunity_id: 'has_live_document' }]);
  });

  it('sales (own) 404; ô không áp dụng có lý do', async () => {
    expect((await m.act({ opportunity_id: await newOpp(), lost_reason: 'price' }, m.sales)).status).toBe(404);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
