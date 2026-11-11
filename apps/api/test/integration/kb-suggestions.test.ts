// TIP-043 P1 trên Postgres 16 thật: `kb.suggestion.propose` chỉ nguồn system (HTTP / Trợ lý → 403), ghi pending đã che PII + event chỉ
// id, lặp 10 lần → mỗi fingerprint một dòng; pending / rejected không có nguồn / đoạn; approve (sửa đáp án) → đúng một nguồn origin
// conversation, visibility kế thừa thư mục internal, nội dung còn PII → 422; ingest xong mới có đoạn tìm được; hai reviewer cùng version →
// một thắng (STALE_VERSION); đã duyệt → CONFLICT, không nhân nguồn; cùng Idempotency-Key → cùng kết quả; sales 403, tenant khác 404;
// GET /kb/suggestions: cursor không trùng / mất khi cùng created_at, người có kb.manage nhưng không inbox không thấy liên kết hội thoại;
// EXPLAIN ANALYZE trên 10k dòng dùng covering index + deferred join.
import 'reflect-metadata';
import { mkdirSync, writeFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { authzForRole, kbSuggestionListSchema, kbSuggestionSchema } from '@appchat/shared';
import { ActionExecutor, AiJobsModule, CLOCK, KB_SUGGEST_ACTOR, KernelModule, LOGGER, WalletService, createLogger, searchKb, uuidv7 } from '@appchat/core';
import { AiSdkEmbedder, mockEmbedSource } from '@appchat/ai';
import { call, env, startApi, type Harness } from './setup';
import { until } from './worker.harness';

let h: Harness;
let h2: Harness;
let ai: TestingModule;
let resolver: TenantDbResolver;
let sales: { id: string; token: string };
let kbOnly: { id: string; token: string };

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u: { token: string }) => ({ authorization: `Bearer ${u.token}` });
const act = (id: string, input: unknown, headers: Record<string, string> = {}, hh = h) => call(hh, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...headers }).then(json);
const ok = async (id: string, input: unknown, headers: Record<string, string> = {}) => {
  const r = await act(id, input, headers);
  if (r.status !== 200) throw new Error(`${id} ${r.status} ${JSON.stringify(r.body)}`);
  return r.body.data;
};
const get = (path: string, who?: { token: string }, hh = h) => call(hh, path, undefined, who ? as(who) : {}).then(json);
const tenant = (hh = h) => resolver.get(TenantContexts.system(hh.ws, 't'));
const sys = (key?: string) => ({ workspaceId: h.ws, source: 'system' as const, actor: { type: 'system' as const, id: KB_SUGGEST_ACTOR }, authz: { isOwner: true } as never, ...(key ? { idempotencyKey: key } : {}) });

/** Hội thoại đóng: khách (có tên + SĐT trong hồ sơ) hỏi, nhân viên đáp. */
async function closedConversation(hh = h) {
  const db = await tenant(hh);
  const acc = uuidv7();
  await db.channelAccount.create({ data: { id: acc, type: 'webchat', name: 'Web', status: 'connected', settings: {}, createdAt: hh.clock.now() } });
  const contact = uuidv7();
  await db.contact.create({ data: { id: contact, code: `KH-${contact.slice(-6)}`, name: 'Nguyễn Thị Lan', phone: '0909123456', address: '12 Lý Thường Kiệt' } });
  const conv = uuidv7();
  await db.conversation.create({ data: { id: conv, channelAccountId: acc, channelType: 'webchat', externalThreadId: `t-${conv}`, contactId: contact, status: 'closed' } });
  const msg = async (senderType: 'contact' | 'user', body: string) => {
    const id = uuidv7();
    hh.clock.advance(1000);
    await db.message.create({ data: { id, conversationId: conv, channelAccountId: acc, direction: senderType === 'contact' ? 'in' : 'out', senderType, senderName: senderType === 'contact' ? 'Lan' : 'NV', body, status: 'delivered', createdAt: hh.clock.now() } });
    return id;
  };
  const q = await msg('contact', 'Cho hỏi đổi lịch hẹn được không? SĐT em 0909123456');
  const a = await msg('user', 'Dạ chị đổi trước 24 giờ là được, miễn phí ạ.');
  return { conv, q, a, contact };
}

const executor = () => h.app.get(ActionExecutor, { strict: false });
type Proposed = { created: string[]; duplicates: number; skipped: string | null };
async function propose(conv: string, cutoff: string, pairs: { question: string; answer: string; source_message_ids: string[] }[], key?: string): Promise<Proposed> {
  const r = await executor().execute(sys(key), 'kb.suggestion.propose', { conversation_id: conv, cutoff_message_id: cutoff, run_id: null, pairs });
  return (r.data as { result: Proposed }).result;
}

