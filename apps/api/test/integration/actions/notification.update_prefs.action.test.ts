// Ma trận notification.update_prefs (TIP-023b): tuỳ chọn thông báo (permission self, db platform) → trước / sau chỉ phần đổi; sự kiện lạ →
// 400 ở preview. Quyền 'self' — chỉ đổi tuỳ chọn của chính người gọi. Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('notification.update_prefs');
}, 120_000);
afterAll(() => m?.close());

describe('notification.update_prefs', () => {
  it('preview Trợ lý → xác nhận; sự kiện lạ → 400', async () => {
    const ch = { desktop: true, email: false, mobile: true };
    const { preview, done } = await m.confirm({ events: { msg_assigned: ch }, digest: 'weekly', sound: true });
    expect(preview).toEqual({
      summary: '1',
      risk: 'write',
      changes: [{ entity: 'notification_pref', id: m.h.user, before: { events: { msg_assigned: null }, digest: 'daily' }, after: { events: { msg_assigned: ch }, digest: 'weekly' } }],
    });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.h.platform.notificationPref.findUniqueOrThrow({ where: { userId: m.h.user } })).digest).toBe('weekly');
    const r = await m.act({ events: { nope: ch } }, undefined, { 'x-action-source': 'assistant' });
    expect([r.status, r.body.error.fields]).toEqual([400, { 'events.nope': 'unknown_event' }]);
  });

  it('sales (self) chỉ đổi của mình', async () => {
    expect((await m.act({ sound: false }, m.sales)).status).toBe(200);
    expect((await m.h.platform.notificationPref.findUniqueOrThrow({ where: { userId: m.sales.id } })).sound).toBe(false);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
