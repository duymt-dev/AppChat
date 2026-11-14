// TIP-025b §B.6 — GET /v1/conversations/:id/assignees: người + agent đang chạy nhận đúng loại kênh (channels rỗng = mọi kênh), kèm tải
// mở (open / pending / snoozed, chưa lưu trữ / ẩn); agent nháp / đã xoá / khác kênh không hiện; current đánh dấu người phụ trách;
// tìm theo tên; trang 30; không inbox.assign → 403; ngoài scope → 404; EXPLAIN tải agent theo index riêng.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { assigneeCandidatesSchema } from '@appchat/shared';
import { call } from './setup';
import { matrix, type Matrix, type Who } from './helpers/action-matrix';

let m: Matrix;
let c: { id: string };
let hidden: { id: string };
const bot = { web: uuidv7(), all: uuidv7(), zalo: uuidv7(), draft: uuidv7(), gone: uuidv7() };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const get = async (path: string, who?: Who): Promise<{ status: number; body: any }> => {
  const r = await call(m.h, path, undefined, who ? { authorization: `Bearer ${who.token}` } : {});
  return { status: r.status, body: await r.json() };
};

beforeAll(async () => {
  m = await matrix('conversation.assign');
  c = await m.conv({ body: 'Cần người hỗ trợ', assignee: m.h.user });
  hidden = await m.conv({ body: 'Không phụ trách', assignee: (await m.h.member('manager')).id });
  const db = await m.db();
  const now = m.h.clock.now();
  await db.aiAgent.createMany({
    data: [
      { id: bot.web, name: 'Bot Web', status: 'active', publishedVersion: 2, channels: ['webchat'], roleLabel: 'CSKH' },
      { id: bot.all, name: 'Bot Mọi kênh', status: 'active', publishedVersion: 1, channels: [] },
      { id: bot.zalo, name: 'Bot Zalo', status: 'active', publishedVersion: 1, channels: ['zalo_personal'] },
      { id: bot.draft, name: 'Bot Nháp', status: 'draft', publishedVersion: 0, channels: [] },
      { id: bot.gone, name: 'Bot Xoá', status: 'active', publishedVersion: 1, channels: [], deletedAt: now },
    ],
  });
  for (const status of ['open', 'pending', 'closed'] as const) {
    const x = await m.conv({ body: status });
    await db.conversation.update({ where: { id: x.id }, data: { assigneeAgentId: bot.web, status } });
  }
}, 120_000);
afterAll(() => m?.close());

describe('ứng viên phụ trách', () => {
  it('người + agent đúng kênh, tải mở, current', async () => {
    const r = await get(`/conversations/${c.id}/assignees`);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const p = assigneeCandidatesSchema.parse(r.body);
    const agents = p.data.filter((x) => x.kind === 'agent').map((x) => x.id);
    expect(agents.sort()).toEqual([bot.web, bot.all].sort());
    expect(p.data.find((x) => x.id === bot.web)).toMatchObject({ load: 2, role: 'CSKH', version: 2, current: false, co_assignee: false });
    const me = p.data.find((x) => x.kind === 'user' && x.id === m.h.user)!;
    expect(me.current).toBe(true);
    expect(me.co_assignee).toBe(false);
    expect(me.load).toBeGreaterThanOrEqual(1);
    expect(p.next_cursor).toBeNull();
  });

  it('co_assignee đánh dấu đồng phụ trách (conversation_assignee) — tách khỏi current', async () => {
    const db = await m.db();
    await db.conversationAssignee.create({ data: { conversationId: c.id, kind: 'agent', assigneeId: bot.all } });
    const p = assigneeCandidatesSchema.parse((await get(`/conversations/${c.id}/assignees`)).body);
    expect(p.data.find((x) => x.id === bot.all)).toMatchObject({ current: false, co_assignee: true });
    expect(p.data.find((x) => x.id === bot.web)).toMatchObject({ co_assignee: false });
    await db.conversationAssignee.deleteMany({ where: { conversationId: c.id } });
  });

  it('tìm theo tên', async () => {
    const p = assigneeCandidatesSchema.parse((await get(`/conversations/${c.id}/assignees?q=${encodeURIComponent('bot web')}`)).body);
    expect(p.data.map((x) => x.id)).toEqual([bot.web]);
  });

  it('không inbox.assign (kế toán, sales) → 403 trước scope; không thấy hội thoại → 404', async () => {
    expect((await get(`/conversations/${c.id}/assignees`, await m.h.member('accountant'))).status).toBe(403);
    expect((await get(`/conversations/${hidden.id}/assignees`, m.sales)).status).toBe(403);
    expect((await get(`/conversations/${uuidv7()}/assignees`)).status).toBe(404);
  });

  it('EXPLAIN tải agent theo conversation_agent_load_idx', async () => {
    const db = await m.db();
    await db.$executeRawUnsafe('SET enable_seqscan = off');
    const plan = (await db.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(`EXPLAIN SELECT assignee_agent_id, count(*) FROM conversation WHERE assignee_agent_id IN ('${bot.web}') AND status IN ('open','pending','snoozed') AND archived_at IS NULL AND hidden_at IS NULL GROUP BY assignee_agent_id`)).map((r) => r['QUERY PLAN']).join(' | ');
    await db.$executeRawUnsafe('RESET enable_seqscan');
    expect(plan).toMatch(/conversation_agent_load_idx/);
  });
});
