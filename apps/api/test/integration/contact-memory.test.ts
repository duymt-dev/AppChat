// TIP-015b trí nhớ khách trên Postgres 16 thật: contact.remember (trùng văn bản trigram ≥ 0.9 → làm mới, ngay dưới 0.9 → dòng mới; trần 50
// kể cả 51 lệnh đồng thời; chặn CCCD / thẻ / mật khẩu), scope (sales khác / watcher), agent trực kênh chỉ nhớ khách của hội thoại đang phục
// vụ, memory_forget + hoàn tác (cap đầy → 409), gộp khách 50 + 50 (chống trùng, giữ 50, biên nhận lossless, hoàn tác / xung đột sau gộp),
// quét biên nhận hết hạn (biên giới hạn, replay idempotent), ngữ cảnh agent đọc ≤ 20 fact mới nhất, EXPLAIN đọc trí nhớ dùng index.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { ActionExecutor, MERGE_UNDO_MS, agentAuthz, normFact, purgeMergeReceipts, uuidv7, type ActionContext } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u: { token: string }) => ({ authorization: `Bearer ${u.token}` });
const act = (id: string, input: unknown, who?: { token: string }, key = uuidv7()) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': key, ...(who ? as(who) : {}) }).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const ok = (r: { status: number; body: unknown }) => {
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return (r.body as { data: { result: Record<string, any> } }).data.result; // eslint-disable-line @typescript-eslint/no-explicit-any
};
let phone = 0;
const contact = async (name: string, who?: { token: string }) => ok(await act('contact.create', { full_name: name, phone: `09095${String(++phone).padStart(5, '0')}` }, who)).contact_id as string;
const remember = (contact_id: string, fact: string, confidence?: number, who?: { token: string }) => act('contact.remember', { contact_id, fact, ...(confidence === undefined ? {} : { confidence }) }, who);
const facts = async (contactId: string) => (await tenant()).contactMemory.findMany({ where: { contactId }, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }] });
const rev = async (contactId: string) => (await (await tenant()).contactRevision.findUnique({ where: { contactId } }))?.memoryRev ?? 0n;
const fill = async (contactId: string, n: number, prefix: string) => {
  for (let i = 0; i < n; i++) ok(await remember(contactId, `${prefix} số ${i} thích màu ${['đỏ', 'xanh', 'tím', 'vàng', 'cam'][i % 5]} kiểu ${i * 7919}`, 0.5 + (i % 5) / 10));
};

