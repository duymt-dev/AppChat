// Ma trận contact.restore (TIP-015f §1.4–§1.5): khôi phục trong 30 × 24h; quá hạn → 409 restore_expired; khách đang sống giữ cùng SĐT →
// 409 phone taken; chưa xoá → 409; sales thiếu crm.delete → 403; xem trước Trợ lý cảnh báo đồng bộ connector; khôi phục không đổi người
// phụ trách / version nghiệp vụ ngoài lifecycle_revision.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
const DAY = 24 * 3600_000;

beforeAll(async () => {
  m = await matrix('contact.restore');
}, 120_000);
afterAll(() => m?.close());

async function deleted(name: string, phone: string): Promise<string> {
  const k = await m.seed('contact.create', { full_name: name, phone });
  await m.seed('contact.delete', { contact_id: k.contact_id });
  return k.contact_id;
}

describe('contact.restore', () => {
  it('403 / chưa xoá / id lạ', async () => {
    const id = await deleted('Chị Hoa', '0909550001');
    expect((await m.act({ contact_id: id }, m.sales)).status).toBe(403);
    expect((await m.act({ contact_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
    const live = await m.seed('contact.create', { full_name: 'Chị Mai', phone: '0909550002' });
    expect((await m.act({ contact_id: live.contact_id })).body.error).toMatchObject({ code: 'INVALID_STATE', fields: { contact_id: 'not_deleted' } });
  });

  it('preview Trợ lý → xác nhận khôi phục, giữ người phụ trách', async () => {
    const id = await deleted('Anh Tùng', '0909550003');
    const db = await m.db();
    const before = await db.contact.findUniqueOrThrow({ where: { id } });
    const { preview, done } = await m.confirm({ contact_id: id });
    expect(preview).toMatchObject({ risk: 'write', warnings: ['connector_sync_may_resume'] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    const after = await db.contact.findUniqueOrThrow({ where: { id } });
    expect(after.deletedAt).toBeNull();
    expect(after.ownerUserId).toBe(before.ownerUserId);
    expect(after.lifecycleRevision).toBe(before.lifecycleRevision + 1);
  });

  it('quá 30 ngày → 409 restore_expired', async () => {
    const id = await deleted('Chị Quá Hạn', '0909550004');
    m.h.clock.advance(30 * DAY);
    const r = await m.act({ contact_id: id });
    expect(r.body.error).toMatchObject({ code: 'INVALID_STATE', fields: { contact_id: 'restore_expired' } });
  });

  it('khách đang sống giữ cùng SĐT → 409, không lộ khách kia', async () => {
    const id = await deleted('Chị Trùng', '0909550005');
    await m.seed('contact.create', { full_name: 'Chị Trùng Mới', phone: '0909550005' });
    const r = await m.act({ contact_id: id });
    expect(r.status).toBe(409);
    expect(r.body.error.fields).toEqual({ phone: 'taken' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});
