// Ma trận group.update (TIP-025b P3 — đổi tên / link nhóm theo phiên bản, lệnh bền). 403 người thiếu quyền · scope (sales own, hội thoại người khác → 403 / 404) · id lạ → 404 ·
// hội thoại 1-1 → 409 INVALID_TRANSITION · ô không áp dụng có lý do theo ActionDef. Luồng kênh thật (fake Zalo, worker) ở
// inbox-group-controls.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let c: { id: string; account: string; message: string };

beforeAll(async () => {
  m = await matrix('group.update');
  c = await m.conv({ channel: 'zalo_personal' });
  const t = await m.db();
  await t.conversation.update({ where: { id: c.id }, data: { kind: 'group', groupAiPolicy: 'mention' } });
}, 120_000);
afterAll(() => m?.close());

describe('group.update', () => {
  it('403 kế toán · scope sales own · id lạ → 404 · 1-1 → 409', async () => {
    expect((await m.act({ conversation_id: c.id, name: 'Nhóm VIP 2', expected_version: '7' }, await m.h.member('accountant'))).status).toBe(403);
    expect([403, 404]).toContain((await m.act({ conversation_id: c.id, name: 'Nhóm VIP 2', expected_version: '7' }, m.sales)).status);
    expect((await m.act({ ...{ conversation_id: c.id, name: 'Nhóm VIP 2', expected_version: '7' }, conversation_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
    const d = await m.conv({ channel: 'zalo_personal' });
    expect((await m.act({ ...{ conversation_id: c.id, name: 'Nhóm VIP 2', expected_version: '7' }, conversation_id: d.id })).status).toBe(409);
  });

  it('chưa làm mới → 409 refresh_required; đúng phiên bản → preview (send) → lệnh queued; lệch → 409', async () => {
    expect((await m.act({ conversation_id: c.id, name: 'Nhóm VIP 2', expected_version: '7' })).body.error.fields).toEqual({ expected_version: 'refresh_required' });
    await (await m.db()).conversationGroupState.create({ data: { conversationId: c.id, providerName: 'Nhóm VIP', providerVersion: '7', accountRole: 'admin', linkEnabled: false, updatedAt: new Date() } });
    expect((await m.act({ conversation_id: c.id, name: 'X', expected_version: '6' })).status).toBe(409);
    const { preview, done } = await m.confirm({ conversation_id: c.id, name: 'Nhóm VIP 2', expected_version: '7' });
    expect(preview.risk).toBe('send');
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(done.body.data.result.status).toBe('queued');
    expect((await (await m.db()).groupCommand.findUniqueOrThrow({ where: { id: done.body.data.result.command_id } })).status).toBe('queued');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});