beforeAll(async () => {
  [h, h2] = await Promise.all([startApi(), startApi()]);
  sales = await h.member('sales');
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  // Vai trò tuỳ chỉnh chỉ có kb.manage (không inbox) — duyệt được, không thấy liên kết hội thoại.
  await (await tenant()).role.create({ data: { id: uuidv7(), key: 'kb_editor', name: 'Biên tập tri thức', permissions: ['kb.manage'], dataScope: { inbox: 'none', crm: 'none', sales: 'none', booking: 'none', support: 'none', insights: 'none' } } });
  kbOnly = await h.member('kb_editor');
  ai = await Test.createTestingModule({ imports: [KernelModule.forRoot({ ...env, LOG_LEVEL: 'silent' }), AiJobsModule] })
    .overrideProvider(LOGGER)
    .useValue(createLogger({ level: 'silent' }))
    .overrideProvider(CLOCK)
    .useValue(h.clock)
    .compile();
  await ai.init();
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
}, 240_000);
afterAll(async () => {
  await ai?.close();
  await resolver?.close();
  await Promise.all([h?.close(), h2?.close()]);
});


/** TIP-020c: tìm theo restriction — `public` = người xem kênh; thêm `internal` = Owner (đọc mọi nhóm nguồn); thư mục / thẻ = phạm vi agent. */
const restrictionOf = (v: ('public' | 'internal')[], folderIds?: string[], tags?: string[]) => {
  const scope = folderIds?.length || tags?.length ? { folder_ids: folderIds ?? [], tags: tags ?? [] } : null;
  return { principal: v.includes('internal') ? { kind: 'user' as const, authz: authzForRole('owner', uuidv7()) } : { kind: 'public' as const }, admitted: scope, current: scope };
};

describe('AC1 / AC3 propose', () => {
  it('HTTP / Trợ lý không gọi được (system-only); lặp 10 lần → một pending mỗi fingerprint, đã che PII, event chỉ id, không nguồn', async () => {
    const { conv, q, a } = await closedConversation();
    expect((await act('kb.suggestion.propose', { conversation_id: conv, cutoff_message_id: a, run_id: null, pairs: [] })).status).toBe(403);
    expect((await act('kb.suggestion.propose', { conversation_id: conv, cutoff_message_id: a, run_id: null, pairs: [] }, { 'x-action-source': 'assistant' })).status).toBe(403);
    const pair = { question: 'Đổi lịch hẹn được không?', answer: 'Đổi trước 24 giờ, miễn phí. Cần thì gọi [số điện thoại].', source_message_ids: [q, a] };
    for (let k = 0; k < 10; k++) await propose(conv, a, [pair]);
    const db = await tenant();
    const rows = await db.kbSuggestion.findMany({ where: { conversationId: conv } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: 'pending', kbSourceId: null, version: 1 });
    expect(JSON.stringify(rows)).not.toMatch(/0909123456|Nguyễn Thị Lan/);
    const ev = await db.outboxEvent.findMany({ where: { topic: 'kb.suggestion_created', payload: { path: ['conversation_id'], equals: conv } } });
    expect(ev).toHaveLength(1);
    expect(Object.keys(ev[0]!.payload as object).sort()).toEqual(['conversation_id', 'occurred_at', 'suggestion_ids', 'ws']);
    expect(await db.kbSource.count({ where: { origin: 'conversation' } })).toBe(0);
  });

  it('cặp còn PII / hội thoại mở lại → không ghi', async () => {
    const { conv, q, a } = await closedConversation();
    const r = await propose(conv, a, [{ question: 'Chị Lan hỏi đổi lịch?', answer: 'Gọi 0909123456.', source_message_ids: [q, a] }]);
    expect(r).toMatchObject({ created: [] });
    await (await tenant()).conversation.update({ where: { id: conv }, data: { status: 'open' } });
    const r2 = await propose(conv, a, [{ question: 'Đổi lịch?', answer: 'Trước 24 giờ.', source_message_ids: [q, a] }]);
    expect(r2).toMatchObject({ created: [], skipped: 'not_closed' });
  });
});

async function pending(question = 'Đổi lịch hẹn được không?') {
  const { conv, q, a } = await closedConversation();
  const r = await propose(conv, a, [{ question, answer: 'Đổi trước 24 giờ, miễn phí.', source_message_ids: [q, a] }]);
  return { id: r.created[0]!, conv };
}