// Trigram (bỏ dấu): BASE ~ NEAR = 0.9467 (≥ 0.9 → trùng), BASE ~ BELOW = 0.88 (ngay dưới → fact mới).
const BASE = 'Khách thích uống trà xanh không đường vào buổi sáng trước khi làm liệu trình chăm sóc da mặt';
const NEAR = 'Khách thích uống trà xanh không đường vào buổi sáng trước khi làm liệu trình chăm sóc da mặt nhé';
const BELOW = 'Khách thích dùng trà xanh không đường vào buổi tối trước khi làm liệu trình chăm sóc da mặt';

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('contact.remember', () => {
  it('ghi fact + nguồn từ server; trùng văn bản ≥ 0.9 → làm mới (tin cậy cao hơn), ngay dưới 0.9 → dòng mới; revision + outbox mỗi lần', async () => {
    const lan = await contact('Chị Lan TN');
    const a = ok(await remember(lan, BASE, 0.6));
    expect(a).toMatchObject({ status: 'created', evicted_id: null });
    expect(await rev(lan)).toBe(1n);
    h.clock.advance(1000);
    const b = ok(await remember(lan, NEAR, 0.9));
    expect(b).toEqual({ memory_id: a.memory_id, status: 'refreshed', evicted_id: null });
    ok(await remember(lan, BASE.toUpperCase(), 0.3));
    const c = ok(await remember(lan, BELOW));
    expect(c.status).toBe('created');
    const rows = await facts(lan);
    expect(rows).toHaveLength(2);
    const first = rows.find((r) => r.id === a.memory_id)!;
    expect(first).toMatchObject({ fact: BASE, factNorm: normFact(BASE), confidence: expect.closeTo(0.9, 5), actorType: 'user', actorId: h.user });
    expect(first.updatedAt.getTime()).toBeGreaterThan(first.createdAt.getTime());
    expect(await rev(lan)).toBe(4n);
    const db = await tenant();
    expect(await db.outboxEvent.count({ where: { topic: 'contact.memory_changed' } })).toBeGreaterThanOrEqual(4);
  });

  it('input sai / nhạy cảm bị chặn trước ghi: rỗng, confidence > 1, CCCD, thẻ, mật khẩu, id lạ', async () => {
    const lan = await contact('Chị Lan Chặn');
    for (const [fact, conf, field] of [
      ['   ', undefined, 'fact'],
      ['thích trà', 1.5, 'confidence'],
      ['CCCD 079123456789', undefined, 'fact'],
      ['thẻ 4111 1111 1111 1111', undefined, 'fact'],
      ['mật khẩu wifi là abc', undefined, 'fact'],
    ] as const) {
      const r = await remember(lan, fact, conf);
      expect(r.status, fact).toBe(422);
      expect(Object.keys(r.body.error.fields ?? {})).toContain(field);
    }
    expect((await remember(uuidv7(), 'thích trà')).status).toBe(404);
    expect((await act('contact.memory_forget', { memory_id: uuidv7() })).status).toBe(404);
    expect(await facts(lan)).toHaveLength(0);
  });

  it('51 lệnh nhớ đồng thời cùng khách → đúng 50 dòng, không trùng chuẩn hoá', async () => {
    const lan = await contact('Chị Lan Đồng Thời');
    const rs = await Promise.all(Array.from({ length: 51 }, (_, i) => remember(lan, `Sự kiện độc lập ${i} mã ${(i * 104729).toString(36)} kiểu ${'abcdefghij'[i % 10]}`, 0.5)));
    expect(rs.map((r) => r.status).every((s) => s === 200), JSON.stringify(rs.find((r) => r.status !== 200)?.body)).toBe(true);
    const rows = await facts(lan);
    expect(rows).toHaveLength(50);
    expect(new Set(rows.map((r) => r.factNorm)).size).toBe(50);
    expect(rs.filter((r) => r.body.data.result.evicted_id).length).toBe(1);
  });

  it('đầy 50: bỏ fact tin cậy thấp nhất (rồi cũ nhất); preview Trợ lý báo cap:50', async () => {
    const lan = await contact('Chị Lan Đầy');
    await fill(lan, 49, 'Điều');
    h.clock.advance(1000);
    const low = ok(await remember(lan, 'Điều tin cậy thấp: khách hay đổi lịch', 0.1)).memory_id;
    const pv = await act('contact.remember', { contact_id: lan, fact: 'Khách mới chuyển nhà sang quận 7' }, undefined, uuidv7());
    expect(pv.status).toBe(200);
    expect(pv.body.data.result.evicted_id).toBe(low);
    expect(await facts(lan)).toHaveLength(50);
    const r = await call(h, '/actions/contact.remember', { input: { contact_id: lan, fact: 'Khách thích nhân viên Hoa' } }, { 'idempotency-key': uuidv7(), 'x-action-source': 'assistant' }).then(json);
    expect(r.status).toBe(202);
    expect(r.body.data.preview.warnings).toContain('cap:50');
  });

  it('scope: sales khác → 404 · watcher → 403 · kế toán (không crm.edit) → 403', async () => {
    const salesA = await h.member('sales');
    const salesB = await h.member('sales');
    const lan = await contact('Chị Lan Scope', salesA);
    expect((await remember(lan, 'thích trà', undefined, salesB)).status).toBe(404);
    ok(await act('contact.add_collaborator', { contact_id: lan, user_id: salesB.id, role: 'watcher' }, salesA));
    expect((await remember(lan, 'thích trà', undefined, salesB)).status).toBe(403);
    expect((await remember(lan, 'thích trà', undefined, await h.member('accountant'))).status).toBe(403);
    const m = ok(await remember(lan, 'thích trà', undefined, salesA));
    expect((await act('contact.memory_forget', { memory_id: m.memory_id }, salesB)).status).toBe(403);
  });
});

