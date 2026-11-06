// Ma trận segment.preview (TIP-037, read · skill · agentGrantable): đếm khách theo bộ lọc + gửi được trên kênh (loại huỷ nhận / không hội
// thoại); nguồn assistant chạy ngay; sales / cs (không campaign.view) → 403; không có tập người nhận → 422.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { na } from '../helpers/action-matrix';
import { mkMatrix, type MkMatrix } from '../helpers/marketing-matrix';

let x: MkMatrix;
const VIP = { field: 'group', op: 'in', value: ['vip'] };

beforeAll(async () => {
  x = await mkMatrix('segment.preview');
  await x.mk.contact({ group: 'vip', zaloAccount: x.zalo });
  await x.mk.contact({ group: 'vip', optOut: true, zaloAccount: x.zalo });
  await x.mk.contact({ group: 'vip' });
}, 120_000);
afterAll(() => x?.close());

describe('segment.preview', () => {
  it('happy (owner) + nguồn assistant chạy ngay', async () => {
    const r = await x.m.act({ filter: VIP, channel: 'zalo' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toEqual({ count: 3, reachable: 1 });
    expect((await x.m.act({ filter: VIP, channel: 'zalo' }, undefined, { 'x-action-source': 'assistant' })).body.data.result.reachable).toBe(1);
  });

  it('sales / cs 403; không có tập người nhận → 422', async () => {
    expect((await x.m.act({ filter: VIP }, x.m.sales)).status).toBe(403);
    expect((await x.m.act({ filter: VIP }, x.m.cs)).status).toBe(403);
    expect((await x.m.act({})).status).toBe(422);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(x.m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(x.m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(x.m.def, 'state')).toMatch(/risk read/);
    expect(na(x.m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
