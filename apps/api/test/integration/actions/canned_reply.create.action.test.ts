// Ma trận canned_reply.create (TIP-023b): happy · preview Trợ lý (phím tắt · tiêu đề, dữ liệu mới) · 403 (sales không có inbox.manage) ·
// trùng phím tắt → 409 · phím tắt sai mẫu → 422 · idempotency. Scope: cấu hình workspace. Undo: không khai; trạng thái: không có.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
const base = { title: 'Giờ mở cửa', body: 'Spa mở cửa 8h–20h.', category: 'Chung' };

beforeAll(async () => {
  m = await matrix('canned_reply.create');
}, 120_000);
afterAll(() => m?.close());

describe('canned_reply.create', () => {
  it('preview Trợ lý → xác nhận → lưu', async () => {
    const { preview, done } = await m.confirm({ shortcut: '/gio', ...base });
    expect(preview).toEqual({ summary: '/gio · Giờ mở cửa', risk: 'config', changes: [{ entity: 'canned_reply', after: { shortcut: '/gio', ...base } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(await (await m.db()).cannedReply.findUnique({ where: { shortcut: '/gio' } })).toMatchObject(base);
  });

  it('403 sales · trùng phím tắt → 409 · sai mẫu → 422', async () => {
    expect((await m.act({ shortcut: '/x', ...base }, m.sales)).status).toBe(403);
    expect((await m.act({ shortcut: '/gio', ...base })).status).toBe(409);
    expect((await m.act({ shortcut: 'gio', ...base })).status).toBe(422);
  });

  it('idempotency: cùng khoá → một câu', async () => {
    const a = await m.actWithKey('reply-create-idem-1', { shortcut: '/lap', ...base });
    const b = await m.actWithKey('reply-create-idem-1', { shortcut: '/lap', ...base });
    expect(b.body.data.result).toEqual(a.body.data.result);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});
