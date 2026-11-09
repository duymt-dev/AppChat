// TIP-042b — chia lead mới trên Postgres 16 thật: tin 1-1 tạo khách mới → outbox `lead.routing_requested` → consumer (như ROLE=jobs) →
// `lead_routing.apply` qua ActionExecutor nguồn system. AC2 vòng tròn 9 lead / 3 người = 3-3-3, con trỏ bền; ít việc nhất 3/1/2 → người 1;
// by_channel; manual / không ai đủ điều kiện giữ trống kèm lý do. AC3 không giành: khách cũ khớp, nhóm, gán tay trước, khách tạo trước mốc
// bật. AC4 event trùng / hai worker cùng lúc → một quyết định, con trỏ tiến một lần. AC1 cấu hình: quyền crm.reassign, CAS, undo.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { ActionExecutor, ContactIdentityService, InboundPipeline, leadRoutingConsumer, uuidv7, type DomainEvent } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let acc: string;
let acc2: string;
const users: string[] = [];
let sales: { id: string; token: string };

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown, token?: string) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...(token ? { authorization: `Bearer ${token}` } : {}) }).then(json);
const ok = async (id: string, input: unknown) => {
  const r = await act(id, input);
  if (r.status !== 200) throw new Error(`${id} ${r.status} ${JSON.stringify(r.body)}`);
  return r.body.data;
};
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const pipeline = new InboundPipeline(new ContactIdentityService());
const consumer = () => leadRoutingConsumer(h.app.get(ActionExecutor, { strict: false }));
let seq = 0;

/** Tin vào 1-1 (hoặc nhóm) từ người gửi `ext` → id event `lead.routing_requested` (null nếu pipeline không phát). */
async function inbound(account: string, ext: string, o: { group?: boolean; phone?: string } = {}) {
  const db = await tenant();
  seq++;
  const r = await pipeline.handle(db, h.ws, {
    channelAccountId: account, externalThreadId: o.group ? `g-${ext}` : `t-${ext}`, externalMsgId: `m-${ext}-${seq}`, isGroup: !!o.group,
    sender: { externalId: ext, name: `Khách ${ext}`, ...(o.phone ? { phone: o.phone } : {}) }, kind: 'text', text: 'Xin chào', sentAt: h.clock.now().toISOString(), raw: {},
  }, h.clock.now());
  const ev = r.events.find((e) => e.topic === 'lead.routing_requested');
  if (!ev) return null;
  const row = await db.outboxEvent.findFirstOrThrow({ where: { topic: 'lead.routing_requested', payload: { path: ['message_id'], equals: r.messageId! } } });
  return { id: row.id, contact: ev.payload.contact_id as string, conversation: r.conversationId! };
}
const deliver = async (eventId: string) => {
  const db = await tenant();
  const row = await db.outboxEvent.findUniqueOrThrow({ where: { id: eventId } });
  const e: DomainEvent = { id: row.id, topic: row.topic, workspaceId: h.ws, payload: row.payload as Record<string, unknown>, traceId: null };
  await consumer().handle(e, db);
};
const ownerOf = async (contact: string) => (await (await tenant()).contact.findUniqueOrThrow({ where: { id: contact }, select: { ownerUserId: true } })).ownerUserId;
const decision = async (contact: string) => (await tenant()).leadRoutingDecision.findUnique({ where: { contactId: contact } });
const rule = (o: Record<string, unknown>) => ok('lead_routing.update', o).then((d) => d.result as { rule_id: string; version: number });

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  const db = await tenant();
  acc = uuidv7();
  acc2 = uuidv7();
  await db.channelAccount.create({ data: { id: acc, type: 'zalo_personal', name: 'Zalo Spa', externalId: `z-${acc.slice(-6)}`, status: 'connected', settings: {} } });
  await db.channelAccount.create({ data: { id: acc2, type: 'webchat', name: 'Web', status: 'connected', settings: {} } });
  for (let i = 0; i < 3; i++) users.push((await h.member('sales')).id);
  users.sort();
  sales = await h.member('sales');
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('cấu hình (AC1)', () => {
  it('chưa có rule → tin mới vẫn phát event nhưng giữ hàng chung (manual); sales không có crm.reassign → 403', async () => {
    const e = (await inbound(acc, 'pre-1'))!;
    await deliver(e.id);
    expect(await ownerOf(e.contact)).toBeNull();
    expect((await decision(e.contact))?.reason).toBe('manual');
    expect((await act('lead_routing.update', { enabled: true, mode: 'round_robin', user_ids: users }, sales.token)).status).toBe(403);
    expect((await call(h, '/settings/lead-routing', undefined, { authorization: `Bearer ${sales.token}` })).status).toBe(403);
  });

  it('tạo rule mặc định; trùng → 409; sửa thiếu / lệch version → 422 / 409; người không thuộc workspace → 422', async () => {
    const r = await rule({ enabled: false, mode: 'round_robin', user_ids: users });
    expect(r.version).toBe(1);
    expect((await act('lead_routing.update', { enabled: false, mode: 'manual' })).status).toBe(409);
    expect((await act('lead_routing.update', { rule_id: r.rule_id, enabled: false, mode: 'manual' })).body.error.fields).toMatchObject({ if_version: 'required' });
    expect((await act('lead_routing.update', { rule_id: r.rule_id, if_version: 9, enabled: false, mode: 'manual' })).status).toBe(409);
    expect((await act('lead_routing.update', { rule_id: r.rule_id, if_version: 1, enabled: true, mode: 'round_robin', user_ids: [uuidv7()] })).status).toBe(422);
    expect((await act('lead_routing.update', { rule_id: r.rule_id, if_version: 1, enabled: true, mode: 'shift', user_ids: users })).status).toBe(422);
  });
});

