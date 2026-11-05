// Ma trận contact.add_collaborator (TIP-023b): người + vai trò trước / sau; undo gỡ; sales (không phụ trách, không crm.reassign) → 404 vì ngoài scope; người phụ trách chính → 422.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let k: { contact_id: string; code: string };

beforeAll(async () => {
  m = await matrix('contact.add_collaborator');
  k = await m.seed('contact.create', { full_name: 'Chị Lan Anh', phone: '0909440001' });
  await m.h.platform.user.update({ where: { id: m.cs.id }, data: { name: 'Hà CSKH' } });
}, 120_000);
afterAll(() => m?.close());

describe('contact.add_collaborator', () => {
  it('403 / scope / id lạ', async () => {
    expect((await m.act({ contact_id: k.contact_id, user_id: m.cs.id, role: 'watcher' }, m.sales)).status).toBe(404);
    expect((await m.act({ contact_id: k.contact_id, user_id: m.h.user, role: 'watcher' })).status).toBe(422);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ contact_id: k.contact_id, user_id: m.cs.id, role: 'collaborator' });
    expect(preview).toEqual({ summary: `${k.code} · Chị Lan Anh · Hà CSKH`, risk: 'write', changes: [{ entity: 'contact_collaborator', id: k.contact_id, before: { role: null }, after: { role: 'collaborator' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(done.body.data.result).toEqual({ collaborators: 1 });
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect(await (await m.db()).contactCollaborator.count({ where: { contactId: k.contact_id } })).toBe(0);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
