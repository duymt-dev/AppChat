// Ma trận contact.transfer_owner (TIP-023b, TIP-015d): Trợ lý luôn xin duyệt; UI chạy → kết quả phân biệt (transferred / skipped_already_owner);
// undo trả người cũ; sales không có crm.reassign → 403; id lạ → 404.
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

  it('Trợ lý → luôn xin duyệt (TIP-015d, không chạy ngay); UI chạy → kết quả phân biệt + undo; người nhận đã phụ trách → skip không undo', async () => {
    const input = { contact_id: k.contact_id, to_user_id: m.sales.id, move: { conversations: true, quotes: false, appointments: false } };
    const asst = await m.act(input, undefined, { 'x-action-source': 'assistant' });
    expect(asst.status).toBe(202);
    expect(asst.body.data.status).toBe('approval_required');
    expect((await (await m.db()).contact.findUniqueOrThrow({ where: { id: k.contact_id } })).ownerUserId).toBe(m.h.user);
    const done = await m.act(input);
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(done.body.data.result).toMatchObject({ status: 'transferred', owner_user_id: m.sales.id, moved: { conversations: 1, quotes: 0, appointments: 0 } });
    expect(done.body.data.undo_until).toBeTruthy();
    const again = await m.act(input);
    expect(again.body.data.result).toMatchObject({ status: 'skipped_already_owner', transfer_id: null, moved: { conversations: 0, quotes: 0, appointments: 0 } });
    expect(again.body.data.undo_until).toBeUndefined();
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).contact.findUniqueOrThrow({ where: { id: k.contact_id } })).ownerUserId).toBe(m.h.user);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
