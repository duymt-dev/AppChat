// TIP-035 AC1–AC5 trên Postgres 16 + Memurai: migration 035 (CHECK, index, EXPLAIN); ai_task.create / update / pause / delete / run_now
// + hoàn tác + quyền (sales chỉ thấy / sửa tác vụ của mình, kế toán 403 khi thiếu quyền agent); cron theo giờ workspace + job lịch tới giờ
// (dời mốc, không chồng lượt); lượt chạy: tool = agent ∩ người tạo ∩ nhóm dữ liệu / công cụ, scope ngoài nhóm dữ liệu = none, hỏi trước
// khi gửi → hàng chờ duyệt / tắt → gửi luôn, kết quả vào phiên Cowork; mẫu chủ động (follow-up, báo giá treo, nhắc hẹn, sau mua) thu đúng
// đối tượng; bản tin sáng (không tốn credit) + thông báo; sự kiện → consumer đẩy lượt; GET /v1/ai-tasks khớp schema FE.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { AiSdkEngine, mockLanguageModel, staticModelSource, type MockScript } from '@appchat/ai';
import {
  ActionExecutor,
  AiRunner,
  CreditMeter,
  DbPriceBook,
  REDIS,
  WalletService,
  buildBriefing,
  collectTargets,
  createLogger,
  narrowScope,
  runTask,
  sweepAllTasks,
  sweepDueTasks,
  taskEventConsumer,
  taskToolIds,
  uuidv7,
  type TaskJob,
  type TaskQueue,
  type TaskRunDeps,
} from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { aiTasksPayloadSchema, authzForRole } from '@appchat/shared';
import { call, env, startApi, type Harness } from './setup';

const PROVIDER = `t-${uuidv7().slice(-12)}`;
const MODEL = 'mock-chat';
const log = createLogger({ level: 'silent' });

let h: Harness;
let resolver: TenantDbResolver;
let sales: { id: string; token: string };
let acc: string;