describe('agent trực kênh', () => {
  const agentCtx = (conv: string | undefined): ActionContext => {
    const agent = { id: uuidv7(), toolIds: ['contact.remember'] };
    return { workspaceId: h.ws, source: 'agent', actor: { type: 'agent', id: agent.id }, runId: uuidv7(), authz: agentAuthz(agent), idempotencyKey: uuidv7(), ...(conv ? { servedConversationId: conv } : {}) };
  };

  it('chỉ nhớ khách của hội thoại đang phục vụ; khách khác / không có hội thoại → 403, không ghi', async () => {
    const lan = await contact('Chị Lan Agent');
    const other = await contact('Anh Minh Agent');
    const db = await tenant();
    const account = uuidv7();
    await db.channelAccount.create({ data: { id: account, type: 'webchat', name: 'web', status: 'connected' } });
    const conv = uuidv7();
    await db.conversation.create({ data: { id: conv, channelAccountId: account, channelType: 'webchat', externalThreadId: `t-${conv}`, title: 'Lan', contactId: lan, lastMessageAt: h.clock.now() } });
    const exec = h.app.get(ActionExecutor, { strict: false });
    const ctx = agentCtx(conv);
    const r = await exec.execute(ctx, 'contact.remember', { contact_id: lan, fact: 'em dị ứng tinh dầu sả' });
    expect(r.status, JSON.stringify(r)).toBe(200);
    const row = (await facts(lan))[0]!;
    expect(row).toMatchObject({ fact: 'em dị ứng tinh dầu sả', actorType: 'agent', actorId: ctx.actor.id, sourceRunId: ctx.runId });
    await expect(exec.execute(agentCtx(conv), 'contact.remember', { contact_id: other, fact: 'thích trà' })).rejects.toMatchObject({ httpStatus: 403 });
    await expect(exec.execute(agentCtx(undefined), 'contact.remember', { contact_id: lan, fact: 'thích trà' })).rejects.toMatchObject({ httpStatus: 403 });
    expect(await facts(other)).toHaveLength(0);
  });
});

describe('contact.memory_forget + hoàn tác', () => {
  it('xoá → hoàn tác khôi phục đúng dòng; khách đã đủ 50 sau xoá → hoàn tác 409, không có dòng 51', async () => {
    const lan = await contact('Chị Lan Quên');
    const m = ok(await remember(lan, 'Khách thích phòng yên tĩnh'));
    const r1 = await act('contact.memory_forget', { memory_id: m.memory_id });
    ok(r1);
    expect(await facts(lan)).toHaveLength(0);
    expect((await call(h, `/action-logs/${r1.body.data.action_log_id}/undo`, {}).then(json)).status).toBe(200);
    expect((await facts(lan)).map((f) => f.id)).toEqual([m.memory_id]);

    const r2 = await act('contact.memory_forget', { memory_id: m.memory_id });
    ok(r2);
    await fill(lan, 50, 'Đầy');
    const undo = await call(h, `/action-logs/${r2.body.data.action_log_id}/undo`, {}).then(json);
    expect(undo.status).toBe(409);
    expect(undo.body.error.code).toBe('STALE_VERSION');
    expect(await facts(lan)).toHaveLength(50);
  });
});

