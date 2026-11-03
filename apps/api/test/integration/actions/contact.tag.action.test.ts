// Ma trận contact.tag (TIP-023b): thẻ trước / sau (thẻ chưa có → cảnh báo tạo mới); undo gỡ; sales own → 404 (không lộ tồn tại); id lạ → 404.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let k: { contact_id: string; code: string };

beforeAll(async () => {
  m = await matrix('contact.tag');
  k = await m.seed('contact.create', { full_name: 'Chị Lan Anh', phone: '0909440001' });
}, 120_000);
afterAll(() => m?.close());

describe('contact.tag', () => {
  it('403 / scope / id lạ', async () => {
    expect((await m.act({ contact_id: k.contact_id, tag: 'X', op: 'add' }, m.sales)).status).toBe(404);
    expect((await m.act({ contact_id: '0190f000-0000-7000-8000-00000000beef', tag: 'X', op: 'add' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ contact_id: k.contact_id, tag: 'Khách quen', op: 'add' });
    expect(preview).toEqual({ summary: `${k.code} · Chị Lan Anh · Khách quen`, risk: 'write', changes: [{ entity: 'contact', id: k.contact_id, before: { tags: [] }, after: { tags: ['Khách quen'] } }], warnings: ['new_tag:Khách quen'] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(done.body.data.result.tags).toEqual(['Khách quen']);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect(await (await m.db()).contactTag.count({ where: { contactId: k.contact_id } })).toBe(0);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