beforeAll(async () => {
  h = await startApi();
  sales = await h.member('sales');
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  await h.platform.modelPrice.create({ data: { providerKey: PROVIDER, model: MODEL, tier: 'standard', creditsPer1kIn: 1, creditsPer1kOut: 3 } });
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
  const plan = await h.platform.plan.create({ data: { id: uuidv7(), key: `t-unl-${uuidv7().slice(-8)}`, segment: 'business', name: 'Test', maxAgents: null, maxChannels: null, active: false } });
  await h.platform.subscription.create({ data: { id: uuidv7(), workspaceId: h.ws, planId: plan.id, status: 'active', currentPeriodStart: h.clock.now() } });
  // Giờ workspace UTC cho dễ đọc mốc (08:00Z = 08:00 workspace).
  await h.platform.workspace.update({ where: { id: h.ws }, data: { timezone: 'UTC' } });
});
afterAll(async () => {
  await h?.platform.modelPrice.deleteMany({ where: { providerKey: PROVIDER } });
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u: { token: string }) => ({ authorization: `Bearer ${u.token}` });
const idem = () => ({ 'idempotency-key': uuidv7() });
const act = (id: string, input: unknown, headers: Record<string, string> = {}) => call(h, `/actions/${id}`, { input }, headers).then(json);
const get = (path: string, who?: { token: string }) => call(h, path, undefined, who ? as(who) : {}).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const undo = (logId: string) => call(h, `/action-logs/${logId}/undo`, {}).then(json);
const base = { model_tier: 'standard', ask_before_send: true, credit_limit_per_run: 500 };

/** Queue giả: ghi job (lượt chạy kiểm bằng runTask trực tiếp). */
const pushed: TaskJob[] = [];
const queue = { push: async (j: TaskJob) => void pushed.push(j), arm: async () => undefined, close: async () => undefined } as unknown as TaskQueue;

/** Model giả theo kịch bản + ghi lại tool model thấy được. */
const seen: { system: string; prompt: string; tools: string[] }[] = [];
function deps(script: MockScript): TaskRunDeps {
  const model = mockLanguageModel(script, { provider: PROVIDER, model: MODEL });
  const spy = model.doStream.bind(model);
  model.doStream = async (o) => {
    const p = o.prompt as { role: string; content: unknown }[];
    seen.push({ system: p.filter((m) => m.role === 'system').map((m) => String(m.content)).join('\n'), prompt: JSON.stringify(p.filter((m) => m.role === 'user')), tools: ((o.tools ?? []) as { name: string }[]).map((t) => t.name) });
    return spy(o);
  };
  const runner = new AiRunner({ engine: new AiSdkEngine(staticModelSource([{ provider: PROVIDER, model: MODEL, handle: model }])), meter: new CreditMeter(h.app.get(WalletService, { strict: false }), new DbPriceBook(h.platform)), log });
  return {
    executor: h.app.get(ActionExecutor, { strict: false }),
    runner,
    kv: h.app.get(REDIS, { strict: false }),
    log,
    now: () => h.clock.now(),
    place: async () => ({ timeZone: 'UTC', locale: 'vi', ownerUserId: h.user }),
    userName: async () => 'Owner',
    commander: async (_ws, u) => (u === h.user ? authzForRole('owner', u) : u === sales.id ? authzForRole('sales', u) : null),
    credits: async () => 50,
  };
}

async function agent(name: string, tools: string[]): Promise<string> {
  const r = await act('agent.create_and_publish', { name, role: 'cs', tools, threshold: 70 }, idem());
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body.data.result.agent_id;
}
async function customerWithConv(name: string, phone: string, o: { lastAt?: Date } = {}) {
  const k = await act('contact.create', { full_name: name, phone }, idem());
  const contactId = k.body.data.result.contact_id as string;
  const db = await tenant();
  if (o.lastAt) await db.contact.update({ where: { id: contactId }, data: { lastInteractionAt: o.lastAt } });
  const conv = uuidv7();
  await db.conversation.create({ data: { id: conv, channelAccountId: acc, channelType: 'webchat', externalThreadId: `t-${conv}`, contactId, lastMessageAt: h.clock.now() } });
  return { contactId, conv };
}
const task = async (input: Record<string, unknown>, who?: { token: string }) => act('ai_task.create', { ...base, ...input }, { ...idem(), ...(who ? as(who) : {}) });

describe('schema (AC1)', () => {
  it('migration 035: CHECK cách chạy / agent; index viết tay; EXPLAIN job lịch + thống kê theo tác vụ dùng index', async () => {
    const db = await tenant();
    const idx = (await db.$queryRaw<{ indexname: string }[]>`SELECT indexname FROM pg_indexes WHERE tablename IN ('ai_task','ai_run','quote','order')`).map((r) => r.indexname);
    expect(idx).toEqual(expect.arrayContaining(['ai_task_live_created_idx', 'ai_task_due_idx', 'ai_task_event_idx', 'ai_run_task_idx', 'quote_open_sent_idx', 'order_completed_at_idx']));
    await expect(db.aiTask.create({ data: { id: uuidv7(), name: 'x', goal: 'y', trigger: 'schedule', createdByUserId: h.user, template: 'briefing' } })).rejects.toThrow(/ai_task_trigger_chk/);
    await expect(db.aiTask.create({ data: { id: uuidv7(), name: 'x', goal: 'y', trigger: 'manual', createdByUserId: h.user } })).rejects.toThrow(/ai_task_agent_chk/);
    const c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL!.replace(/\/[^/?]*(\?|$)/, `/${(await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).dbName}$1`) });
    await c.connect();
    try {
      await c.query('SET enable_seqscan = off');
      const plan = async (q: string) => (await c.query(`EXPLAIN ${q}`)).rows.map((x) => x['QUERY PLAN']).join('\n');
      expect(await plan(`SELECT id FROM ai_task WHERE "trigger" = 'schedule' AND status = 'active' AND deleted_at IS NULL AND next_run_at <= now() ORDER BY next_run_at LIMIT 100`)).toMatch(/ai_task_due_idx/);
      expect(await plan(`SELECT id FROM ai_task WHERE "trigger" = 'event' AND status = 'active' AND deleted_at IS NULL AND event_type = 'order.completed'`)).toMatch(/ai_task_event(_active|_select)?_idx/);
      expect(await plan(`SELECT count(*) FROM ai_run WHERE task_id = 'x' AND started_at >= now() - interval '1 day'`)).toMatch(/ai_run_task_idx/);
      expect(await plan(`SELECT contact_id FROM quote WHERE status IN ('sent','viewed') AND deleted_at IS NULL AND sent_at < now() - interval '3 day' ORDER BY sent_at LIMIT 40`)).toMatch(/quote_open_sent_idx/);
      expect(await plan(`SELECT contact_id FROM "order" WHERE status = 'completed' AND deleted_at IS NULL AND completed_at >= now() - interval '4 day' AND completed_at < now() ORDER BY completed_at LIMIT 40`)).toMatch(/order_completed_at_idx/);
    } finally {
      await c.end();
    }
  });

  it('tài khoản webchat để gửi', async () => {
    expect((await act('webchat.update_widget', { enabled: true, name: 'Web Spa' })).status).toBe(200);
    acc = (await (await tenant()).channelAccount.findFirstOrThrow({ where: { type: 'webchat' } })).id;
  });
});