describe('gộp khách', () => {
  const merge = (p: string, d: string) => call(h, '/actions/contact.merge', { input: { group_ids: [`${p}~${d}`] } }, { 'idempotency-key': uuidv7(), 'x-action-source': 'assistant' }).then(json);
  const confirm = async (p: string, d: string) => {
    const pv = await merge(p, d);
    expect(pv.status).toBe(202);
    const done = await call(h, '/actions/contact.merge', { input: { group_ids: [`${p}~${d}`] }, confirm_token: pv.body.data.confirm_token }, { 'idempotency-key': uuidv7(), 'x-action-source': 'assistant' }).then(json);
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    return { preview: pv.body.data.preview, logId: done.body.data.action_log_id as string };
  };

  it('50 + 50 (1 trùng): preview báo số sau chống trùng / bị bỏ; sau gộp đúng 50; hoàn tác trả đúng hai phía', async () => {
    const p = await contact('Chị Lan Chính');
    const d = await contact('Chị Lan Phụ');
    await fill(p, 49, 'Chính');
    ok(await remember(p, BASE, 0.4));
    await fill(d, 49, 'Phụ');
    ok(await remember(d, NEAR, 0.95));
    const before = { p: (await facts(p)).map((f) => f.id).sort(), d: (await facts(d)).map((f) => f.id).sort() };
    const { preview, logId } = await confirm(p, d);
    expect(preview.changes[0].after.memory).toEqual({ total: 99, duplicates: 1, evicted: 49 });
    const after = await facts(p);
    expect(after).toHaveLength(50);
    expect(after.find((f) => f.factNorm === normFact(BASE))!.confidence).toBeCloseTo(0.95, 5);
    expect(await facts(d)).toHaveLength(0);
    const db = await tenant();
    expect(await db.contactMemoryMerge.count({ where: { primaryId: p, dupId: d } })).toBe(1);

    expect((await call(h, `/action-logs/${logId}/undo`, {}).then(json)).status).toBe(200);
    expect((await facts(p)).map((f) => f.id).sort()).toEqual(before.p);
    expect((await facts(d)).map((f) => f.id).sort()).toEqual(before.d);
    expect((await facts(p)).find((f) => f.factNorm === normFact(BASE))!.confidence).toBeCloseTo(0.4, 5);
    expect(await db.contactMemoryMerge.count({ where: { primaryId: p, dupId: d } })).toBe(0);
  });

  it('nhớ thêm sau gộp → hoàn tác gộp 409 STALE_VERSION, không ghi đè fact mới; biên nhận giữ tới hạn', async () => {
    const p = await contact('Anh Minh Chính');
    const d = await contact('Anh Minh Phụ');
    ok(await remember(p, 'Anh thích cắt tóc ngắn'));
    ok(await remember(d, 'Anh hay đến sau 18h'));
    const { logId } = await confirm(p, d);
    ok(await remember(p, 'Anh mới đổi số điện thoại công ty'));
    const undo = await call(h, `/action-logs/${logId}/undo`, {}).then(json);
    expect(undo.status).toBe(409);
    expect(undo.body.error.code).toBe('STALE_VERSION');
    expect(await facts(p)).toHaveLength(3);
    expect(await (await tenant()).contactMemoryMerge.count({ where: { primaryId: p } })).toBe(1);
  });

  it('cặp gộp ngược nhau đồng thời không deadlock (khoá theo id tăng dần)', async () => {
    const a = await contact('Chị Hoa A');
    const b = await contact('Chị Hoa B');
    const c = await contact('Chị Hoa C');
    ok(await remember(a, 'Hoa A thích trà'));
    ok(await remember(b, 'Hoa B thích cà phê'));
    ok(await remember(c, 'Hoa C thích nước ép'));
    const go = (p: string, d: string) => call(h, '/actions/contact.merge', { input: { group_ids: [`${p}~${d}`] } }, { 'idempotency-key': uuidv7() }).then(json);
    const rs = await Promise.all([go(a, b), go(c, b), remember(b, 'Hoa B dị ứng phấn hoa')]);
    expect(rs.map((r) => r.status).every((s) => [200, 202, 404, 409].includes(s)), JSON.stringify(rs.map((r) => r.body))).toBe(true);
  });
});

describe('quét biên nhận gộp hết hạn', () => {
  it('biên giới hạn: đúng hạn chưa xoá, quá hạn xoá; chạy lại không đổi gì', async () => {
    const db = await tenant();
    const p = await contact('Chị Mai Quét');
    const d = await contact('Chị Mai Quét Phụ');
    const now = h.clock.now();
    const mk = (expiresAt: Date) => db.contactMemoryMerge.create({ data: { id: uuidv7(), primaryId: p, dupId: d, primaryRows: [], dupRows: [], afterRev: 1n, expiresAt, createdAt: now } });
    const edge = await mk(now);
    const old = await mk(new Date(now.getTime() - 1));
    const live = await mk(new Date(now.getTime() + MERGE_UNDO_MS));
    expect(await purgeMergeReceipts(db, now)).toBeGreaterThanOrEqual(1);
    const left = new Set((await db.contactMemoryMerge.findMany({ where: { id: { in: [edge.id, old.id, live.id] } }, select: { id: true } })).map((x) => x.id));
    expect(left).toEqual(new Set([edge.id, live.id]));
    expect(await purgeMergeReceipts(db, now)).toBe(0);
  });
});

describe('đọc trí nhớ', () => {
  it('EXPLAIN đọc 20 fact mới nhất của khách dùng contact_memory_contact_recent_idx', async () => {
    const db = await tenant();
    const lan = (await db.contactMemory.findFirstOrThrow({ select: { contactId: true } })).contactId;
    const plan = await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET LOCAL enable_seqscan = off');
      return tx.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(
        `EXPLAIN (ANALYZE, BUFFERS) SELECT m.fact FROM (SELECT id FROM contact_memory WHERE contact_id = '${lan}'::uuid ORDER BY updated_at DESC, id DESC LIMIT 20) s JOIN contact_memory m ON m.id = s.id ORDER BY m.updated_at DESC, m.id DESC`,
      );
    });
    const text = plan.map((r) => r['QUERY PLAN']).join('\n');
    expect(text).toContain('contact_memory_contact_recent_idx');
  });
});
