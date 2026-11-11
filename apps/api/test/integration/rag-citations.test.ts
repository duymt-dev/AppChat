// TIP-020d trên Postgres 16 + Memurai thật — trích dẫn câu trả lời đã kiểm, qua lượt agent thật (model giả theo kịch bản):
//   AC1 model chỉ thấy bí danh `S1` + nội dung (không tên tài liệu); trích dẫn hợp lệ → gửi, binding validated + bước trả lời mang trích dẫn.
//   AC2 bí danh lạ → chuyển người KHÔNG nháp (citation_invalid); có tài liệu mà không nêu nguồn → chuyển người giữ nháp (citation_missing);
//       tên tài liệu lọt vào câu gửi khách → không hợp lệ.
//   AC3 copilot: gợi ý mang khối nguồn; GET hội thoại (nháp) / luồng tin (gợi ý) / chi tiết run chiếu nhãn theo quyền người xem HIỆN TẠI.
//   AC4 nguồn nạp lại sau khi trả lời → chi tiết run `unavailable` (không tên); run ở pha chưa validated → đặt chỗ gửi chặn.
//   AC5 EXPLAIN 100k run: khôi phục pha mở dùng `ai_run_citation_recovery_idx` (partial), không Seq Scan.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { AiSdkEngine, AiSdkEmbedder, mockEmbedSource, mockLanguageModel, staticModelSource, type MockScript, type MockTurn } from '@appchat/ai';
import { ActionExecutor, AiRunner, CreditMeter, DbPriceBook, REDIS, WalletService, createLogger, dispatchKnowledgeOk, replyTurn, uuidv7, type ReplyDeps } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { aiCitationsSchema, threadSchema } from '@appchat/shared';
import { call, env, startApi, type Harness } from './setup';

const PROVIDER = `t-${uuidv7().slice(-12)}`;
const MODEL = 'mock-chat';
const log = createLogger({ level: 'silent' });
const NAME = 'noi-bo/bang-gio-mo-cua-huong-sen.pdf';
const FACT = 'Spa Hương Sen mở cửa từ 8 giờ đến 20 giờ mỗi ngày, kể cả chủ nhật.';

let h: Harness;
let resolver: TenantDbResolver;
let acc = '';
let src = '';

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
const get = (path: string) => call(h, path, undefined, {}).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));

const seen: string[] = [];
const say = (o: Record<string, unknown>): MockTurn => ({ text: '```json\n' + JSON.stringify({ intent: 'faq', sentiment: 'neutral', needs_human: null, confidence: 0.92, ...o }) + '\n```' });

function deps(script: MockScript): ReplyDeps {
  const model = mockLanguageModel(script, { provider: PROVIDER, model: MODEL });
  const spy = model.doStream.bind(model);
  model.doStream = async (o) => {
    seen.push((o.prompt as { role: string; content: unknown }[]).filter((m) => m.role === 'system').map((m) => String(m.content)).join('\n'));
    return spy(o);
  };
  const engine = new AiSdkEngine(staticModelSource([{ provider: PROVIDER, model: MODEL, handle: model }]));
  const runner = new AiRunner({ engine, meter: new CreditMeter(h.app.get(WalletService, { strict: false }), new DbPriceBook(h.platform)), log });
  return { tenants: resolver, executor: h.app.get(ActionExecutor, { strict: false }), runner, embedder: new AiSdkEmbedder(mockEmbedSource()), kv: h.app.get(REDIS, { strict: false }), log, now: () => h.clock.now() };
}

let agentId = '';
async function conversation(texts: string[], aiMode: 'auto' | 'copilot' = 'auto') {
  const db = await tenant();
  const id = uuidv7();
  await db.conversation.create({ data: { id, channelAccountId: acc, channelType: 'webchat', externalThreadId: `t-${id}`, assigneeAgentId: agentId, aiMode, lastMessageAt: h.clock.now() } });
  for (const t of texts) {
    h.clock.advance(1000);
    await db.message.create({ data: { id: uuidv7(), conversationId: id, channelAccountId: acc, direction: 'in', senderType: 'contact', senderId: 'v1', kind: 'text', body: t, externalMsgId: uuidv7(), status: 'delivered', createdAt: h.clock.now() } });
  }
  return id;
}
const runOf = async (conversationId: string) => (await tenant()).aiRun.findFirstOrThrow({ where: { conversationId, kind: 'agent_reply' }, orderBy: { startedAt: 'desc' } });
const conv = async (id: string) => (await tenant()).conversation.findUniqueOrThrow({ where: { id } });
const outgoing = async (id: string) => (await tenant()).message.count({ where: { conversationId: id, direction: 'out' } });

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  await h.platform.modelPrice.create({ data: { providerKey: PROVIDER, model: MODEL, tier: 'standard', creditsPer1kIn: 1, creditsPer1kOut: 3 } });
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
  const plan = await h.platform.plan.create({ data: { id: uuidv7(), key: `t-unl-${uuidv7().slice(-8)}`, segment: 'business', name: 'Test', maxAgents: null, maxChannels: null, active: false } });
  await h.platform.subscription.create({ data: { id: uuidv7(), workspaceId: h.ws, planId: plan.id, status: 'active', currentPeriodStart: h.clock.now() } });
  expect((await act('webchat.update_widget', { enabled: true, name: 'Web Spa' })).status).toBe(200);
  acc = (await (await tenant()).channelAccount.findFirstOrThrow({ where: { type: 'webchat' } })).id;
  // Nguồn công khai thẻ FAQ — đoạn chèn thẳng (như ai:live, không phụ thuộc route embed) để truy hồi nhánh từ khoá.
  const db = await tenant();
  src = uuidv7();
  await db.kbSource.create({ data: { id: src, origin: 'text', kind: 'text', name: NAME, body: FACT, status: 'ready', chunkCount: 1, visibility: 'public', tags: ['FAQ'] } });
  await db.kbChunk.create({ data: { id: uuidv7(), sourceId: src, ord: 0, content: FACT, embedModel: 'none' } });
  const a = await act('agent.create_and_publish', { name: 'CSKH nguồn', role: 'cs', tools: ['kb.search'], threshold: 70, kb_scope: { folder_ids: [], tags: ['FAQ'] } });
  expect(a.status, JSON.stringify(a.body)).toBe(200);
  agentId = a.body.data.result.agent_id;
});
afterAll(async () => {
  await h?.platform.modelPrice.deleteMany({ where: { providerKey: PROVIDER } });
  await resolver?.close();
  await h?.close();
});