describe('ai_task.* (AC2)', () => {
  it('tạo theo lịch: cron theo giờ workspace → next_run_at; cron sai 422; sự kiện thiếu topic 422; chưa có agent chạy → 422; hoàn tác', async () => {
    expect((await task({ name: 'Không agent', goal: 'g', trigger: 'manual' })).body.error.fields).toMatchObject({ agent_id: 'none_active' });
    const ag = await agent('Sales Task', ['contact.update', 'message.send', 'quote.create']);
    const r = await task({ name: 'Báo cáo', goal: 'Tổng hợp', trigger: 'schedule', cron: '30 9 * * *', agent_id: ag });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const db = await tenant();
    const t = await db.aiTask.findUniqueOrThrow({ where: { id: r.body.data.result.task_id } });
    // 2026-10-30T08:00Z → 09:30 cùng ngày (UTC).
    expect(t).toMatchObject({ trigger: 'schedule', cron: '30 9 * * *', agentId: ag, createdByUserId: h.user, status: 'active' });
    expect(t.nextRunAt?.toISOString()).toBe('2026-10-30T09:30:00.000Z');
    expect((await task({ name: 'x', goal: 'g', trigger: 'schedule', cron: '99 * * * *', agent_id: ag })).body.error.fields).toMatchObject({ cron: 'invalid' });
    expect((await task({ name: 'x', goal: 'g', trigger: 'event', agent_id: ag })).body.error.fields).toMatchObject({ event_type: 'required' });
    // Mẫu chủ động mặc định cron + nhóm dữ liệu / công cụ của mẫu.
    const f = await task({ name: 'Follow-up', goal: 'g', trigger: 'schedule', template: 'follow_up', agent_id: ag });
    const ft = await db.aiTask.findUniqueOrThrow({ where: { id: f.body.data.result.task_id } });
    expect(ft).toMatchObject({ cron: '0 9 * * 1-6', dataScope: ['customers', 'conversations'], toolIds: ['read', 'message', 'report'] });
    expect((await undo(f.body.data.action_log_id)).status).toBe(200);
    expect((await db.aiTask.findUniqueOrThrow({ where: { id: ft.id } })).deletedAt).not.toBeNull();
  });

  it('sửa / tạm dừng / xoá + hoàn tác; chạy ngay → run queued + job; đang có lượt → 409; sales chỉ thấy tác vụ mình tạo', async () => {
    const db = await tenant();
    const ag = (await db.aiAgent.findFirstOrThrow({ where: { name: 'Sales Task' } })).id;
    const id = (await task({ name: 'Nhắc', goal: 'g', trigger: 'schedule', cron: '0 10 * * *', agent_id: ag })).body.data.result.task_id;
    expect((await act('ai_task.update', { task_id: id, patch: { cron: '0 7 * * *', prompt: 'Ngắn gọn' } })).status).toBe(200);
    const u = await db.aiTask.findUniqueOrThrow({ where: { id } });
    expect([u.cron, u.prompt, u.nextRunAt?.toISOString()]).toEqual(['0 7 * * *', 'Ngắn gọn', '2026-10-31T07:00:00.000Z']);
    const p = await act('ai_task.pause', { task_id: id, paused: true });
    expect(p.body.data.result).toEqual({ task_id: id, active: false });
    expect((await db.aiTask.findUniqueOrThrow({ where: { id } })).nextRunAt).toBeNull();
    expect((await undo(p.body.data.action_log_id)).status).toBe(200);
    expect((await db.aiTask.findUniqueOrThrow({ where: { id } })).status).toBe('active');

    pushed.length = 0;
    const rn = await act('ai_task.run_now', { task_id: id });
    expect(rn.status, JSON.stringify(rn.body)).toBe(200);
    expect(await db.aiRun.findUniqueOrThrow({ where: { id: rn.body.data.result.run_id } })).toMatchObject({ kind: 'task', status: 'queued', taskId: id, initiatedByUserId: h.user, maxCredits: 500 });
    expect((await act('ai_task.run_now', { task_id: id })).status).toBe(409);
    await db.aiRun.update({ where: { id: rn.body.data.result.run_id }, data: { status: 'cancelled' } });

    // Sales: tạo tác vụ của mình; không thấy / không sửa được tác vụ của Owner.
    const mine = await task({ name: 'Của sales', goal: 'g', trigger: 'manual', agent_id: ag }, sales);
    expect(mine.status, JSON.stringify(mine.body)).toBe(200);
    const list = aiTasksPayloadSchema.parse((await get('/ai-tasks', sales)).body.data);
    expect(list.tasks.map((t) => t.name)).toEqual(['Của sales']);
    expect((await act('ai_task.pause', { task_id: id, paused: true }, as(sales))).status).toBe(404);

    const del = await act('ai_task.delete', { task_id: id });
    expect(del.status).toBe(200);
    expect((await act('ai_task.run_now', { task_id: id })).status).toBe(404);
    expect((await undo(del.body.data.action_log_id)).status).toBe(200);
    expect((await db.aiTask.findUniqueOrThrow({ where: { id } })).deletedAt).toBeNull();
  });
});

