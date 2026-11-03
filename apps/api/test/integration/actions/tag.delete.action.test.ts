// Ma trận tag.delete (TIP-023b): preview Trợ lý (tên + số khách / hội thoại đang gắn) · xoá gỡ liên kết · undo khôi phục thẻ + liên kết ·
// 403 (sales) · id lạ → 404 · xoá lần hai → 404. Scope: cấu hình workspace. Trạng thái: không có máy trạng thái.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let tag: string;
let lan: string;

beforeAll(async () => {
  m = await matrix('tag.delete');
  tag = (await m.seed('tag.create', { name: 'Sắp hết buổi' })).tag_id;
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan gắn thẻ', phone: '0909330001' })).contact_id;
  await (await m.db()).contactTag.create({ data: { contactId: lan, tagId: tag } });
}, 120_000);
afterAll(() => m?.close());

describe('tag.delete', () => {
  it('403 sales · id lạ → 404', async () => {
    expect((await m.act({ tag_id: tag }, m.sales)).status).toBe(403);
    expect((await m.act({ tag_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý: tên + hệ quả gỡ 1 liên kết; xác nhận → xoá; undo → khôi phục thẻ + liên kết; xoá lần hai sau xoá → 404', async () => {
    const { preview, done } = await m.confirm({ tag_id: tag });
    expect(preview).toEqual({ summary: 'Sắp hết buổi', risk: 'delete', count: 1, changes: [{ entity: 'tag', id: tag, before: { name: 'Sắp hết buổi', contacts: 1, conversations: 0 } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    const db = await m.db();
    expect(await db.tag.findUnique({ where: { id: tag } })).toBeNull();
    expect(await db.contactTag.count({ where: { contactId: lan } })).toBe(0);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect(await db.contactTag.count({ where: { contactId: lan, tagId: tag } })).toBe(1);
    await m.act({ tag_id: tag });
    expect((await m.act({ tag_id: tag })).status).toBe(404);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