describe('AC1 — trích dẫn hợp lệ', () => {
  it('model thấy bí danh, không tên tài liệu; gửi; binding validated + bước trả lời mang trích dẫn; chi tiết run chiếu nhãn', async () => {
    const id = await conversation(['Spa mở cửa mấy giờ vậy?']);
    seen.length = 0;
    expect(await replyTurn(deps([say({ reply: 'Dạ spa mở cửa từ 8 giờ đến 20 giờ mỗi ngày ạ.', citations: [{ ref: 'S1', quote: 'mở cửa từ 8 giờ đến 20 giờ' }] })]), h.ws, id)).toBe('sent');
    expect(seen[0]).toMatch(/\[S1\]\n/);
    expect(seen[0]).not.toContain(NAME);
    const run = await runOf(id);
    expect(run.citationPhase).toBe('validated');
    expect(run.answerCitations).toMatchObject({ v: 1, state: 'validated', citations: [{ source_id: src, source_generation: 1, claim_start: 7, claim_end: 33 }] });
    const step = await (await tenant()).aiRunStep.findFirstOrThrow({ where: { runId: run.id, type: 'llm' }, orderBy: { idx: 'desc' } });
    expect(step.output).toMatchObject({ citations: [{ source_id: src }] });
    const d = (await get(`/runs/${run.id}`)).body.data;
    expect(aiCitationsSchema.parse(d.citations)).toMatchObject({ state: 'validated', entries: [{ source_id: src, name: NAME, claim_start: 7, claim_end: 33 }] });
    expect(d.result_text).toBe('Dạ spa mở cửa từ 8 giờ đến 20 giờ mỗi ngày ạ.');
  });
});

describe('AC2 — trích dẫn hỏng / thiếu / lộ nhãn', () => {
  it('bí danh lạ → chuyển người, không nháp, không gửi', async () => {
    const id = await conversation(['Chủ nhật spa có mở không?']);
    expect(await replyTurn(deps([say({ reply: 'Dạ chủ nhật spa vẫn mở ạ.', citations: [{ ref: 'S9', quote: 'chủ nhật spa vẫn mở' }] })]), h.ws, id)).toBe('handoff');
    expect(await outgoing(id)).toBe(0);
    expect(await conv(id)).toMatchObject({ aiState: 'handoff', aiDraft: null });
    expect((await runOf(id)).citationPhase).toBe('invalidated');
  });

  it('có tài liệu mà không nêu nguồn → chuyển người, nháp giữ để người xem lại', async () => {
    const id = await conversation(['Mấy giờ spa đóng cửa?']);
    expect(await replyTurn(deps([say({ reply: 'Dạ spa đóng cửa lúc 20 giờ ạ.' })]), h.ws, id)).toBe('handoff');
    expect(await outgoing(id)).toBe(0);
    expect(await conv(id)).toMatchObject({ aiState: 'handoff', aiDraft: 'Dạ spa đóng cửa lúc 20 giờ ạ.' });
  });

  it('tên tài liệu nội bộ / mã nguồn lọt vào câu gửi khách → không hợp lệ', async () => {
    for (const reply of [`Theo ${NAME} thì spa mở 8 giờ ạ.`, 'Theo S1 thì spa mở 8 giờ ạ.']) {
      const id = await conversation(['Spa mở mấy giờ?']);
      expect(await replyTurn(deps([say({ reply, citations: [{ ref: 'S1', quote: 'spa mở 8 giờ' }] })]), h.ws, id)).toBe('handoff');
      expect(await outgoing(id)).toBe(0);
      expect((await runOf(id)).citationPhase).toBe('invalidated');
    }
  });
});