describe('lịch + sự kiện (AC3)', () => {
  it('job lịch: tác vụ tới giờ → dời mốc + run queued + job; chạy lại không đẩy trùng; tạm dừng / chưa tới giờ không chạy', async () => {
    const db = await tenant();
    const ag = (await db.aiAgent.findFirstOrThrow({ where: { name: 'Sales Task' } })).id;
    await db.aiTask.updateMany({ where: { trigger: 'schedule' }, data: { status: 'paused', nextRunAt: null } });
    const redis = h.app.get(REDIS, { strict: false }) as { srem(k: string, m: string): Promise<number>; sismember(k: string, m: string): Promise<number> };
    await redis.srem('ai-task:armed', h.ws);
    const id = (await task({ name: 'Lịch 9h', goal: 'g', trigger: 'schedule', cron: '0 9 * * *', agent_id: ag })).body.data.result.task_id;
    expect(await redis.sismember('ai-task:armed', h.ws)).toBe(1); // action (queue thật) đánh dấu workspace cho job lịch
    pushed.length = 0;
    expect(await sweepDueTasks(db, queue, h.ws, 'UTC', () => h.clock.now())).toBe(0);
    h.clock.advance(61 * 60_000);
    expect(await sweepDueTasks(db, queue, h.ws, 'UTC', () => h.clock.now())).toBe(1);
    expect(await sweepDueTasks(db, queue, h.ws, 'UTC', () => h.clock.now())).toBe(0);
    expect(pushed).toEqual([expect.objectContaining({ ws: h.ws, task_id: id })]);
    expect((await db.aiTask.findUniqueOrThrow({ where: { id } })).nextRunAt?.toISOString()).toBe('2026-10-31T09:00:00.000Z');
    await db.aiRun.updateMany({ where: { taskId: id }, data: { status: 'cancelled' } });

    // Job lịch toàn hệ thống chỉ mở DB workspace trong tập "armed"; workspace hết tác vụ lịch đang bật → bị gỡ khỏi tập.
    const set = new Set([h.ws, uuidv7()]);
    const armed = { list: async () => [...set], remove: async (w: string) => void set.delete(w) };
    const opened: string[] = [];
    await sweepAllTasks(h.platform, async (w) => (opened.push(w), db), armed, queue, () => h.clock.now(), (_w, e) => { throw e; });
    expect(opened).toEqual([h.ws]);
    expect([...set]).toEqual([h.ws]);
    await act('ai_task.pause', { task_id: id, paused: true });
    await sweepAllTasks(h.platform, async () => db, armed, queue, () => h.clock.now(), (_w, e) => { throw e; });
    expect(set.size).toBe(0);
  });

  it('sự kiện: tác vụ nghe order.completed → consumer đẩy lượt kèm payload; topic khác / tác vụ tạm dừng không chạy', async () => {
    const db = await tenant();
    const ag = (await db.aiAgent.findFirstOrThrow({ where: { name: 'Sales Task' } })).id;
    const id = (await task({ name: 'Sau mua', goal: 'g', trigger: 'event', event_type: 'order.completed', agent_id: ag })).body.data.result.task_id;
    pushed.length = 0;
    const c = taskEventConsumer(queue, () => h.clock.now());
    const ev = (topic: string) => ({ id: uuidv7(), topic, workspaceId: h.ws, payload: { order_id: 'o1', code: 'DH-0001' }, traceId: null });
    await c.handle(ev('order.created'), db);
    const done = ev('order.completed');
    await c.handle(done, db);
    // TIP-012b P4: job chỉ mang id sự kiện + topic (runner đọc lại payload từ outbox), không payload thô.
    expect(pushed).toEqual([expect.objectContaining({ task_id: id, event: { topic: 'order.completed', source_event_id: done.id } })]);
    await db.aiRun.updateMany({ where: { taskId: id }, data: { status: 'cancelled' } });
    await act('ai_task.pause', { task_id: id, paused: true });
    await c.handle(ev('order.completed'), db);
    expect(pushed).toHaveLength(1);
  });
});

