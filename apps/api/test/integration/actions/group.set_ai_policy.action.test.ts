// Ma trận group.set_ai_policy (TIP-025b P3 — chính sách AI nhóm, CAS if_version). 403 người thiếu quyền · scope (sales own, hội thoại người khác → 403 / 404) · id lạ → 404 ·
// hội thoại 1-1 → 409 INVALID_TRANSITION · ô không áp dụng có lý do theo ActionDef. Luồng kênh thật (fake Zalo, worker) ở
// inbox-group-controls.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let c: { id: string; account: string; message: string };

beforeAll(async () => {
  m = await matrix('group.set_ai_policy');
  c = await m.conv({ channel: 'zalo_personal' });
  const t = await m.db();
  await t.conversation.update({ where: { id: c.id }, data: { kind: 'group', groupAiPolicy: 'mention' } });
}, 120_000);
afterAll(() => m?.close());

describe('group.set_ai_policy', () => {
  it('403 kế toán · scope sales own · id lạ → 404 · 1-1 → 409', async () => {
    expect((await m.act({ conversation_id: c.id, policy: 'off' as const, if_version: 0 }, await m.h.member('accountant'))).status).toBe(403);
    expect([403, 404]).toContain((await m.act({ conversation_id: c.id, policy: 'off' as const, if_version: 0 }, m.sales)).status);
    expect((await m.act({ ...{ conversation_id: c.id, policy: 'off' as const, if_version: 0 }, conversation_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
    const d = await m.conv({ channel: 'zalo_personal' });
    expect((await m.act({ ...{ conversation_id: c.id, policy: 'off' as const, if_version: 0 }, conversation_id: d.id })).status).toBe(409);
  });

  it('preview Trợ lý → xác nhận; if_version cũ → 409', async () => {
    const { preview, done } = await m.confirm({ conversation_id: c.id, policy: 'auto', if_version: 0 });
    expect(preview.risk).toBe('write');
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(done.body.data.result).toEqual({ policy: 'auto', policy_version: 1 });
    expect((await m.act({ conversation_id: c.id, policy: 'off', if_version: 0 })).status).toBe(409);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
