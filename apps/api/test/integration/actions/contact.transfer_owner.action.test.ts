// Ma trận contact.transfer_owner (TIP-023b): người phụ trách cũ / mới theo tên + số hội thoại đang mở chuyển theo; undo trả người cũ; sales không có crm.reassign → 403; id lạ → 404.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let k: { contact_id: string; code: string };

beforeAll(async () => {
  m = await matrix('contact.transfer_owner');
  k = await m.seed('contact.create', { full_name: 'Chị Lan Anh', phone: '0909440001' });
  await m.h.platform.user.update({ where: { id: m.sales.id }, data: { name: 'Minh Sales' } });
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  await m.conv({ contactId: k.contact_id });
}, 120_000);
afterAll(() => m?.close());

describe('contact.transfer_owner', () => {
  it('403 / scope / id lạ', async () => {
    expect((await m.act({ contact_id: k.contact_id, to_user_id: m.sales.id, move: { conversations: false, quotes: false, appointments: false } }, m.sales)).status).toBe(403);
    expect((await m.act({ contact_id: '0190f000-0000-7000-8000-00000000beef', to_user_id: m.sales.id, move: { conversations: false, quotes: false, appointments: false } })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ contact_id: k.contact_id, to_user_id: m.sales.id, move: { conversations: true, quotes: false, appointments: false } });
    expect(preview).toEqual({ summary: `${k.code} · Chị Lan Anh · Minh Sales`, risk: 'write', count: 1, changes: [{ entity: 'contact', id: k.contact_id, before: { owner: 'Chủ Spa' }, after: { owner: 'Minh Sales' } }, { entity: 'conversation', after: { assignee: 'Minh Sales', count: 1 } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await (await m.db()).contact.findUniqueOrThrow({ where: { id: k.contact_id } })).ownerUserId).toBe(m.sales.id);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).contact.findUniqueOrThrow({ where: { id: k.contact_id } })).ownerUserId).toBe(m.h.user);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
