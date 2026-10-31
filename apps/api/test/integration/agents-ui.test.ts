// TIP-024 AC1–AC2 trên Postgres 16 + Memurai: migration 024 (`ai_agent.keywords`); cấu hình agent đủ trường Builder (vai trò hiển
// thị, tính cách, từ khoá, khung giờ, mẫu → created_via=template) qua tạo / phiên bản / GET; mẫu theo vai trò + defaults; gợi ý Trợ
// lý từ dữ liệu thật; Sửa & duyệt (input sửa kiểm bằng schema action gốc, job chạy input đã sửa đúng một lần); tab Hết hạn; Nhật ký:
// "Đang chờ" = yêu cầu duyệt còn hạn, total theo bộ lọc, undoable chỉ với việc của mình; agent ngoài giờ hành chính không trả lời.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ActionExecutor, REDIS, WalletService, createLogger, replyTurn, resumeApproval, uuidv7, withinHours, type ActionContext, type ResumeDeps } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { actionLogsPageSchema, agentSchema, agentTemplateSchema, approvalRowSchema, authzForRole } from '@appchat/shared';
import { z } from 'zod';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let manager: { id: string; token: string };
let sales: { id: string; token: string };

beforeAll(async () => {
  h = await startApi();
  manager = await h.member('manager');
  sales = await h.member('sales');
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
  const team = await h.platform.plan.findUniqueOrThrow({ where: { key: 'team' } });
  await h.platform.subscription.create({ data: { id: uuidv7(), workspaceId: h.ws, planId: team.id, status: 'active', currentPeriodStart: h.clock.now() } });
});
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u: { token: string }) => ({ authorization: `Bearer ${u.token}` });
const idem = () => ({ 'idempotency-key': uuidv7() });
const act = (id: string, input: unknown, headers: Record<string, string> = {}) => call(h, `/actions/${id}`, { input }, headers).then(json);
const get = (path: string, who?: { token: string }) => call(h, path, undefined, who ? as(who) : {}).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const executor = () => h.app.get(ActionExecutor, { strict: false });
const deps = (): ResumeDeps => ({
  tenants: resolver,
  executor: executor(),
  runner: null,
  kv: h.app.get(REDIS, { strict: false }),
  log: createLogger({ level: 'silent' }),
  now: () => h.clock.now(),
  commander: async () => authzForRole('owner', h.user) as never,
});
/** Tác vụ Cowork (source task) xoá mẫu tài liệu (handler test `doc_template.delete` — setup.ts) → policy `task × delete` = duyệt. */
const taskCtx = (): ActionContext => ({ workspaceId: h.ws, source: 'task', actor: { type: 'system', id: 'cowork' }, onBehalfOfUserId: h.user, authz: authzForRole('owner', h.user) as never });
const newTemplate = async () => {
  const id = uuidv7();
  await (await tenant()).notification.create({ data: { id, userId: h.user, type: 'tag', title: `mẫu-${id.slice(-6)}` } });
  return id;
};
const askDelete = async () => {
  const out = await executor().execute(taskCtx(), 'doc_template.delete', { template_id: await newTemplate() });
  return (out.data as { approval_id: string }).approval_id;
};

