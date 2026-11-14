// Ma trận segment.create (TIP-037, write, undo 24h, agent ✗): lưu bộ lọc AST đóng + đếm thật; preview Trợ lý → xác nhận → hoàn tác xoá mềm;
// sales / cs (không campaign.manage) → 403; idempotency cùng khoá → một phân khúc; AST sai → 422. Đủ luồng: marketing.test.ts AC1.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { na } from '../helpers/action-matrix';
import { mkMatrix, type MkMatrix } from '../helpers/marketing-matrix';

let x: MkMatrix;
const VIP = { field: 'group', op: 'in', value: ['vip'] };

beforeAll(async () => {
  x = await mkMatrix('segment.create');
  await x.mk.contact({ group: 'vip' });
}, 120_000);
afterAll(() => x?.close());

describe('segment.create', () => {
  it('preview Trợ lý → xác nhận (đếm thật) → hoàn tác xoá mềm', async () => {
    const { done } = await x.m.confirm({ name: 'VIP', filter: VIP });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(done.body.data.result.count).toBe(1);
    expect((await x.m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await x.m.db()).segment.findUniqueOrThrow({ where: { id: done.body.data.result.segment_id } })).deletedAt).not.toBeNull();
  });

  it('sales / cs 403; idempotency cùng khoá → một phân khúc; AST sai → 422', async () => {
    expect((await x.m.act({ name: 'S', filter: VIP }, x.m.sales)).status).toBe(403);
    expect((await x.m.act({ name: 'S', filter: VIP }, x.m.cs)).status).toBe(403);
    await x.m.actWithKey('seg-create-key', { name: 'Một lần', filter: VIP });
    await x.m.actWithKey('seg-create-key', { name: 'Một lần', filter: VIP });
    expect(await (await x.m.db()).segment.count({ where: { name: 'Một lần' } })).toBe(1);
    expect((await x.m.act({ name: 'Lạ', filter: { field: 'raw', op: 'eq', value: '1' } })).status).toBe(422);
  });

  it('trạng thái: phân khúc đang dùng trong nháp → hoàn tác 409', async () => {
    const r = await x.m.act({ name: 'Đang dùng', filter: VIP });
    const k = await x.mk.contact({ zaloAccount: x.zalo });
    await x.mk.act('campaign.create', { name: 'Dùng', channel: 'zalo', account_id: x.zalo, segment_ids: [r.body.data.result.segment_id], contact_ids: [k], content: { text: 'a' } });
    expect((await x.m.undo(r.body.data.action_log_id)).status).toBe(409);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(x.m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
