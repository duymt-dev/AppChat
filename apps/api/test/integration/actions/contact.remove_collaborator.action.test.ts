// Ma trận contact.remove_collaborator (TIP-023b): gỡ đồng phụ trách (người + vai trò trước); undo thêm lại; người không phải đồng phụ trách → 404; sales ngoài scope → 404.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let k: { contact_id: string; code: string };

beforeAll(async () => {
  m = await matrix('contact.remove_collaborator');
  k = await m.seed('contact.create', { full_name: 'Chị Lan Anh', phone: '0909440001' });
  await m.h.platform.user.update({ where: { id: m.cs.id }, data: { name: 'Hà CSKH' } });
  await m.seed('contact.add_collaborator', { contact_id: k.contact_id, user_id: m.cs.id, role: 'watcher' });
}, 120_000);
afterAll(() => m?.close());

describe('contact.remove_collaborator', () => {
  it('403 / scope / id lạ', async () => {
    expect((await m.act({ contact_id: k.contact_id, user_id: m.cs.id }, m.sales)).status).toBe(404);
    expect((await m.act({ contact_id: k.contact_id, user_id: m.sales.id })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ contact_id: k.contact_id, user_id: m.cs.id });
    expect(preview).toEqual({ summary: `${k.code} · Chị Lan Anh · Hà CSKH`, risk: 'write', changes: [{ entity: 'contact_collaborator', id: k.contact_id, before: { user: 'Hà CSKH', role: 'watcher' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(done.body.data.result).toEqual({ collaborators: 0 });
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect(await (await m.db()).contactCollaborator.count({ where: { contactId: k.contact_id } })).toBe(1);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