describe('lượt chạy (AC4)', () => {
  it('quyền: tool = agent ∩ người tạo ∩ nhóm dữ liệu / công cụ; scope ngoài nhóm dữ liệu = none', async () => {
    const db = await tenant();
    const t = { dataScope: ['customers'], toolIds: ['read', 'write'] };
    const ids = await taskToolIds(db, ['contact.update', 'message.send', 'quote.create', 'product.search'], authzForRole('owner', h.user), t);
    expect(ids.sort()).toEqual(['contact.update', 'product.search']);
    // Kế toán thiếu crm.edit → mất contact.update.
    expect(await taskToolIds(db, ['contact.update'], authzForRole('accountant', uuidv7()), t)).toEqual([]);
    const n = narrowScope(authzForRole('owner', h.user), ['conversations']);
    expect([n.isOwner, n.scope.inbox, n.scope.crm, n.scope.sales, n.scope.booking]).toEqual([false, 'all', 'all', 'none', 'none']);
  });

  it('follow-up: thu khách im lặng ≥ 7 ngày có hội thoại → agent gửi (hỏi trước khi gửi → hàng chờ duyệt); kết quả vào phiên Cowork', async () => {
    const db = await tenant();
    const ag = await agent('CSKH Task', ['message.send', 'contact.update']);
    const old = await customerWithConv('Chị Hà Im Lặng', '0909100001', { lastAt: new Date(h.clock.now().getTime() - 10 * 86_400_000) });
    await customerWithConv('Anh Mới', '0909100002');
    const targets = await collectTargets(db, 'follow_up', { days: 7, limit: 20 }, narrowScope(authzForRole('owner', h.user), ['customers', 'conversations']), h.clock.now());
    expect(targets.map((x) => x.contact)).toContain('Chị Hà Im Lặng');
    expect(targets.map((x) => x.contact)).not.toContain('Anh Mới');

    const id = (await task({ name: 'Follow-up 7 ngày', goal: 'Hỏi thăm', trigger: 'schedule', template: 'follow_up', agent_id: ag })).body.data.result.task_id;
    const run = (await act('ai_task.run_now', { task_id: id })).body.data.result.run_id as string;
    seen.length = 0;
    const script: MockScript = ({ lastTool }) => (lastTool ? { text: 'Đã gửi hỏi thăm 1 khách.' } : { tool: 'message__send', input: { conversation_id: old.conv, text: 'Chào chị Hà, dạo này chị thế nào ạ?' } });
    const r = await runTask(deps(script), db, h.ws, { task_id: id, run_id: run });
    expect(r.status).toBe('waiting_approval');
    expect(seen[0]!.prompt).toContain('Chị Hà Im Lặng');
    expect(seen[0]!.prompt).toContain(old.conv);
    expect(seen[0]!.tools.sort()).toEqual(['message__send']);
    expect(await db.approvalRequest.count({ where: { runId: run, actionId: 'message.send', status: 'pending' } })).toBe(1);
    expect(await db.message.count({ where: { conversationId: old.conv, direction: 'out' } })).toBe(0);
    const s = await db.assistantSession.findFirstOrThrow({ where: { userId: h.user, mode: 'cowork', title: 'Follow-up 7 ngày' } });
    const msg = await db.assistantMessage.findFirstOrThrow({ where: { sessionId: s.id, runId: run } });
    expect(JSON.stringify(msg.content)).toContain('chờ bạn duyệt');
  });

  it('tắt "hỏi trước khi gửi" → gửi luôn; khách vừa có tin ra trong 24 giờ không vào danh sách lần sau', async () => {
    const db = await tenant();
    const ag = (await db.aiAgent.findFirstOrThrow({ where: { name: 'CSKH Task' } })).id;
    const k = await customerWithConv('Chú Bảy Im Lặng', '0909100003', { lastAt: new Date(h.clock.now().getTime() - 9 * 86_400_000) });
    const id = (await task({ name: 'Follow-up tự gửi', goal: 'Hỏi thăm', trigger: 'manual', template: 'follow_up', agent_id: ag, ask_before_send: false, params: { days: 7, limit: 1 } })).body.data.result.task_id;
    const run = (await db.aiRun.findFirstOrThrow({ where: { taskId: id } })).id;
    const script: MockScript = ({ lastTool }) => (lastTool ? { text: 'Đã gửi.' } : { tool: 'message__send', input: { conversation_id: k.conv, text: 'Chào chú Bảy ạ' } });
    expect((await runTask(deps(script), db, h.ws, { task_id: id, run_id: run })).status).toBe('completed');
    const steps = await db.aiRunStep.findMany({ where: { runId: run, type: 'tool' } });
    expect(await db.message.count({ where: { conversationId: k.conv, direction: 'out' } }), JSON.stringify(steps.map((x) => x.output))).toBe(1);
    const again = await collectTargets(db, 'follow_up', { days: 7, limit: 20 }, authzForRole('owner', h.user), h.clock.now());
    expect(again.map((x) => x.contact)).not.toContain('Chú Bảy Im Lặng');
    expect(await db.aiTask.findUniqueOrThrow({ where: { id } })).toMatchObject({ lastRunStatus: 'completed', runCount: 1 });
  });

  it('người tạo mất quyền / agent tạm dừng → lượt lỗi có lý do đọc được + thông báo ai_task_failed', async () => {
    const db = await tenant();
    const ag = (await db.aiAgent.findFirstOrThrow({ where: { name: 'CSKH Task' } })).id;
    const id = (await task({ name: 'Lỗi agent', goal: 'g', trigger: 'schedule', agent_id: ag })).body.data.result.task_id;
    await act('agent.pause', { agent_id: ag, paused: true });
    const run = (await act('ai_task.run_now', { task_id: id })).body.data.result.run_id as string;
    expect(await runTask(deps([{ text: 'x' }]), db, h.ws, { task_id: id, run_id: run })).toMatchObject({ status: 'failed', reason: 'agent' });
    expect((await db.aiRun.findUniqueOrThrow({ where: { id: run } })).error).toBe('agent thực hiện không còn chạy');
    const ev = await db.outboxEvent.findFirstOrThrow({ where: { topic: 'notify.requested' }, orderBy: { createdAt: 'desc' } });
    expect(ev.payload).toMatchObject({ kind: 'ai_task_failed', to: { user_ids: [h.user] }, params: { name: 'Lỗi agent' } });
    await act('agent.pause', { agent_id: ag, paused: false });
  });
});

