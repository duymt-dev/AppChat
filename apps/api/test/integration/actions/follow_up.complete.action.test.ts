// Ma trận follow_up.complete (TIP-038 pha 2, DC-241): happy (việc thật → done, "còn lại" theo scope người xem) · idempotent (bấm lại không
// trừ lần hai) · 404 (id lạ / khách ngoài scope) · 403 (CSKH đọc được khách nhưng không ghi — watcher / scope ghi hẹp) · STALE_VERSION (khách
// đã có tương tác mới) · undo 24h (đúng phiên bản; tương tác mới → không hồi sinh) · nguồn assistant → thẻ xác nhận có preview.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let seq = 0;
const DAY = 86_400_000;

/** Khách im lặng 8 ngày + việc follow pending đúng mốc. */
async function seedFollow(owner: string): Promise<{ id: string; contact: string }> {
  const db = await m.db();
  const contact = uuidv7();
  const at = new Date(m.h.clock.now().getTime() - 8 * DAY);
  await db.contact.create({ data: { id: contact, code: `KH-FU${Date.now() % 100000}${++seq}`, name: `Khách FU ${seq}`, source: 'manual', ownerUserId: owner, lastInteractionAt: at } });
  const id = uuidv7();
  await db.followUp.create({ data: { id, contactId: contact, sourceKey: `${contact}:${at.toISOString()}`, sourceAt: at, dueAt: new Date(at.getTime() + 7 * DAY) } });
  return { id, contact };
}

beforeAll(async () => {
  m = await matrix('follow_up.complete');
}, 120_000);
afterAll(() => m?.close());

describe('follow_up.complete', () => {
  it('happy + idempotent: done một lần, bấm lại không trừ "còn lại" hai lần; outbox follow_up.completed', async () => {
    const a = await seedFollow(m.h.user);
    await seedFollow(m.h.user);
    const r = await m.act({ follow_up_id: a.id });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const left = r.body.data.result.remaining as number;
    expect((await m.act({ follow_up_id: a.id })).body.data.result.remaining).toBe(left);
    const db = await m.db();
    expect(await db.followUp.findUniqueOrThrow({ where: { id: a.id } })).toMatchObject({ status: 'done', version: 2, completedByUserId: m.h.user });
    expect(await db.outboxEvent.count({ where: { topic: 'follow_up.completed', payload: { path: ['follow_up_id'], equals: a.id } } })).toBe(1);
  });

  it('404 id lạ / khách ngoài scope (Sales own); 403 CSKH thấy nhưng không ghi được', async () => {
    expect((await m.act({ follow_up_id: uuidv7() })).status).toBe(404);
    expect((await m.act({ follow_up_id: 'F1' })).status).toBe(404);
    const other = await seedFollow(m.h.user);
    expect((await m.act({ follow_up_id: other.id }, m.sales)).status).toBe(404);
    const r = await m.act({ follow_up_id: other.id }, m.cs);
    expect(r.status, JSON.stringify(r.body)).toBe(403);
    const mine = await seedFollow(m.sales.id);
    expect((await m.act({ follow_up_id: mine.id }, m.sales)).status).toBe(200);
  });

  it('STALE_VERSION: khách có tương tác mới sau mốc sinh việc → việc cũ không còn hiệu lực', async () => {
    const f = await seedFollow(m.h.user);
    await (await m.db()).contact.update({ where: { id: f.contact }, data: { lastInteractionAt: m.h.clock.now() } });
    expect((await m.act({ follow_up_id: f.id })).body.error).toMatchObject({ code: 'STALE_VERSION' });
  });

  it('undo 24h đúng phiên bản; khách có tương tác mới sau khi xong → hoàn tác 409 (không hồi sinh việc cũ)', async () => {
    const f = await seedFollow(m.h.user);
    const r = await m.act({ follow_up_id: f.id });
    expect((await m.undo(r.body.data.action_log_id)).status).toBe(200);
    const db = await m.db();
    expect(await db.followUp.findUniqueOrThrow({ where: { id: f.id } })).toMatchObject({ status: 'pending', version: 3, completedAt: null });
    expect(await db.outboxEvent.count({ where: { topic: 'follow_up.undone', payload: { path: ['follow_up_id'], equals: f.id } } })).toBe(1);
    const again = await m.act({ follow_up_id: f.id });
    await db.contact.update({ where: { id: f.contact }, data: { lastInteractionAt: m.h.clock.now() } });
    expect((await m.undo(again.body.data.action_log_id)).body.error).toMatchObject({ code: 'STALE_VERSION' });
    expect((await db.followUp.findUniqueOrThrow({ where: { id: f.id } })).status).toBe('done');
  });

  it('nguồn assistant: thẻ xác nhận có preview (khách + trạng thái), xác nhận rồi mới ghi', async () => {
    const f = await seedFollow(m.h.user);
    const { preview, done } = await m.confirm({ follow_up_id: f.id });
    expect(preview).toMatchObject({ risk: 'write', changes: [{ entity: 'follow_up', id: f.id, before: { status: 'pending' }, after: { status: 'done' } }] });
    expect(done.status).toBe(200);
  });

  it('ô không áp dụng có lý do', () => {
    expect(m.def).toMatchObject({ permission: 'crm.edit', risk: 'write', agentGrantable: true, undo: { windowSec: 86_400 } });
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