describe('chọn người (AC2) + không giành (AC3)', () => {
  it('bật vòng tròn: khách tạo TRƯỚC mốc bật không hồi tố; 9 lead mới → 3-3-3, hội thoại 1-1 cùng người', async () => {
    const before = (await inbound(acc, 'before-on'))!;
    h.clock.advance(1000);
    const cur = (await tenant()).leadRoutingRule.findFirstOrThrow({ where: { channelAccountId: null } });
    await rule({ rule_id: (await cur).id, if_version: (await cur).version, enabled: true, mode: 'round_robin', user_ids: users });
    await deliver(before.id);
    expect((await decision(before.contact))?.reason).toBe('before_enabled');
    expect(await ownerOf(before.contact)).toBeNull();
    h.clock.advance(1000);
    const got: string[] = [];
    for (let i = 0; i < 9; i++) {
      const e = (await inbound(acc, `rr-${i}`))!;
      await deliver(e.id);
      const o = (await ownerOf(e.contact))!;
      got.push(o);
      expect((await (await tenant()).conversation.findUniqueOrThrow({ where: { id: e.conversation } })).assigneeUserId).toBe(o);
    }
    expect(users.map((u) => got.filter((g) => g === u).length)).toEqual([3, 3, 3]);
    expect(got.slice(0, 3)).toEqual(users);
  });

  it('khách cũ khớp / nhóm → không phát event; hội thoại đã gán tay trước worker → giữ, lý do manually_assigned', async () => {
    expect(await inbound(acc, 'rr-0')).toBeNull();
    expect(await inbound(acc, 'grp-1', { group: true })).toBeNull();
    const e = (await inbound(acc, 'manual-1'))!;
    await (await tenant()).conversation.update({ where: { id: e.conversation }, data: { assigneeUserId: users[2] } });
    await deliver(e.id);
    expect(await ownerOf(e.contact)).toBeNull();
    expect((await decision(e.contact))?.reason).toBe('manually_assigned');
  });

  it('ít việc nhất: tải 3/1/2 → người tải 1 (hoà vòng tròn)', async () => {
    const db = await tenant();
    const d = await db.leadRoutingRule.findFirstOrThrow({ where: { channelAccountId: null } });
    await rule({ rule_id: d.id, if_version: d.version, enabled: true, mode: 'least_busy', user_ids: users });
    const load = (await db.$queryRaw<{ u: string; n: bigint }[]>`SELECT assignee_user_id::text AS u, count(*) AS n FROM conversation WHERE assignee_user_id IS NOT NULL GROUP BY 1`);
    const n = new Map(load.map((r) => [r.u, Number(r.n)]));
    const min = Math.min(...users.map((u) => n.get(u) ?? 0));
    const e = (await inbound(acc, 'lb-1'))!;
    await deliver(e.id);
    expect(n.get((await ownerOf(e.contact))!) ?? 0).toBe(min);
  });

  it('ít việc nhất đếm CẢ đồng phụ trách (conversation_assignee) — thêm 5 đồng phụ trách cho người tải thấp nhất → không còn là người tải thấp nhất', async () => {
    const db = await tenant();
    const d = await db.leadRoutingRule.findFirstOrThrow({ where: { channelAccountId: null } });
    await rule({ rule_id: d.id, if_version: d.version, enabled: true, mode: 'least_busy', user_ids: users });
    const load = (await db.$queryRaw<{ u: string; n: bigint }[]>`
      SELECT u, count(*) AS n FROM (
        SELECT assignee_user_id AS u FROM conversation WHERE assignee_user_id IS NOT NULL AND status IN ('open','pending','snoozed') AND archived_at IS NULL AND hidden_at IS NULL
        UNION ALL
        SELECT ca.assignee_id AS u FROM conversation_assignee ca JOIN conversation c ON c.id = ca.conversation_id
        WHERE ca.kind = 'user' AND c.status IN ('open','pending','snoozed') AND c.archived_at IS NULL AND c.hidden_at IS NULL
      ) t GROUP BY u`);
    const n = new Map(load.map((r) => [r.u, Number(r.n)]));
    const lowest = users.reduce((best, u) => ((n.get(u) ?? 0) < (n.get(best) ?? 0) ? u : best), users[0]!);
    // Chất 5 hội thoại mở, gán lowest làm ĐỒNG phụ trách (không đổi assignee_user_id) — chỉ chạm bảng conversation_assignee.
    for (let i = 0; i < 5; i++) {
      const conv = await db.conversation.create({
        data: { id: uuidv7(), channelAccountId: acc, channelType: 'zalo_personal', externalThreadId: `co-${i}-${uuidv7()}`, title: `Đồng phụ trách ${i}`, status: 'open' },
      });
      await db.conversationAssignee.create({ data: { conversationId: conv.id, kind: 'user', assigneeId: lowest } });
    }
    const e = (await inbound(acc, 'lb-coassignee'))!;
    await deliver(e.id);
    expect(await ownerOf(e.contact)).not.toBe(lowest);
  });

  it('EXPLAIN nhánh đồng phụ trách theo conversation_assignee_kind_assignee_id_conversation_id_idx', async () => {
    const db = await tenant();
    await db.$executeRawUnsafe('SET enable_seqscan = off');
    const plan = (await db.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(`EXPLAIN SELECT assignee_id FROM conversation_assignee WHERE kind = 'user' AND assignee_id = ANY(ARRAY['${users[0]}']::uuid[])`))
      .map((r) => r['QUERY PLAN'])
      .join(' | ');
    await db.$executeRawUnsafe('RESET enable_seqscan');
    expect(plan).toMatch(/conversation_assignee_kind_assignee_id_conversation_id_idx/);
  });

  it('ghi đè by_channel người cố định; ghi đè manual không lùi về mặc định', async () => {
    const o = await rule({ channel_account_id: acc2, enabled: true, mode: 'by_channel', user_ids: [users[1]], fixed_user_id: users[1] });
    const w = (await inbound(acc2, 'web-1'))!;
    await deliver(w.id);
    expect(await ownerOf(w.contact)).toBe(users[1]);
    await rule({ rule_id: o.rule_id, if_version: o.version, enabled: false, mode: 'manual' });
    const w2 = (await inbound(acc2, 'web-2'))!;
    await deliver(w2.id);
    expect(await ownerOf(w2.contact)).toBeNull();
    expect((await decision(w2.contact))?.reason).toBe('manual');
  });
});