describe('AC4 / AC5 / AC6 duyệt', () => {
  it('sửa đáp án rồi duyệt vào thư mục internal → đúng một nguồn conversation internal; ingest xong mới tìm được; còn PII → 422', async () => {
    const s = await pending('Có được đổi lịch không?');
    const folder = (await ok('kb.folder.create', { name: 'Nội bộ CSKH', visibility: 'internal' })).result.folder_id;
    const bad = await act('kb.suggestion.approve', { suggestion_id: s.id, if_version: 1, answer: 'Gọi 0912345678 để đổi.' });
    expect(bad.status).toBe(422);
    expect(bad.body.error.fields).toEqual({ answer: 'sensitive_data:phone' });
    const pv = await act('kb.suggestion.approve', { suggestion_id: s.id, if_version: 1, answer: 'Khách đổi lịch trước 24 giờ, miễn phí, tối đa 2 lần.', folder_id: folder }, { 'x-action-source': 'assistant' });
    expect(JSON.stringify(pv.body.data)).toContain('internal');
    const db = await tenant();
    expect(await db.kbSource.count({ where: { origin: 'conversation' } })).toBe(0);
    const d = await ok('kb.suggestion.approve', { suggestion_id: s.id, if_version: 1, answer: 'Khách đổi lịch trước 24 giờ, miễn phí, tối đa 2 lần.', folder_id: folder });
    const src = await db.kbSource.findUniqueOrThrow({ where: { id: d.result.kb_source_id } });
    expect(src).toMatchObject({ origin: 'conversation', visibility: 'internal', folderId: folder, kind: 'text' });
    expect(src.body).toContain('tối đa 2 lần');
    expect(await db.kbSuggestion.findUniqueOrThrow({ where: { id: s.id } })).toMatchObject({ status: 'approved', edited: true, version: 2, kbSourceId: src.id });
    expect(await until(async () => (await db.kbSource.findUniqueOrThrow({ where: { id: src.id } })).status === 'ready')).toBe(true);
    const hit = await searchKb(db, new AiSdkEmbedder(mockEmbedSource()), { query: 'đổi lịch trước 24 giờ', restriction: restrictionOf(['public', 'internal']) });
    expect(hit.chunks.some((c) => c.source_id === src.id)).toBe(true);
    expect((await searchKb(db, new AiSdkEmbedder(mockEmbedSource()), { query: 'đổi lịch trước 24 giờ', restriction: restrictionOf(['public']) })).chunks.some((c) => c.source_id === src.id)).toBe(false);
    // Đã duyệt → CONFLICT, không nguồn thứ hai.
    expect((await act('kb.suggestion.approve', { suggestion_id: s.id, if_version: 2 })).status).toBe(409);
    expect(await db.kbSource.count({ where: { origin: 'conversation' } })).toBe(1);
  });

  it('hai reviewer cùng version → một thắng; cùng Idempotency-Key → cùng kết quả; từ chối → không nguồn / đoạn', async () => {
    const s = await pending('Spa mở cửa ngày lễ không?');
    const [x, y] = await Promise.all([act('kb.suggestion.approve', { suggestion_id: s.id, if_version: 1 }), act('kb.suggestion.reject', { suggestion_id: s.id, if_version: 1, reason: 'cũ' })]);
    expect([x.status, y.status].sort()).toEqual([200, 409]);
    const s2 = await pending('Có chỗ đỗ ô tô không?');
    const key = uuidv7();
    const r1 = await act('kb.suggestion.reject', { suggestion_id: s2.id, if_version: 1, reason: 'Không đúng' }, { 'idempotency-key': key });
    const r2 = await act('kb.suggestion.reject', { suggestion_id: s2.id, if_version: 1, reason: 'Không đúng' }, { 'idempotency-key': key });
    expect(r1.status).toBe(200);
    expect(r2.body.data.result).toEqual(r1.body.data.result);
    const db = await tenant();
    expect(await db.kbSuggestion.findUniqueOrThrow({ where: { id: s2.id } })).toMatchObject({ status: 'rejected', kbSourceId: null, rejectReason: 'Không đúng' });
  });

  it('sales 403; tenant khác 404; agent không có tool approve / reject', async () => {
    const s = await pending('Có tư vấn online không?');
    expect((await act('kb.suggestion.approve', { suggestion_id: s.id, if_version: 1 }, as(sales))).status).toBe(403);
    expect((await act('kb.suggestion.reject', { suggestion_id: s.id, if_version: 1 }, as(sales))).status).toBe(403);
    expect((await act('kb.suggestion.approve', { suggestion_id: s.id, if_version: 1 }, {}, h2)).status).toBe(404);
    expect((await get(`/kb/suggestions/${s.id}`, undefined, h2)).status).toBe(404);
    expect((await get('/kb/suggestions', sales)).status).toBe(403);
  });
});