describe('AC3 — copilot + chiếu theo người xem', () => {
  it('gợi ý ở luồng tin mang khối nguồn đã kiểm; nháp handoff chiếu ai_draft_citations', async () => {
    const id = await conversation(['Cuối tuần spa mở mấy giờ?'], 'copilot');
    expect(await replyTurn(deps([say({ reply: 'Dạ cuối tuần spa mở từ 8 giờ đến 20 giờ ạ.', citations: [{ ref: 'S1', quote: 'từ 8 giờ đến 20 giờ' }] })]), h.ws, id)).toBe('suggested');
    const th = (await get(`/conversations/${id}/messages`)).body;
    const parsed = threadSchema.parse(th);
    expect(parsed.suggestion?.citations).toMatchObject({ state: 'validated', entries: [{ source_id: src, name: NAME }] });
    // Nháp handoff (thiếu nguồn ở lượt khác không có) — dùng lượt có trích dẫn hợp lệ nhưng độ tin cậy thấp → nháp mang nguồn.
    const id2 = await conversation(['Spa mở cửa đến mấy giờ?']);
    expect(await replyTurn(deps([say({ reply: 'Dạ spa mở cửa đến 20 giờ ạ.', confidence: 0.4, citations: [{ ref: 'S1', quote: 'mở cửa đến 20 giờ' }] })]), h.ws, id2)).toBe('handoff');
    const dto = (await get(`/conversations/${id2}`)).body.data;
    expect(dto.ai_draft).toBe('Dạ spa mở cửa đến 20 giờ ạ.');
    expect(dto.ai_draft_citations).toMatchObject({ state: 'validated', entries: [{ source_id: src, name: NAME }] });
  });
});

describe('AC4 — nguồn đổi sau khi trả lời + rào gửi', () => {
  it('nguồn nạp lại → chi tiết run unavailable (không tên); pha chưa validated → không đặt chỗ gửi', async () => {
    const id = await conversation(['Spa mở mấy giờ thế?']);
    expect(await replyTurn(deps([say({ reply: 'Dạ spa mở từ 8 giờ ạ.', citations: [{ ref: 'S1', quote: 'spa mở từ 8 giờ' }] })]), h.ws, id)).toBe('sent');
    const run = await runOf(id);
    const db = await tenant();
    await db.kbSource.update({ where: { id: src }, data: { ingestSeq: { increment: 1 } } });
    try {
      const d = (await get(`/runs/${run.id}`)).body.data;
      expect(d.citations).toEqual({ answer: { run_id: run.id, generation: 1 }, state: 'unavailable', entries: [] });
      expect(JSON.stringify(d)).not.toContain(NAME);
    } finally {
      await db.kbSource.update({ where: { id: src }, data: { ingestSeq: 1 } });
    }
    // Ứng viên đang kiểm (pha validating) không gửi được — đặt chỗ gửi kiểm pha.
    await db.aiRun.update({ where: { id: run.id }, data: { citationPhase: 'validating' } });
    expect(await dispatchKnowledgeOk(db as never, run.id)).toBe(false);
    await db.aiRun.update({ where: { id: run.id }, data: { citationPhase: 'validated' } });
    expect(await dispatchKnowledgeOk(db as never, run.id)).toBe(true);
  });
});

describe('AC5 — EXPLAIN khôi phục', () => {
  it('100k run: pha mở quét bằng ai_run_citation_recovery_idx (partial), không Seq Scan', async () => {
    const c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL!.replace(/\/[^/?]*(\?|$)/, `/${(await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).dbName}$1`) });
    await c.connect();
    try {
      await c.query(`INSERT INTO ai_run (id, kind, root_run_id, status, started_at, citation_phase, title)
        SELECT g.id, 'agent_reply', g.id, 'completed', now() - (n || ' seconds')::interval, CASE WHEN n % 1000 = 0 THEN 'validating' ELSE 'validated' END, 'explain-020d'
        FROM (SELECT gen_random_uuid() AS id, n FROM generate_series(1, 100000) n) g`);
      await c.query('ANALYZE ai_run');
      expect(Number((await c.query('SELECT count(*) AS n FROM ai_run')).rows[0].n)).toBeGreaterThanOrEqual(100_000);
      const plan = (await c.query(`EXPLAIN (ANALYZE, BUFFERS) SELECT id, status FROM ai_run
        WHERE citation_phase IN ('awaiting_generation', 'validating') AND started_at < now() - interval '2 minutes'
        ORDER BY citation_phase, started_at, id LIMIT 100`)).rows.map((x) => x['QUERY PLAN']).join('\n');
      expect(plan).toMatch(/ai_run_citation_recovery_idx/);
      expect(plan).not.toMatch(/Seq Scan on ai_run/);
    } finally {
      await c.query(`DELETE FROM ai_run WHERE title = 'explain-020d'`).catch(() => undefined);
      await c.end();
    }
  }, 180_000);
});
