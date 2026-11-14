// Ma trận loyalty.attach_file (TIP-036 P3, risk write, undo 24h, agent ✗): preview Trợ lý (tên tệp) → xác nhận → hoàn tác gỡ liên kết;
// Kế toán (không crm.edit) 403 · CS (crm.edit, scope all) gắn tệp người khác tải → 422 · sales ngoài scope 404 · khách lạ 404; idempotency
// cùng khoá → một liên kết; trạng thái: tệp đã gắn → 409.
// Luồng đủ (tải bytes, scope route đọc tệp): loyalty.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;

async function upload(name: string) {
  const form = new FormData();
  form.set('purpose', 'attachment');
  form.set('file', new Blob([new Uint8Array(Buffer.from('%PDF-1.4 x'))], { type: 'application/pdf' }), name);
  const r = await fetch(`${m.h.base}/v1/files`, { method: 'POST', headers: { 'x-workspace-id': m.h.ws, authorization: `Bearer ${m.h.token}` }, body: form });
  return ((await r.json()) as { data: { file_id: string } }).data.file_id;
}

beforeAll(async () => {
  m = await matrix('loyalty.attach_file');
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan Tệp', phone: '0909365001' })).contact_id;
}, 120_000);
afterAll(() => m?.close());

describe('loyalty.attach_file', () => {
  it('preview Trợ lý → xác nhận → hoàn tác', async () => {
    const f = await upload('Ảnh quà.pdf');
    const { preview, done } = await m.confirm({ contact_id: lan, file_id: f });
    expect(preview).toMatchObject({ risk: 'write', changes: [{ entity: 'loyalty_member', id: lan, after: { file: 'Ảnh quà.pdf' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect(await (await m.db()).loyaltyMemberFile.count({ where: { contactId: lan } })).toBe(0);
  });

  it('403 Kế toán · CS tệp không phải của mình 422 · sales ngoài scope 404 · khách lạ 404', async () => {
    const f = await upload('b.pdf');
    const acc = await m.h.member('accountant');
    expect((await m.act({ contact_id: lan, file_id: f }, acc)).status).toBe(403);
    expect((await m.act({ contact_id: lan, file_id: f }, m.cs)).status).toBe(422);
    expect((await m.act({ contact_id: lan, file_id: f }, m.sales)).status).toBe(404);
    expect((await m.act({ contact_id: '0190f000-0000-7000-8000-00000000beef', file_id: f })).status).toBe(404);
  });

  it('idempotency cùng khoá → một liên kết; tệp đã gắn → 409', async () => {
    const f = await upload('c.pdf');
    const a = await m.actWithKey('attach-same-key-1', { contact_id: lan, file_id: f });
    const b = await m.actWithKey('attach-same-key-1', { contact_id: lan, file_id: f });
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(await (await m.db()).loyaltyMemberFile.count({ where: { fileId: f } })).toBe(1);
    expect((await m.act({ contact_id: lan, file_id: f })).status).toBe(409);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
