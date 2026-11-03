// Ma trận profile_layout.search (TIP-023b R2): happy (3 mẫu hệ thống có sẵn kể cả khi chưa bù seed — action đọc không ghi; mẫu tự tạo; bỏ
// dấu) · 403 (sales không có settings.manage) · nguồn assistant. Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_LAYOUT_ID, SYSTEM_LAYOUTS } from '@appchat/shared';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('profile_layout.search');
}, 120_000);
afterAll(() => m?.close());

const names = (r: { body: { data: { result: { layouts: { name: string }[] } } } }) => r.body.data.result.layouts.map((l) => l.name);

describe('profile_layout.search', () => {
  it('happy: mẫu hệ thống trước, mẫu tự tạo sau, bỏ dấu; đọc không ghi seed', async () => {
    const r = await m.act({});
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.layouts).toEqual(expect.arrayContaining([{ id: DEFAULT_LAYOUT_ID, name: expect.any(String), is_system: true }]));
    expect(names(r)).toEqual(SYSTEM_LAYOUTS.map((l) => l.name));
    const tabs = SYSTEM_LAYOUTS[0]!.tabs();
    const id = (await m.seed('profile_layout.create', { name: 'Spa VIP', tabs })).layout_id;
    expect((await m.act({ q: 'spa vip' })).body.data.result.layouts).toEqual([{ id, name: 'Spa VIP', is_system: false }]);
  });

  it('403: sales không có settings.manage', async () => {
    expect((await m.act({}, m.sales)).status).toBe(403);
  });

  it('nguồn assistant · limit > 20 bị từ chối', async () => {
    expect((await m.act({}, undefined, { 'x-action-source': 'assistant' })).status).toBe(200);
    expect((await m.act({ limit: 21 })).status).toBe(422);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
  });
});
