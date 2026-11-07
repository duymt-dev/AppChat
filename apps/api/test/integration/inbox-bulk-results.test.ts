// TIP-025b P1 — §C bulk Hộp thư + alias "bỏ" + §B.4 đếm theo bộ lọc. ≤ 50: kết quả TỪNG id (ngoài scope / không có → lỗi riêng, mã an
// toàn); gán cần inbox.assign; undo chỉ khôi phục trường còn đúng giá trị lô (người khác đổi sau → giữ). > 50: 202 job_accepted, worker
// (runDataJob) áp từng hội thoại, id không thấy → failed. Alias unhide / untag / unpin / unreact: trạng thái mong muốn, không bật lại.
// Đếm thư mục áp cùng bộ lọc kênh / tìm kiếm với danh sách.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuthzResolver, allowedAction, registerInboxBulkKind, runDataJob, uuidv7, type RunDeps } from '@appchat/core';
import { matrix, type Matrix } from './helpers/action-matrix';
import { call } from './setup';

type Body = any; // eslint-disable-line @typescript-eslint/no-explicit-any
let m: Matrix;
let deps: RunDeps;

const hdr = (who?: { token: string }): Record<string, string> => (who ? { authorization: `Bearer ${who.token}` } : {});
async function ui(id: string, input: unknown, who?: { token: string }) {
  const p = await call(m.h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...hdr(who) });
  const pv = (await p.json()) as Body;
  if (p.status !== 202) return { status: p.status, body: pv, preview: null };
  const r = await call(m.h, `/actions/${id}`, { input, confirm_token: pv.data.confirm_token }, { 'idempotency-key': uuidv7(), ...hdr(who) });
  return { status: r.status, body: (await r.json()) as Body, preview: pv.data.preview };
}
const get = async (path: string, who?: { token: string }) => (await (await call(m.h, path, undefined, hdr(who))).json()) as Body;
const all = (c: Body) => c.data.tabs.find((t: [string, number]) => t[0] === 'all')[1] as number;

beforeAll(async () => {
  m = await matrix('conversation.bulk_update');
  registerInboxBulkKind();
  const authz = m.h.app.get(AuthzResolver, { strict: false });
  deps = {
    authzOf: async (ws, userId) => {
      const mem = userId ? await m.h.platform.membership.findFirst({ where: { workspaceId: ws, userId, status: 'active' }, select: { roleKey: true, delegations: true } }) : null;
      return mem ? authz.resolve(ws, userId!, mem) : null;
    },
    allowed: allowedAction,
    now: () => m.h.clock.now(),
    owner: 'test-worker',
  };
}, 120_000);
afterAll(() => m?.close());

describe('conversation.bulk_update — kết quả từng hội thoại', () => {
  it('sales: hội thoại ngoài scope + id không có → lỗi riêng; hội thoại của mình xong; không đổi → skipped', async () => {
    const mine = await m.conv({ title: 'BR mine', assignee: m.sales.id });
    const other = await m.conv({ title: 'BR other', assignee: m.h.user });
    const ghost = uuidv7();
    const r = await ui('conversation.bulk_update', { conversation_ids: [mine.id, other.id, ghost, mine.id], status: 'closed' }, m.sales);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.preview).toMatchObject({ count: 1, warnings: expect.arrayContaining(['denied:2']) });
    expect(r.body.data.result.items).toEqual([
      { id: mine.id, status: 'done', error: null },
      { id: other.id, status: 'failed', error: expect.stringMatching(/^(NOT_FOUND|SCOPE_FORBIDDEN)/) },
      { id: ghost, status: 'failed', error: expect.stringMatching(/^NOT_FOUND/) },
    ]);
    expect(r.body.data.result).toMatchObject({ updated: 1, failed: 2 });
    const again = await ui('conversation.bulk_update', { conversation_ids: [mine.id], status: 'closed' }, m.sales);
    expect(again.body.data.result.items[0]).toMatchObject({ status: 'skipped' });
  });

  it('gán người phụ trách cần inbox.assign (sales không có → 403)', async () => {
    const c = await m.conv({ title: 'BR assign', assignee: m.sales.id });
    const r = await ui('conversation.bulk_update', { conversation_ids: [c.id], assignee_user_id: m.sales.id }, m.sales);
    expect([r.status, r.body.error.code]).toEqual([403, 'FORBIDDEN']);
  });

  it('undo chỉ khôi phục trường còn là giá trị lô — hội thoại người khác đã đổi sau giữ nguyên', async () => {
    const a = await m.conv({ title: 'BR undo A' });
    const b = await m.conv({ title: 'BR undo B' });
    const r = await ui('conversation.bulk_update', { conversation_ids: [a.id, b.id], status: 'pending' });
    const db = await m.db();
    await db.conversation.update({ where: { id: b.id }, data: { status: 'closed' } });
    expect((await m.undo(r.body.data.action_log_id)).status).toBe(200);
    expect((await db.conversation.findUniqueOrThrow({ where: { id: a.id } })).status).toBe('open');
    expect((await db.conversation.findUniqueOrThrow({ where: { id: b.id } })).status).toBe('closed');
  });

  it('> 50 → 202 job_accepted; worker áp từng hội thoại, id không thấy → failed; undo việc nền → 409', async () => {
    const real = [await m.conv({ title: 'BR job 1' }), await m.conv({ title: 'BR job 2' })].map((x) => x.id);
    const ids = [...real, ...Array.from({ length: 50 }, () => uuidv7())];
    const r = await ui('conversation.bulk_update', { conversation_ids: ids, archive: true });
    expect(r.status, JSON.stringify(r.body)).toBe(202);
    expect(r.preview.warnings).toContain('mode:job');
    expect(r.body.data).toMatchObject({ status: 'job_accepted' });
    const db = await m.db();
    const jobId = r.body.data.job_id as string;
    expect(await db.dataJobItem.count({ where: { jobId } })).toBe(52);
    await runDataJob(db, m.h.ws, jobId, deps);
    const job = await db.dataJob.findUniqueOrThrow({ where: { id: jobId } });
    expect([job.done, job.failed]).toEqual([2, 50]);
    for (const id of real) expect((await db.conversation.findUniqueOrThrow({ where: { id } })).archivedAt).not.toBeNull();
    const log = await db.actionLog.findFirstOrThrow({ where: { actionId: 'conversation.bulk_update' }, orderBy: { createdAt: 'desc' } });
    expect((await m.undo(log.id)).status).toBe(409);
  });
});

