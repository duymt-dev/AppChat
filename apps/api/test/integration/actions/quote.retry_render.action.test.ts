// Ma trận quote.retry_render (TIP-028b §1): PDF báo giá đã gửi render lỗi (`render_failed`) → thế hệ render mới. 403 cs · sales own → 404
// · id lạ 404; chưa lỗi (đang chờ) → 409; báo giá đã chốt → 409; preview Trợ lý → xác nhận. Không undo, không bulk, không cấp agent.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let q = '';
let lan = '';
const failed = async (id: string) => (await m.db()).documentRender.updateMany({ where: { kind: 'quote', documentId: id }, data: { status: 'render_failed', error: 'RENDER_FAILED' } });

beforeAll(async () => {
  m = await matrix('quote.retry_render');
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan TL', phone: '0909470101', email: 'lan.tl@example.com' })).contact_id;
  const db = await m.db();
  await db.channelAccount.create({ data: { id: '0190f000-0000-7000-8000-0000000e0b11', type: 'email', name: 'cskh@spa.vn', externalId: 'cskh@spa.vn', status: 'connected', settings: {} } });
  q = (await m.seed('quote.create', { contact_id: lan, items: [{ name: 'HIFU', qty: 1, unit_price: '1500000', tax_rate: 8 }] })).quote_id;
  await m.seed('quote.send', { quote_id: q, channel: 'email' });
}, 120_000);
afterAll(() => m?.close());

describe('quote.retry_render', () => {
  it('403 thiếu quyền · ngoài scope (sales own) → 404 · id lạ → 404', async () => {
    expect((await m.act({ quote_id: q }, m.cs)).status).toBe(403);
    expect((await m.act({ quote_id: q }, m.sales)).status).toBe(404);
    expect((await m.act({ quote_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('đang chờ render → 409 render: pending_render', async () => {
    expect((await m.act({ quote_id: q })).body.error).toMatchObject({ code: 'INVALID_STATE', fields: { render: 'pending_render' } });
  });

  it('render_failed → preview Trợ lý → xác nhận: thế hệ 2, pending_render, outbox render_requested', async () => {
    await failed(q);
    const { preview, done } = await m.confirm({ quote_id: q });
    expect(preview).toMatchObject({ risk: 'write', changes: [{ entity: 'quote', id: q, before: { render: 'render_failed' }, after: { render: 'pending_render' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(done.body.data.result).toEqual({ quote_id: q, render: 'pending_render' });
    const db = await m.db();
    expect(await db.documentRender.findFirstOrThrow({ where: { kind: 'quote', documentId: q } })).toMatchObject({ status: 'pending_render', generation: 2, error: null });
    expect(await db.outboxEvent.count({ where: { topic: 'document.render_requested' } })).toBe(2);
  });

  it('báo giá đã chốt → 409 theo trạng thái báo giá', async () => {
    await failed(q);
    await m.seed('quote.mark_accepted', { quote_id: q });
    expect((await m.act({ quote_id: q })).body.error).toMatchObject({ code: 'INVALID_STATE', fields: { status: 'accepted' } });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
