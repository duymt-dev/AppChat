// Ma trận sales_settings.update (TIP-032b P1, COMMERCE §3 Q5): 403 sales / cs (không settings.manage); Quản lý có settings.manage vẫn 403
// (Owner-only); preview trước / sau chỉ trường đổi; version cũ → STALE_VERSION; idempotency cùng khoá → cùng kết quả. Undo: không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('sales_settings.update');
}, 120_000);
afterAll(() => m?.close());

describe('sales_settings.update', () => {
  it('403 sales · cs · Quản lý (chỉ Chủ sở hữu); input rỗng → 422', async () => {
    expect((await m.act({ if_version: 1, approval_discount_pct: 8 }, m.sales)).status).toBe(403);
    expect((await m.act({ if_version: 1, approval_discount_pct: 8 }, m.cs)).status).toBe(403);
    const manager = await m.h.member('manager');
    expect((await m.act({ if_version: 1, approval_discount_pct: 8 }, manager)).body.error).toMatchObject({ code: 'FORBIDDEN', fields: { permission: 'owner' } });
    expect((await m.act({ if_version: 1 })).status).toBe(422);
    expect((await m.act({ if_version: 1, approval_total_vnd: '-1' })).status).toBe(422);
  });

  it('preview trước / sau chỉ trường đổi; xác nhận → version 2', async () => {
    const { preview, done } = await m.confirm({ if_version: 1, approval_discount_pct: 8 });
    expect(preview).toEqual({
      summary: 'sales_policy · v1',
      risk: 'config',
      changes: [{ entity: 'sales_settings', id: 'sales_policy', before: { approval_discount_pct: 5 }, after: { approval_discount_pct: 8 } }],
    });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(done.body.data.result).toEqual({ version: 2, approval_total_vnd: '20000000', approval_discount_pct: 8 });
  });

  it('version cũ → 409 STALE_VERSION kèm version hiện tại; cùng Idempotency-Key → cùng kết quả, version tăng một lần', async () => {
    expect((await m.act({ if_version: 1, approval_total_vnd: '30000000' })).body.error).toMatchObject({ code: 'STALE_VERSION', fields: { version: '2' } });
    const key = uuidv7();
    const a = await m.actWithKey(key, { if_version: 2, approval_total_vnd: '30000000' });
    const b = await m.actWithKey(key, { if_version: 2, approval_total_vnd: '30000000' });
    expect(a.status, JSON.stringify(a.body)).toBe(200);
    expect(b.body.data.result).toEqual(a.body.data.result);
    expect((await (await m.db()).commerceSettings.findUniqueOrThrow({ where: { id: 1 } })).version).toBe(3);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
