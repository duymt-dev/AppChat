// Ma trận lead_routing.update (TIP-042b): cấu hình chia lead (risk config, crm.reassign) — 403 sales / cs; pool rỗng khi bật 422, người
// ngoài workspace 422, tài khoản lạ 404, mode cũ `shift` 422; preview Trợ lý → xác nhận; trùng rule 409; CAS 409; idempotency; undo trả cấu hình.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('lead_routing.update');
}, 120_000);
afterAll(() => m?.close());

describe('lead_routing.update', () => {
  it('403 sales / cs · pool rỗng 422 · người lạ 422 · tài khoản lạ 404 · shift 422', async () => {
    expect((await m.act({ enabled: true, mode: 'round_robin', user_ids: [m.sales.id] }, m.sales)).status).toBe(403);
    expect((await m.act({ enabled: true, mode: 'round_robin', user_ids: [m.sales.id] }, m.cs)).status).toBe(403);
    expect((await m.act({ enabled: true, mode: 'round_robin' })).body.error.fields).toEqual({ user_ids: 'empty_pool' });
    expect((await m.act({ enabled: true, mode: 'round_robin', user_ids: [uuidv7()] })).body.error.fields.user_ids).toMatch(/^not_member:/);
    expect((await m.act({ channel_account_id: uuidv7(), enabled: false, mode: 'manual' })).status).toBe(404);
    expect((await m.act({ enabled: true, mode: 'shift', user_ids: [m.sales.id] })).status).toBe(422);
  });

  it('preview Trợ lý (chỉ lead mới) → xác nhận; trùng 409; CAS lệch 409; idempotency cùng khoá trả cùng kết quả', async () => {
    const { preview, done } = await m.confirm({ enabled: true, mode: 'round_robin', user_ids: [m.sales.id, m.cs.id].sort() });
    expect(preview).toMatchObject({ risk: 'config', count: 2, warnings: ['new_leads_only', 'history_import_counts'] });
    const r = done.body.data.result as { rule_id: string; version: number };
    expect(r.version).toBe(1);
    expect((await m.act({ enabled: false, mode: 'manual' })).status).toBe(409);
    expect((await m.act({ rule_id: r.rule_id, if_version: 7, enabled: false, mode: 'manual' })).status).toBe(409);
    const key = uuidv7();
    const a = await m.actWithKey(key, { rule_id: r.rule_id, if_version: 1, enabled: true, mode: 'least_busy', user_ids: [m.sales.id] });
    const b = await m.actWithKey(key, { rule_id: r.rule_id, if_version: 1, enabled: true, mode: 'least_busy', user_ids: [m.sales.id] });
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(b.body.data.result).toEqual(a.body.data.result);
    // Undo trả cấu hình trước (round_robin 2 người), mốc bật giữ nguyên.
    expect((await m.undo(a.body.data.action_log_id)).status).toBe(200);
    const row = await (await m.db()).leadRoutingRule.findUniqueOrThrow({ where: { id: r.rule_id } });
    expect([row.mode, row.userIds.length, row.enabled]).toEqual(['round_robin', 2, true]);
  });

  it('ô không áp dụng có lý do', () => {
    expect(m.def.agentGrantable).toBe(false);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
