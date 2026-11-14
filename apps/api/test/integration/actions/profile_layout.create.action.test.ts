// Ma trận profile_layout.create (TIP-023b): preview Trợ lý (tên + tab đang bật) → xác nhận · không tab nào bật → 422 · 403 (sales không có
// settings.manage) · idempotency. Scope: cấu hình workspace. Undo: không khai; trạng thái: không có.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SYSTEM_LAYOUTS } from '@appchat/shared';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
const tabs = SYSTEM_LAYOUTS[0]!.tabs();
const on = tabs.filter((t) => t.enabled).map((t) => t.label);

beforeAll(async () => {
  m = await matrix('profile_layout.create');
}, 120_000);
afterAll(() => m?.close());

describe('profile_layout.create', () => {
  it('preview Trợ lý → xác nhận', async () => {
    const { preview, done } = await m.confirm({ name: 'Spa VIP', tabs });
    expect(preview).toEqual({ summary: 'Spa VIP', risk: 'config', changes: [{ entity: 'profile_layout', after: { name: 'Spa VIP', tabs: on } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
  });

  it('không tab nào bật → 422 · 403 sales · idempotency', async () => {
    expect((await m.act({ name: 'Rỗng', tabs: tabs.map((t) => ({ ...t, enabled: false })) })).status).toBe(422);
    expect((await m.act({ name: 'X', tabs }, m.sales)).status).toBe(403);
    const a = await m.actWithKey('pl-create-idem', { name: 'Lặp', tabs });
    expect((await m.actWithKey('pl-create-idem', { name: 'Lặp', tabs })).body.data.result).toEqual(a.body.data.result);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});
