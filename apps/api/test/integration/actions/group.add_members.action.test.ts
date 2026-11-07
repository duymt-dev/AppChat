// Ma trận group.add_members (TIP-025b P3 — thêm thành viên từ khách 1-1 cùng tài khoản, lệnh bền). 403 người thiếu quyền · scope (sales own, hội thoại người khác → 403 / 404) · id lạ → 404 ·
// hội thoại 1-1 → 409 INVALID_TRANSITION · ô không áp dụng có lý do theo ActionDef. Luồng kênh thật (fake Zalo, worker) ở
// inbox-group-controls.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let c: { id: string; account: string; message: string };

beforeAll(async () => {
  m = await matrix('group.add_members');
  c = await m.conv({ channel: 'zalo_personal' });
  const t = await m.db();
  await t.conversation.update({ where: { id: c.id }, data: { kind: 'group', groupAiPolicy: 'mention' } });
}, 120_000);
afterAll(() => m?.close());

describe('group.add_members', () => {
  it('403 kế toán · scope sales own · id lạ → 404 · 1-1 → 409', async () => {
    expect((await m.act({ conversation_id: c.id, member_conversation_ids: [c.id] }, await m.h.member('accountant'))).status).toBe(403);
    expect([403, 404]).toContain((await m.act({ conversation_id: c.id, member_conversation_ids: [c.id] }, m.sales)).status);
    expect((await m.act({ ...{ conversation_id: c.id, member_conversation_ids: [c.id] }, conversation_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
    const d = await m.conv({ channel: 'zalo_personal' });
    expect((await m.act({ ...{ conversation_id: c.id, member_conversation_ids: [c.id] }, conversation_id: d.id })).status).toBe(409);
  });

  it('hội thoại nhóm không phải 1-1 → 422; khách 1-1 cùng tài khoản → preview (send) → lệnh queued', async () => {
    expect((await m.act({ conversation_id: c.id, member_conversation_ids: [c.id] })).status).toBe(422);
    const d = await m.conv({ channel: 'zalo_personal' });
    const { preview, done } = await m.confirm({ conversation_id: c.id, member_conversation_ids: [d.id] });
    expect(preview.risk).toBe('send');
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(done.body.data.result.status).toBe('queued');
    expect((await (await m.db()).groupCommand.findUniqueOrThrow({ where: { id: done.body.data.result.command_id } })).status).toBe('queued');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});
