// Ma trận contact.delete (TIP-023b → TIP-015f): xoá mềm có biên nhận + thế hệ vòng đời; xem trước gắn version + thế hệ; phụ thuộc chặn
// (đơn đang mở) → 409 HAS_DEPENDENCIES chỉ đếm; xoá lại cùng thế hệ = already_deleted (giữ hạn, không undo); undo = khôi phục; sales thiếu
// crm.delete → 403; id lạ → 404; if_version cũ → 409; hội thoại của khách tăng ai_epoch (hàng rào AI).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let k: { contact_id: string; code: string };

beforeAll(async () => {
  m = await matrix('contact.delete');
  k = await m.seed('contact.create', { full_name: 'Chị Lan Anh', phone: '0909440001' });
}, 120_000);
afterAll(() => m?.close());

describe('contact.delete', () => {
  it('403 / scope / id lạ / version cũ', async () => {
    expect((await m.act({ contact_id: k.contact_id }, m.sales)).status).toBe(403);
    expect((await m.act({ contact_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
    expect((await m.act({ contact_id: k.contact_id, if_version: 999 })).body.error?.code).toBe('STALE_VERSION');
  });

  it('preview Trợ lý → xác nhận (biên nhận 30 ngày, hàng rào AI) → xoá lại = bỏ qua → undo', async () => {
    const db = await m.db();
    const conv = await m.conv({ contactId: k.contact_id });
    const epoch = (await db.conversation.findUniqueOrThrow({ where: { id: conv.id } })).aiEpoch;
    const c0 = await db.contact.findUniqueOrThrow({ where: { id: k.contact_id } });
    const { preview, done } = await m.confirm({ contact_id: k.contact_id, if_version: c0.version });
    expect(preview).toMatchObject({ summary: `${k.code} · Chị Lan Anh`, risk: 'delete', changes: [{ entity: 'contact', id: k.contact_id, before: { code: k.code, name: 'Chị Lan Anh', lifecycle_revision: c0.lifecycleRevision } }] });
    expect(preview.warnings).toContain('conversation:1');
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    const res = done.body.data.result;
    expect(res).toMatchObject({ deleted: true, status: 'deleted' });
    const c1 = await db.contact.findUniqueOrThrow({ where: { id: k.contact_id } });
    expect(c1.deletedAt).not.toBeNull();
    expect(c1.lifecycleRevision).toBe(c0.lifecycleRevision + 1);
    const rec = await db.contactLifecycleReceipt.findUniqueOrThrow({ where: { id: res.receipt_id } });
    expect(rec.restoreUntil.getTime() - rec.deletedAt.getTime()).toBe(30 * 24 * 3600_000);
    expect((await db.conversation.findUniqueOrThrow({ where: { id: conv.id } })).aiEpoch).toBe(epoch + 1);

    const again = await m.act({ contact_id: k.contact_id });
    expect(again.body.data.result).toMatchObject({ status: 'already_deleted', receipt_id: res.receipt_id, restore_until: res.restore_until });
    expect(again.body.data.undo_until).toBeUndefined();

    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    const c2 = await db.contact.findUniqueOrThrow({ where: { id: k.contact_id } });
    expect(c2.deletedAt).toBeNull();
    expect(c2.lifecycleRevision).toBe(c1.lifecycleRevision + 1);
    expect((await db.contactLifecycleReceipt.findUniqueOrThrow({ where: { id: res.receipt_id } })).state).toBe('restored');
  });

  it('đơn đang mở chặn xoá — 409 HAS_DEPENDENCIES chỉ có số đếm, không ghi gì', async () => {
    const b = await m.seed('contact.create', { full_name: 'Anh Bình', phone: '0909440002' });
    await m.seed('order.create', { contact_id: b.contact_id, items: [{ name: 'HIFU', qty: 1, unit_price: '2000000', tax_rate: 0 }] });
    const r = await m.act({ contact_id: b.contact_id });
    expect(r.status).toBe(409);
    expect(r.body.error).toMatchObject({ code: 'HAS_DEPENDENCIES', fields: { open_order: '1' } });
    expect((await (await m.db()).contact.findUniqueOrThrow({ where: { id: b.contact_id } })).deletedAt).toBeNull();
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
