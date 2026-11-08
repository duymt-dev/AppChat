// Ma trận contact.add_note (TIP-026b §2): crm.edit, write, agentGrantable=true, undo 24h — ghi chú nội bộ, không gửi ra kênh. Owner →
// kind note; sales ngoài scope → 404; kế toán (không crm.edit) → 403; nguồn hội thoại giả → 422; hoàn tác → xoá mềm.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let contact = '';

beforeAll(async () => {
  m = await matrix('contact.add_note');
  contact = (await m.seed('contact.create', { full_name: 'Khách ma trận', phone: '0909400001' })).contact_id;
}, 120_000);
afterAll(() => m?.close());

describe('contact.add_note', () => {
  it('Owner → kind note; nguồn giả 422; hoàn tác xoá mềm', async () => {
    const r = await m.act({ contact_id: contact, body: 'Ghi chú ma trận' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ kind: 'note', version: 1 });
    expect((await m.act({ contact_id: contact, body: 'x', source_conversation_id: uuidv7() })).status).toBe(422);
    expect((await m.undo(r.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).contactNote.findUniqueOrThrow({ where: { id: r.body.data.result.note_id } })).deletedAt).not.toBeNull();
  });
  it('sales ngoài scope 404; kế toán 403', async () => {
    expect((await m.act({ contact_id: contact, body: 'x' }, m.sales)).status).toBe(404);
    expect((await m.act({ contact_id: contact, body: 'x' }, await m.h.member('accountant'))).status).toBe(403);
  });
  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
