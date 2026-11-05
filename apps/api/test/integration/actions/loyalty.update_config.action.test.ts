// Ma trận loyalty.update_config (TIP-036, risk config, Owner / Quản lý): preview có trước / sau → xác nhận; Kế toán (không loyalty.config)
// → 403; idempotency cùng khoá → version tăng một lần; trạng thái: đủ 4 hạng duy nhất, sai → 422. Tỉ lệ / hạn / trần không có trong input.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
const tiers = (gold: number) => [{ key: 'member', mult: 1 }, { key: 'silver', mult: 1 }, { key: 'gold', mult: gold }, { key: 'diamond', mult: 2 }];

beforeAll(async () => {
  m = await matrix('loyalty.update_config');
}, 120_000);
afterAll(() => m?.close());

describe('loyalty.update_config', () => {
  it('preview Trợ lý → xác nhận', async () => {
    const { preview, done } = await m.confirm({ tiers: tiers(1.8), marketplace_earn: true });
    expect(preview).toMatchObject({ risk: 'config', changes: [{ entity: 'loyalty_config', before: { marketplace_earn: false }, after: { marketplace_earn: true } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    const c = await (await m.db()).loyaltyConfig.findUniqueOrThrow({ where: { id: 1 } });
    expect(c.marketplaceEarn).toBe(true);
    expect((c.tiers as { key: string; mult: number }[]).find((t) => t.key === 'gold')!.mult).toBe(1.8);
  });

  it('Kế toán 403; idempotency cùng khoá → version tăng một lần', async () => {
    const acc = await m.h.member('accountant');
    expect((await m.act({ enabled: false }, acc)).status).toBe(403);
    const v0 = (await (await m.db()).loyaltyConfig.findUniqueOrThrow({ where: { id: 1 } })).version;
    await m.actWithKey('cfg-same-key-1', { tiers: tiers(1.6) });
    await m.actWithKey('cfg-same-key-1', { tiers: tiers(1.6) });
    expect((await (await m.db()).loyaltyConfig.findUniqueOrThrow({ where: { id: 1 } })).version).toBe(v0 + 1);
  });

  it('trạng thái: hạng trùng → 422', async () => {
    expect((await m.act({ tiers: [{ key: 'gold', mult: 1 }, { key: 'gold', mult: 1 }, { key: 'silver', mult: 1 }, { key: 'diamond', mult: 2 }] })).status).toBe(422);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
