// Ma trận contact.send_email (TIP-023b): thư độc lập tới khách (risk send) → khách · địa chỉ · tiêu đề + cảnh báo mở chuỗi email mới; địa
// chỉ sai → 422, hộp thư gửi lạ → 409, khách ngoài scope (sales own) → 404 ở preview. Idempotency theo khoá. Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { uuidv7 } from '@appchat/core';

let m: Matrix;
let lan: string;
const BOX = 'cskh@spa-matrix.vn';
const inp = (o: Record<string, string> = {}) => ({ contact_id: lan, from: BOX, to: 'lan@khach.vn', subject: 'Theo dõi', body: 'Chào chị Lan', ...o });

beforeAll(async () => {
  m = await matrix('contact.send_email');
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan', phone: '0909470101', email: 'lan@khach.vn' })).contact_id;
  await (await m.db()).channelAccount.create({ data: { id: uuidv7(), type: 'email', name: 'CSKH', externalId: BOX, status: 'connected', createdAt: m.h.clock.now() } });
}, 120_000);
afterAll(() => m?.close());

describe('contact.send_email', () => {
  it('sales ngoài scope → 404 · địa chỉ sai → 422 · hộp thư lạ → 409', async () => {
    expect((await m.act(inp(), m.sales)).status).toBe(404);
    expect((await m.act(inp({ to: 'sai' }), undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ to: 'invalid' });
    expect((await m.act(inp({ from: 'khac@spa.vn' }), undefined, { 'x-action-source': 'assistant' })).status).toBe(409);
  });

  it('preview Trợ lý → xác nhận', async () => {
    const { preview, done } = await m.confirm(inp());
    expect(preview).toEqual({
      summary: 'Chị Lan · lan@khach.vn',
      risk: 'send',
      changes: [{ entity: 'message', after: { channel: 'email', from: BOX, to: 'lan@khach.vn', subject: 'Theo dõi', body: 'Chào chị Lan' } }],
      warnings: ['new_email_thread'],
    });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
  });

  it('idempotency', async () => {
    const r = await m.actWithKey('cse-idem', inp({ subject: 'Lần 2' }));
    expect((await m.actWithKey('cse-idem', inp({ subject: 'Lần 2' }))).body.data.result).toEqual(r.body.data.result);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