describe('alias "bỏ" — trạng thái mong muốn', () => {
  it('unhide / untag / unpin: đang bật → tắt; đang tắt → không đổi, không bật lại', async () => {
    const c = await m.conv({ title: 'BR alias' });
    await m.seed('conversation.hide', { conversation_id: c.id, hidden: true });
    expect(await m.seed('conversation.unhide', { conversation_id: c.id })).toEqual({ hidden: false });
    expect(await m.seed('conversation.unhide', { conversation_id: c.id })).toEqual({ hidden: false });
    await m.seed('conversation.set_tags', { conversation_id: c.id, tags: ['VIP', 'Hẹn lại'] });
    expect(await m.seed('conversation.untag', { conversation_id: c.id, tag: 'vip' })).toEqual({ tags: ['Hẹn lại'] });
    expect(await m.seed('conversation.untag', { conversation_id: c.id, tag: 'vip' })).toEqual({ tags: ['Hẹn lại'] });
    await m.seed('message.pin', { conversation_id: c.id, message_id: c.message, pinned: true });
    await m.seed('message.unpin', { conversation_id: c.id, message_id: c.message });
    await m.seed('message.unpin', { conversation_id: c.id, message_id: c.message });
    const db = await m.db();
    const row = await db.conversation.findUniqueOrThrow({ where: { id: c.id } });
    expect([row.hiddenAt, row.pinnedMessageId]).toEqual([null, null]);
  });

  it('unreact: Zalo chưa có cảm xúc → không gửi lệnh (200, không job); kênh không hỗ trợ cảm xúc → 409', async () => {
    const z = await m.conv({ title: 'BR react zalo', channel: 'zalo_personal' });
    expect(await m.seed('message.unreact', { conversation_id: z.id, message_id: z.message })).toEqual({ emoji: null });
    const w = await m.conv({ title: 'BR react web' });
    const res = await call(m.h, '/actions/message.unreact', { input: { conversation_id: w.id, message_id: w.message } }, { 'idempotency-key': uuidv7() });
    expect(res.status).toBe(409);
  });
});

describe('đếm thư mục theo bộ lọc (§B.4)', () => {
  it('channel / q áp vào đếm như danh sách', async () => {
    await m.conv({ title: 'BRCOUNT zalo', channel: 'zalo_personal' });
    const total = all(await get('/conversations/counts'));
    const zalo = all(await get('/conversations/counts?channel=zalo_personal'));
    const list = await get('/conversations?channel=zalo_personal&limit=100');
    expect(zalo).toBeLessThan(total);
    expect(zalo).toBe(list.data.length);
    expect(all(await get('/conversations/counts?q=BRCOUNT'))).toBe(1);
    const ch = (await get('/conversations/counts?channel=zalo_personal')).data.channels as [string, number][];
    expect(ch.map((x) => x[0])).toEqual(expect.arrayContaining(['webchat', 'zalo_personal']));
  });
});
