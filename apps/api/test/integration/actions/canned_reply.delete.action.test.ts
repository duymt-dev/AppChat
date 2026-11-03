// Ma trận canned_reply.delete (TIP-023b): preview Trợ lý (phím tắt · tiêu đề) · xác nhận → xoá · undo khôi phục · 403 (sales) · id lạ →
// 404. Scope: cấu hình workspace. Trạng thái: không có máy trạng thái.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let id: string;

beforeAll(async () => {
  m = await matrix('canned_reply.delete');
  id = (await m.seed('canned_reply.create', { shortcut: '/cam', title: 'Cảm ơn', body: 'Cảm ơn chị đã ghé spa.', category: 'Chung' })).reply_id;
}, 120_000);
afterAll(() => m?.close());

describe('canned_reply.delete', () => {
  it('403 sales · id lạ → 404', async () => {
    expect((await m.act({ reply_id: id }, m.sales)).status).toBe(403);
    expect((await m.act({ reply_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → xoá; undo → khôi phục', async () => {
    const { preview, done } = await m.confirm({ reply_id: id });
    expect(preview).toEqual({ summary: '/cam · Cảm ơn', risk: 'delete', changes: [{ entity: 'canned_reply', id, before: { shortcut: '/cam', title: 'Cảm ơn' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    const db = await m.db();
    expect(await db.cannedReply.findUnique({ where: { id } })).toBeNull();
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect(await db.cannedReply.findUnique({ where: { id } })).toMatchObject({ shortcut: '/cam' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
