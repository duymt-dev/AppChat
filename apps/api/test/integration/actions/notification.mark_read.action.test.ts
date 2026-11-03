// Ma trận notification.mark_read (TIP-023b): đánh dấu đã đọc (permission self, DB tenant) → số thông báo chưa đọc của CHÍNH người gọi sẽ
// đổi. Thông báo của người khác không bị đụng. Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
const unread = async (userId: string) => (await m.db()).notification.count({ where: { userId, readAt: null } });

beforeAll(async () => {
  m = await matrix('notification.mark_read');
  const t = await m.db();
  for (const userId of [m.h.user, m.h.user, m.sales.id]) await t.notification.create({ data: { id: uuidv7(), userId, type: 'msg_assigned', title: 'Hội thoại mới' } });
}, 120_000);
afterAll(() => m?.close());

describe('notification.mark_read', () => {
  it('preview Trợ lý → xác nhận; chỉ thông báo của người gọi', async () => {
    const { preview, done } = await m.confirm({ ids: 'all' });
    expect(preview).toEqual({ summary: '2', risk: 'write', count: 2, changes: [{ entity: 'notification', after: { read: true, scope: 'all' } }] });
    expect(done.body.data.result).toEqual({ updated: 2 });
    expect([await unread(m.h.user), await unread(m.sales.id)]).toEqual([0, 1]);
  });

  it('idempotency', async () => {
    const r = await m.actWithKey('nmr-idem', { ids: 'all' }, m.sales);
    expect(r.body.data.result).toEqual({ updated: 1 });
    expect((await m.actWithKey('nmr-idem', { ids: 'all' }, m.sales)).body.data.result).toEqual({ updated: 1 });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
