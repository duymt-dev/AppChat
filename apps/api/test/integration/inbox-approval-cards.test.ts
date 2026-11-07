// TIP-025b §G (HTTP thật + Postgres): GET /v1/conversations/:id/approvals chỉ trả yêu cầu duyệt có run gắn ĐÚNG hội thoại (không dò chữ
// trong input — yêu cầu khác hội thoại nhắc id hội thoại này trong input vẫn không vào); hội thoại ngoài scope → 404; không có
// approvals.decide (sales) → rỗng; Owner can_decide; đã duyệt chưa chạy → executed false; hết hạn → expired; duyệt qua approval.reject
// cập nhật thẻ; EXPLAIN theo index run + hội thoại.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { call } from './setup';
import { matrix, type Matrix, type Who } from './helpers/action-matrix';

let m: Matrix;
let c: { id: string };
let other: { id: string };
let hidden: { id: string };
const ids: Record<string, string> = {};

async function seedRun(conversationId: string) {
  const db = await m.db();
  const id = uuidv7();
  await db.aiRun.create({ data: { id, rootRunId: id, kind: 'agent_reply', tier: 'standard', input: {}, status: 'waiting_approval', conversationId, initiatedByUserId: m.h.user, startedAt: m.h.clock.now() } });
  return id;
}
async function seedApproval(runId: string | null, o: { title: string; status?: 'pending' | 'approved' | 'rejected'; expired?: boolean; executed?: boolean; input?: Record<string, unknown> }) {
  const db = await m.db();
  const id = uuidv7();
  const now = m.h.clock.now();
  await db.approvalRequest.create({
    data: {
      id, runId, actionId: 'quote.approve', input: (o.input ?? { quote_id: 'q1' }) as object, inputHash: id, risk: 'money', permission: 'quote.approve', title: o.title, source: 'agent',
      status: o.status ?? 'pending', requestedAt: now, expiresAt: new Date(now.getTime() + (o.expired ? -60_000 : 3_600_000)),
      ...(o.executed ? { executedAt: now } : {}),
    },
  });
  return id;
}

beforeAll(async () => {
  m = await matrix('conversation.approvals');
  c = await m.conv({ body: 'Khách hỏi giá' });
  other = await m.conv({ body: 'Hội thoại khác' });
  hidden = await m.conv({ body: 'Không phụ trách', assignee: (await m.h.member('manager')).id });
  const run = await seedRun(c.id);
  ids.pending = await seedApproval(run, { title: 'Duyệt báo giá' });
  ids.approved = await seedApproval(run, { title: 'Đã duyệt chờ chạy', status: 'approved' });
  ids.expired = await seedApproval(run, { title: 'Hết hạn', expired: true });
  ids.leak = await seedApproval(await seedRun(other.id), { title: 'Khác hội thoại', input: { conversation_id: c.id } });
  await seedApproval(null, { title: 'Không run', input: { conversation_id: c.id } });
}, 120_000);
afterAll(() => m?.close());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const get = async (id: string, who?: Who): Promise<{ status: number; body: any }> => {
  const r = await call(m.h, `/conversations/${id}/approvals`, undefined, who ? { authorization: `Bearer ${who.token}` } : {});
  return { status: r.status, body: await r.json() };
};

describe('inbox approval cards', () => {
  it('chỉ yêu cầu của run gắn hội thoại; trạng thái + executed + can_decide', async () => {
    const r = await get(c.id);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const by: Record<string, { status: string; executed?: boolean }> = Object.fromEntries(r.body.data.items.map((x: { id: string }) => [x.id, x]));
    expect(Object.keys(by).sort()).toEqual([ids.pending, ids.approved, ids.expired].sort());
    expect(by[ids.pending!]).toMatchObject({ status: 'pending', can_decide: true });
    expect(by[ids.approved!]).toMatchObject({ status: 'approved', executed: false });
    expect(by[ids.expired!]!.status).toBe('expired');
    expect(r.body.data.pending).toBe(1);
  });

  it('ngoài scope → 404; không có approvals.decide → rỗng', async () => {
    expect((await get(hidden.id, m.sales)).status).toBe(404);
    const s = await get(c.id, m.cs);
    expect([200, 404]).toContain(s.status);
    if (s.status === 200) expect(s.body.data).toEqual({ items: [], pending: 0 });
  });

  it('action đọc cho Trợ lý cùng kết quả; từ chối cập nhật thẻ', async () => {
    const a = await m.act({ conversation_id: c.id });
    expect(a.status, JSON.stringify(a.body)).toBe(200);
    expect(a.body.data.result.pending).toBe(1);
    const rej = await call(m.h, '/actions/approval.reject', { input: { approval_id: ids.pending, note: 'không' } });
    expect(rej.status, await rej.text()).toBe(200);
    const r = await get(c.id);
    expect(r.body.data.items.find((x: { id: string }) => x.id === ids.pending).status).toBe('rejected');
    expect(r.body.data.pending).toBe(0);
  });

  it('EXPLAIN: run theo hội thoại + approval theo run_id', async () => {
    const db = await m.db();
    const plan = async (sql: string) => (await db.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(`EXPLAIN ${sql}`)).map((r) => r['QUERY PLAN']).join('\n');
    await db.$executeRawUnsafe('SET enable_seqscan = off');
    expect(await plan(`SELECT id FROM ai_run WHERE conversation_id = '${c.id}' ORDER BY started_at DESC LIMIT 500`)).toMatch(/ai_run_conversation_idx/);
    expect(await plan(`SELECT * FROM approval_request WHERE run_id IN ('${ids.pending}') ORDER BY requested_at DESC LIMIT 50`)).toMatch(/approval_request_run_idx/);
    await db.$executeRawUnsafe('RESET enable_seqscan');
  });
});