describe('AC6 / AC7 đọc hàng chờ', () => {
  it('kb.manage không inbox: thấy hỏi–đáp, không thấy liên kết hội thoại; Owner thấy; khớp zod', async () => {
    const s = await pending('Có gói cho trẻ em không?');
    const own = await get(`/kb/suggestions/${s.id}`);
    expect(kbSuggestionSchema.parse(own.body.data)).toMatchObject({ conversation_id: s.conv, status: 'pending' });
    expect(own.body.data.source_message_ids).toHaveLength(2);
    const ed = await get(`/kb/suggestions/${s.id}`, kbOnly);
    expect(ed.status).toBe(200);
    expect(ed.body.data).toMatchObject({ conversation_id: null, source_message_ids: [] });
    expect(kbSuggestionListSchema.safeParse((await get('/kb/suggestions?status=pending', kbOnly)).body).success).toBe(true);
    expect((await get('/kb/suggestions?status=lạ')).status).toBe(400);
    expect((await get('/kb/suggestions?limit=101')).status).toBe(400);
  });

  it('10k dòng cùng created_at: cursor không trùng / mất; EXPLAIN ANALYZE dùng covering index (Index Only Scan) + deferred join', async () => {
    const db = await tenant();
    const conv = uuidv7();
    const at = new Date('2026-11-05T01:00:00Z');
    await db.$executeRaw`INSERT INTO kb_suggestion (id, conversation_id, question, answer, source_message_ids, fingerprint, cutoff_message_id, created_at)
      SELECT gen_random_uuid(), ${conv}::uuid, 'Q ' || g, repeat('đáp ', 50) || g, ARRAY[gen_random_uuid()], md5('fp' || g || ${conv}), gen_random_uuid(), ${at}
      FROM generate_series(1, 10000) g`;
    await db.$executeRawUnsafe('VACUUM ANALYZE kb_suggestion');
    const seen = new Set<string>();
    let cursor: string | null = null;
    let pages = 0;
    do {
      const r = await get(`/kb/suggestions?status=pending&limit=100${cursor ? `&cursor=${cursor}` : ''}`);
      for (const x of r.body.data) {
        expect(seen.has(x.id)).toBe(false);
        seen.add(x.id);
      }
      cursor = r.body.next_cursor;
      pages++;
    } while (cursor && pages < 200);
    const total = await db.kbSuggestion.count({ where: { status: 'pending' } });
    expect(seen.size).toBe(total);
    const page = (after: string) =>
      `EXPLAIN (ANALYZE, BUFFERS) SELECT s.id, s.question FROM (SELECT id FROM kb_suggestion WHERE status = 'pending' ${after} ORDER BY created_at DESC, id DESC LIMIT 101) p JOIN kb_suggestion s ON s.id = p.id ORDER BY s.created_at DESC, s.id DESC`;
    const explain = async (sql: string, local = '') =>
      db.$transaction(async (tx) => {
        if (local) await tx.$executeRawUnsafe(local);
        return (await tx.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(sql)).map((r) => r['QUERY PLAN']).join('\n');
      });
    const cursorPage = page(`AND (created_at, id) < ('${at.toISOString()}', 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)`);
    // Mặc định: planner ước lượng thấp số dòng pending (vài chục so với 10k thật) nên có lúc chọn bitmap trên CHÍNH covering index rồi
    // sort top-N; vẫn chỉ id đi qua LIMIT, payload lấy qua pkey (deferred join). Tắt bitmap trong phiên → Index Only Scan seek theo
    // (status, created_at, id) không sort. Ghi cả hai kế hoạch vào report (AC7).
    const plans = { first: await explain(page('')), cursor: await explain(cursorPage), firstSeek: await explain(page(''), 'SET LOCAL enable_bitmapscan = off'), cursorSeek: await explain(cursorPage, 'SET LOCAL enable_bitmapscan = off') };
    // Kế hoạch ghi ra tệp (report AC7) — không console (lint no-console).
    const out = new URL('../../../../.data/gate/', import.meta.url);
    mkdirSync(out, { recursive: true });
    writeFileSync(new URL('043-explain-kb-suggestion.txt', out), Object.entries(plans).map(([k, v]) => `EXPLAIN kb_suggestion pending ${k}:\n${v}`).join('\n\n'));
    for (const p of [plans.first, plans.cursor]) {
      expect(p).toMatch(/kb_suggestion_status_created_cover_idx/);
      expect(p).toMatch(/Index Scan using kb_suggestion_pkey on kb_suggestion s/);
      expect(p).not.toMatch(/Seq Scan/);
    }
    for (const p of [plans.firstSeek, plans.cursorSeek]) expect(p).toMatch(/Index Only Scan using kb_suggestion_status_created_cover_idx/);
  });
});