describe('đua + chạy lại (AC4)', () => {
  it('cùng event giao hai lần + hai worker song song → một quyết định, một chủ, con trỏ tiến một lần', async () => {
    const db = await tenant();
    const d = await db.leadRoutingRule.findFirstOrThrow({ where: { channelAccountId: null } });
    await rule({ rule_id: d.id, if_version: d.version, enabled: true, mode: 'round_robin', user_ids: users });
    const cur0 = (await db.leadRoutingCursor.findUniqueOrThrow({ where: { ruleId: d.id } })).lastUserId;
    const e = (await inbound(acc, 'race-1'))!;
    const rs = await Promise.allSettled([deliver(e.id), deliver(e.id), deliver(e.id)]);
    expect(rs.filter((r) => r.status === 'fulfilled').length).toBeGreaterThan(0);
    await deliver(e.id);
    expect(await db.leadRoutingDecision.count({ where: { contactId: e.contact } })).toBe(1);
    const owner = await ownerOf(e.contact);
    expect(owner).not.toBeNull();
    const cur1 = (await db.leadRoutingCursor.findUniqueOrThrow({ where: { ruleId: d.id } })).lastUserId;
    expect(cur1).toBe(owner);
    expect(cur1).not.toBe(cur0);
    const owned = await db.outboxEvent.count({ where: { topic: 'contact.owner_changed', payload: { path: ['contact_id'], equals: e.contact } } });
    expect(owned).toBe(1);
  });

  it('hai lead khác nhau song song → hai người khác nhau (cursor khoá tuần tự), không ai nhận hai lần liền', async () => {
    const a = (await inbound(acc, 'par-a'))!;
    const b = (await inbound(acc, 'par-b'))!;
    await Promise.all([deliver(a.id), deliver(b.id)]);
    const [oa, ob] = [await ownerOf(a.contact), await ownerOf(b.contact)];
    expect(oa && ob && oa !== ob).toBe(true);
  });

  it('khách đã có chủ (chuyển tay đua trước worker) → giữ chủ, lý do has_owner', async () => {
    const e = (await inbound(acc, 'steal-1'))!;
    await (await tenant()).contact.update({ where: { id: e.contact }, data: { ownerUserId: users[0] } });
    await deliver(e.id);
    expect(await ownerOf(e.contact)).toBe(users[0]);
    expect((await decision(e.contact))?.reason).toBe('has_owner');
  });

  it('gọi apply qua HTTP (kể cả Owner, nguồn assistant) → bị chặn', async () => {
    const e = (await inbound(acc, 'http-1'))!;
    const r = await act('lead_routing.apply', { event_id: e.id });
    expect([403, 404]).toContain(r.status);
    expect(await ownerOf(e.contact)).toBeNull();
  });
});

describe('undo (AC1)', () => {
  it('undo cấu hình trả rule về trước, không đảo chủ lead đã cấp', async () => {
    const db = await tenant();
    const d = await db.leadRoutingRule.findFirstOrThrow({ where: { channelAccountId: null } });
    const r = await ok('lead_routing.update', { rule_id: d.id, if_version: d.version, enabled: false, mode: 'manual' });
    const owners = await db.contact.count({ where: { ownerUserId: { not: null } } });
    const u = await call(h, `/action-logs/${r.action_log_id}/undo`, {}).then(json);
    expect(u.status).toBe(200);
    const back = await db.leadRoutingRule.findUniqueOrThrow({ where: { id: d.id } });
    expect([back.enabled, back.mode]).toEqual([true, 'round_robin']);
    expect(await db.contact.count({ where: { ownerUserId: { not: null } } })).toBe(owners);
  });
});