describe('mẫu chủ động + bản tin sáng (AC5)', () => {
  it('báo giá treo > 3 ngày; lịch hẹn trong 24 giờ; đơn hoàn tất cách đây 3 ngày — đúng đối tượng', async () => {
    const db = await tenant();
    const q = await customerWithConv('Chị Quỳnh Báo Giá', '0909100011');
    const o = await customerWithConv('Anh Ổn Đơn Hàng', '0909100012');
    const now = h.clock.now();
    const qr = await act('quote.create', { contact_id: q.contactId, items: [{ name: 'Gói chăm sóc', qty: 1, unit_price: '1500000', tax_rate: 8 }] }, idem());
    expect(qr.status, JSON.stringify(qr.body)).toBe(200);
    await db.quote.update({ where: { id: qr.body.data.result.quote_id }, data: { status: 'sent', sentAt: new Date(now.getTime() - 4 * 86_400_000) } });
    const owner = authzForRole('owner', h.user);
    expect((await collectTargets(db, 'stale_quote', { days: 3 }, owner, now)).map((x) => x.contact)).toContain('Chị Quỳnh Báo Giá');
    const ord = await act('order.create', { contact_id: o.contactId, items: [{ name: 'Serum', qty: 1, unit_price: '300000', tax_rate: 8 }] }, idem());
    expect(ord.status, JSON.stringify(ord.body)).toBe(200);
    await db.order.update({ where: { id: ord.body.data.result.order_id }, data: { status: 'completed', completedAt: new Date(now.getTime() - 3.5 * 86_400_000) } });
    expect((await collectTargets(db, 'aftercare', { days: 3 }, owner, now)).map((x) => x.contact)).toContain('Anh Ổn Đơn Hàng');
    // Nhóm dữ liệu chỉ "Khách hàng" → scope sales = none → báo giá không vào danh sách.
    expect(await collectTargets(db, 'stale_quote', { days: 3 }, narrowScope(owner, ['customers']), now)).toEqual([]);
  });

  it('bản tin sáng: đếm chờ duyệt / hội thoại cần người / ticket quá hạn / credit thấp → tin trong phiên Cowork + thông báo; không tốn credit', async () => {
    const db = await tenant();
    const b = await buildBriefing(db, authzForRole('owner', h.user), h.clock.now(), { timeZone: 'UTC', locale: 'vi' }, 50);
    expect(b.counts.approvals).toBeGreaterThanOrEqual(1);
    expect(b.lines.map((l) => l.route)).toEqual(expect.arrayContaining(['/assistant/approvals', '/settings/wallet']));
    const id = (await task({ name: 'Bản tin sáng', goal: 'g', trigger: 'schedule', template: 'briefing' })).body.data.result.task_id;
    expect((await db.aiTask.findUniqueOrThrow({ where: { id } })).agentId).toBeNull();
    const run = (await act('ai_task.run_now', { task_id: id })).body.data.result.run_id as string;
    expect((await runTask(deps([]), db, h.ws, { task_id: id, run_id: run })).status).toBe('completed');
    expect((await db.aiRun.findUniqueOrThrow({ where: { id: run } })).creditsUsed).toBe(0);
    const msg = await db.assistantMessage.findFirstOrThrow({ where: { runId: run } });
    expect(JSON.stringify(msg.content)).toMatch(/Bản tin sáng 30\/10\/2026.*việc chờ bạn duyệt/);
    expect(JSON.stringify(msg.content)).toContain('"route":"/assistant/approvals"');
    const ev = await db.outboxEvent.findFirstOrThrow({ where: { topic: 'notify.requested' }, orderBy: { createdAt: 'desc' } });
    expect(ev.payload).toMatchObject({ kind: 'ai_briefing', to: { user_ids: [h.user] } });
  });

  it('GET /v1/ai-tasks khớp schema FE: thẻ + 6 chỉ số + 5 mẫu + agent chọn được + drawer theo tác vụ có nhật ký', async () => {
    const r = await get('/ai-tasks');
    expect(r.status).toBe(200);
    const d = aiTasksPayloadSchema.parse(r.body.data);
    expect(d.stats.map((s) => s.key)).toEqual(['total', 'active', 'runs', 'auto', 'tokens', 'attention']);
    expect(d.templates.map((t) => t.template)).toEqual(['follow_up', 'stale_quote', 'appointment_reminder', 'aftercare', 'briefing']);
    expect(d.agents.map((a) => a.name)).toEqual(expect.arrayContaining(['Sales Task', 'CSKH Task']));
    const fu = d.tasks.find((t) => t.name === 'Follow-up tự gửi')!;
    expect(fu).toMatchObject({ runs: 1, success: '100%', trigger: 'manual', template: 'follow_up', agent_name: 'CSKH Task', ask_before_send: false });
    expect(d.drawers[fu.id]!.logs[0]).toMatchObject({ text: expect.stringMatching(/^Chạy xong/) });
    expect((await get('/ai-tasks', await h.member('accountant'))).status).toBe(200);
  });
});