describe('cấu hình agent (AC1)', () => {
  it('migration 024: cột keywords text[]', async () => {
    const [c] = await (await tenant()).$queryRaw<{ data_type: string }[]>`SELECT data_type FROM information_schema.columns WHERE table_name = 'ai_agent' AND column_name = 'keywords'`;
    expect(c?.data_type).toBe('ARRAY');
  });

  it('tạo từ mẫu với vai trò hiển thị / tính cách / từ khoá / khung giờ → GET + phiên bản giữ đủ; created_via=template', async () => {
    const r = await act(
      'agent.create_and_publish',
      { name: 'CSKH Spa', role: 'cs', role_label: 'Chăm sóc khách', persona: 'Thân thiện', keywords: ['bảo hành', ' khiếu nại ', 'bảo hành'], working_hours: 'office', template_id: 'tpl_2', tools: ['ticket.create'] },
      idem(),
    );
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const id = r.body.data.result.agent_id as string;
    const a = agentSchema.parse((await get(`/agents/${id}`)).body.data);
    expect(a).toMatchObject({ role_label: 'Chăm sóc khách', persona: 'Thân thiện', keywords: ['bảo hành', 'khiếu nại'], working_hours: 'office', template_id: 'tpl_2' });
    const db = await tenant();
    expect((await db.aiAgent.findUniqueOrThrow({ where: { id } })).createdVia).toBe('template');
    expect((await db.aiAgentVersion.findFirstOrThrow({ where: { agentId: id } })).config).toMatchObject({ keywords: ['bảo hành', 'khiếu nại'], working_hours: 'office', role_label: 'Chăm sóc khách' });
    // Sửa bản nháp: đổi khung giờ → luôn hoạt động.
    expect((await act('agent.update', { agent_id: id, patch: { working_hours: 'always', keywords: [] } })).status).toBe(200);
    expect((await get(`/agents/${id}`)).body.data).toMatchObject({ working_hours: 'always', keywords: [], dirty: true });
    expect((await act('agent.update', { agent_id: id, patch: { working_hours: 'night' } })).status).toBe(422);
  });

  it('giờ hành chính 8:00–17:30 giờ VN (gồm 8:00, không gồm 17:30)', () => {
    expect(withinHours('office', new Date('2026-11-02T01:00:00Z'))).toBe(true); // 8:00 VN
    expect(withinHours('office', new Date('2026-11-02T00:59:00Z'))).toBe(false); // 7:59
    expect(withinHours('office', new Date('2026-11-02T10:29:00Z'))).toBe(true); // 17:29
    expect(withinHours('office', new Date('2026-11-02T10:30:00Z'))).toBe(false); // 17:30
    expect(withinHours('always', new Date('2026-11-02T20:00:00Z'))).toBe(true);
    expect(withinHours('custom', new Date('2026-11-02T20:00:00Z'))).toBe(true);
  });

  it('mẫu: role + defaults (D15), lọc ?role=', async () => {
    const cs = z.array(agentTemplateSchema).parse((await get('/agent-templates?role=cs')).body.data.data);
    expect(cs.length).toBeGreaterThan(0);
    expect(cs.every((t) => t.role === 'cs')).toBe(true);
    expect(cs.find((t) => t.id === 'tpl_2')!.defaults).toMatchObject({ tools: expect.arrayContaining(['ticket.create']), intents: [2, 3, 4], model_tier: 'advanced', threshold: 70 });
    expect(cs[0]!.defaults.prompt).toMatch(/# VAI TRÒ/);
  });

  it('gợi ý Trợ lý từ dữ liệu thật: số agent đang chạy, lượt hôm nay; mục khác "create" có câu hỏi', async () => {
    const meta = (await get('/agents/meta')).body.data;
    const by = Object.fromEntries((meta.ai_suggests as { key: string; desc: string; ask?: string }[]).map((s) => [s.key, s]));
    expect(Object.keys(by)).toEqual(['create', 'optimize', 'routing', 'report']);
    expect(by.routing!.desc).toMatch(/^1 agent đang chạy/);
    expect(by.report!.desc).toBe('Hôm nay chưa có lượt xử lý nào');
    expect(by.optimize!.desc).not.toMatch(/4\.4★/);
    expect(by.report!.ask).toBeTruthy();
    expect(by.create!.ask).toBeUndefined();
  });
});

describe('Chờ duyệt (AC2)', () => {
  it('Sửa & duyệt: input sửa gộp + kiểm schema; trạng thái edited (tab Đã duyệt); job chạy input đã sửa đúng một lần', async () => {
    const apId = await askDelete();
    const row = z.array(approvalRowSchema).parse((await get('/approvals?status=pending')).body.data).find((r) => r.id === apId)!;
    expect(row.fields).toEqual([{ key: 'template_id', type: 'string', required: true }]);
    expect(row.input).toHaveProperty('template_id');
    expect((await act('approval.edit_and_approve', { approval_id: apId, edited_input: { template_id: '' } })).status).toBe(422);
    const target = await newTemplate();
    const r = await act('approval.edit_and_approve', { approval_id: apId, edited_input: { template_id: target }, note: 'Xoá đúng mẫu' });
    expect(r.body.data.result).toEqual({ approval_id: apId, status: 'edited' });
    expect((await act('approval.approve', { approval_id: apId })).status).toBe(409);
    expect(await resumeApproval(deps(), h.ws, apId, 'decided')).toBe('done');
    const db = await tenant();
    expect(await db.notification.findUnique({ where: { id: target } })).toBeNull();
    expect(await db.notification.findUnique({ where: { id: row.input.template_id as string } })).not.toBeNull();
    await resumeApproval(deps(), h.ws, apId, 'decided');
    expect(await db.actionLog.count({ where: { actionId: 'doc_template.delete', input: { path: ['template_id'], equals: target } } })).toBe(1);
    const approved = z.array(approvalRowSchema).parse((await get('/approvals?status=approved')).body.data);
    expect(approved.find((x) => x.id === apId)).toMatchObject({ status: 'edited', note: 'Xoá đúng mẫu' });
  });

  it('từ chối có lý do; quá hạn → tab Hết hạn (kể cả khi job hết hạn chưa chạy)', async () => {
    const a = await askDelete();
    await act('approval.reject', { approval_id: a, note: 'Không cần' });
    expect(z.array(approvalRowSchema).parse((await get('/approvals?status=rejected')).body.data).find((x) => x.id === a)).toMatchObject({ note: 'Không cần' });
    const b = await askDelete();
    await (await tenant()).approvalRequest.update({ where: { id: b }, data: { expiresAt: new Date(h.clock.now().getTime() - 1000) } });
    expect((await get('/approvals?status=pending')).body.data.map((x: { id: string }) => x.id)).not.toContain(b);
    expect(z.array(approvalRowSchema).parse((await get('/approvals?status=expired')).body.data).find((x) => x.id === b)).toMatchObject({ status: 'expired' });
  });
});

describe('Nhật ký hành động (AC2)', () => {
  it('"Đang chờ" = yêu cầu duyệt còn hạn; total theo bộ lọc; lọc loại trong SQL', async () => {
    const apId = await askDelete();
    const pend = actionLogsPageSchema.parse((await get('/action-logs?status=pending')).body);
    expect(pend.data.find((r) => r.id === apId)).toMatchObject({ status: 'pending', kind: 'delete', undoable: false });
    expect(pend.total).toBe(pend.data.length);
    await act('contact.create', { full_name: 'Khách Nhật Ký', phone: '0909111222' }, idem());
    const created = actionLogsPageSchema.parse((await get('/action-logs?kind=create&status=done')).body);
    expect(created.data.every((r) => r.kind === 'create' && r.status === 'done')).toBe(true);
    expect(created.total).toBe(created.data.length);
    const all = actionLogsPageSchema.parse((await get('/action-logs')).body);
    expect(all.total).toBeGreaterThan(created.total);
  });

  it('undoable chỉ với việc của mình (hoặc Owner): Quản lý (audit.view) thấy việc của Owner nhưng không hoàn tác được', async () => {
    const c = await act('contact.create', { full_name: 'Khách Owner', phone: '0909333444' }, idem());
    const logId = c.body.data.action_log_id as string;
    expect(actionLogsPageSchema.parse((await get('/action-logs?kind=create')).body).data.find((r) => r.id === logId)).toMatchObject({ undoable: true });
    expect(actionLogsPageSchema.parse((await get('/action-logs?kind=create', manager)).body).data.find((r) => r.id === logId)).toMatchObject({ undoable: false });
    const mine = await call(h, '/actions/contact.create', { input: { full_name: 'Khách Sales', phone: '0909555666' } }, { ...as(sales), ...idem() }).then(json);
    const rows = actionLogsPageSchema.parse((await get('/action-logs', sales)).body).data;
    expect(rows.find((r) => r.id === mine.body.data.action_log_id)).toMatchObject({ undoable: true });
    expect(rows.find((r) => r.id === logId)).toBeUndefined();
  });
});

describe('agent ngoài giờ (AC2)', () => {
  it('working_hours=office ngoài 8:00–17:30 VN → lượt trực kênh bỏ qua, không gửi', async () => {
    const ag = await act('agent.create_and_publish', { name: 'Giờ HC', role: 'cs', working_hours: 'office' }, idem());
    const agentId = ag.body.data.result.agent_id as string;
    await act('webchat.update_widget', { enabled: true, name: 'Web Spa' });
    const db = await tenant();
    const acc = (await db.channelAccount.findFirstOrThrow({ where: { type: 'webchat' } })).id;
    const conv = uuidv7();
    await db.conversation.create({ data: { id: conv, channelAccountId: acc, channelType: 'webchat', externalThreadId: `t-${conv}`, assigneeAgentId: agentId, aiMode: 'auto', lastMessageAt: h.clock.now() } });
    await db.message.create({ data: { id: uuidv7(), conversationId: conv, channelAccountId: acc, direction: 'in', senderType: 'contact', senderId: 'v1', kind: 'text', body: 'Còn mở cửa không?', externalMsgId: uuidv7(), status: 'delivered', createdAt: h.clock.now() } });
    const night = new Date('2026-10-30T15:00:00Z'); // 22:00 VN
    const out = await replyTurn({ tenants: resolver, executor: executor(), runner: null as never, embedder: null, kv: h.app.get(REDIS, { strict: false }), log: createLogger({ level: 'silent' }), now: () => night }, h.ws, conv);
    expect(out).toBe('skipped');
    expect(await db.message.count({ where: { conversationId: conv, direction: 'out' } })).toBe(0);
  });
});
