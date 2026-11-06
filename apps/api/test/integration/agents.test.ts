// TIP-021 AC1–AC5 trên Postgres 16 + Memurai: migration 021 (index viết tay, CHECK, EXPLAIN); vòng đời agent (nháp → xuất bản →
// sửa (bản chạy giữ nguyên) → v2 → quay lại v1 = v3 → tạm dừng / chạy → xoá khi đang gán kênh 409 → xoá + hoàn tác); hạn mức gói
// 402; tool ngoài agentGrantable 422 / ngoài quyền 403; sales 403; chat thử / soạn từ mô tả / tối ưu prompt (model giả, dry-run, trừ
// credit); duyệt: action delete của tác vụ → 202 + approval_request → approve → job ai-resume chạy action đúng một lần + run chạy tiếp;
// reject; quyết lại 409; thiếu permission duyệt gốc 403; hết hạn → expired + run handoff; GET routes khớp schema FE; governance.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import pg from 'pg';
import { AiJobsModule, AiRunner, ActionExecutor, CLOCK, REDIS, KernelModule, LOGGER, RunStore, WalletService, createLogger, resumeApproval, uuidv7, type ActionContext, type ResumeDeps } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { agentSchema, agentTemplateSchema, agentToolsSchema, agentVersionSchema, approvalRowSchema, authzForRole, governanceSchema } from '@appchat/shared';
import { z } from 'zod';
import { call, env, startApi, type Harness } from './setup';
import { until } from './worker.harness';

let h: Harness;
let ai: TestingModule;
let resolver: TenantDbResolver;
let sales: { id: string; token: string };

beforeAll(async () => {
  h = await startApi({ probes: true });
  sales = await h.member('sales');
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  ai = await Test.createTestingModule({ imports: [KernelModule.forRoot({ ...env, LOG_LEVEL: 'silent' }), AiJobsModule] })
    .overrideProvider(LOGGER)
    .useValue(createLogger({ level: 'silent' }))
    .overrideProvider(CLOCK)
    .useValue(h.clock)
    .compile();
  await ai.init();
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
  // Gói Team (5 agent) cho phần lớn test; test hạn mức đổi gói riêng.
  const team = await h.platform.plan.findUniqueOrThrow({ where: { key: 'team' } });
  await h.platform.subscription.create({ data: { id: uuidv7(), workspaceId: h.ws, planId: team.id, status: 'active', currentPeriodStart: h.clock.now() } });
});
afterAll(async () => {
  await ai?.close();
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u: { token: string }) => ({ authorization: `Bearer ${u.token}` });
const idem = () => ({ 'idempotency-key': uuidv7() });
const act = (id: string, input: unknown, headers: Record<string, string> = {}) => call(h, `/actions/${id}`, { input }, headers).then(json);
const get = (path: string, who?: { token: string }) => call(h, path, undefined, who ? as(who) : {}).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const create = (input: Record<string, unknown>) => act('agent.create', input, idem());

describe('schema', () => {
  it('AC1 migration 021: index viết tay + CHECK + FK; EXPLAIN danh sách agent / duyệt chờ dùng index', async () => {
    const db = await tenant();
    const idx = (await db.$queryRaw<{ indexname: string }[]>`SELECT indexname FROM pg_indexes WHERE tablename IN ('ai_agent','ai_agent_version','approval_request','ai_run')`).map((r) => r.indexname);
    expect(idx).toEqual(expect.arrayContaining(['ai_agent_live_created_idx', 'ai_agent_version_agent_id_version_key', 'approval_request_status_requested_at_idx', 'approval_request_pending_expires_idx', 'approval_request_run_idx', 'ai_run_agent_idx']));
    await expect(db.aiGovernance.create({ data: { id: 2 } })).rejects.toThrow(/ai_governance_singleton/);
    await expect(db.aiAgentVersion.create({ data: { id: uuidv7(), agentId: uuidv7(), version: 1, config: {}, publishedAt: new Date() } })).rejects.toThrow();
    const c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL!.replace(/\/[^/?]*(\?|$)/, `/${(await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).dbName}$1`) });
    await c.connect();
    try {
      await c.query('SET enable_seqscan = off');
      const q = (sql: string) => c.query(`EXPLAIN ${sql}`).then((r) => r.rows.map((x) => x['QUERY PLAN']).join('\n'));
      expect(await q(`SELECT * FROM ai_agent WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 200`)).toMatch(/ai_agent_live_created_idx/);
      expect(await q(`SELECT * FROM approval_request WHERE status = 'pending' ORDER BY requested_at DESC LIMIT 100`)).toMatch(/approval_request_status_requested_at_idx/);
      expect(await q(`SELECT id FROM approval_request WHERE status = 'pending' AND expires_at < now()`)).toMatch(/approval_request_pending_expires_idx/);
    } finally {
      await c.end();
    }
  });
});

describe('vòng đời agent', () => {
  let id = '';

  it('AC2 tạo → nháp (v0); xuất bản → v1 active; sửa → dirty, bản chạy giữ nguyên; xuất bản → v2; quay lại v1 → v3 = cấu hình v1', async () => {
    const r = await create({ name: 'CSKH Spa', role: 'cs', tools: ['ticket.create', 'conversation.handoff'], channels: ['zalo_personal'], threshold: 80 });
    expect(r.status).toBe(200);
    id = r.body.data.result.agent_id;
    expect(agentSchema.parse((await get(`/agents/${id}`)).body.data)).toMatchObject({ status: 'draft', version: 0, dirty: true, threshold: 80 });
    expect((await act('agent.publish', { agent_id: id, note: 'Bản đầu' })).body.data.result).toEqual({ agent_id: id, version: 1 });
    await act('agent.update', { agent_id: id, patch: { threshold: 90, prompt: 'Mới' } });
    const db = await tenant();
    const v1 = await db.aiAgentVersion.findUniqueOrThrow({ where: { agentId_version: { agentId: id, version: 1 } } });
    expect(v1.config).toMatchObject({ threshold: 80 });
    expect((await get(`/agents/${id}`)).body.data).toMatchObject({ status: 'active', version: 1, dirty: true, threshold: 90 });
    expect((await act('agent.publish', { agent_id: id })).body.data.result.version).toBe(2);
    expect((await act('agent.rollback', { agent_id: id, version: 1 })).body.data.result.version).toBe(3);
    expect((await get(`/agents/${id}`)).body.data).toMatchObject({ version: 3, threshold: 80, dirty: false });
    const versions = z.array(agentVersionSchema).parse((await get(`/agents/${id}/versions`)).body.data);
    expect(versions.map((v) => [v.version, v.note])).toEqual([[3, '↩ v1'], [2, ''], [1, 'Bản đầu']]);
    expect(versions[0]!.published_by).not.toBe('—');
    expect((await db.outboxEvent.findMany({ where: { topic: 'agent.published' } })).length).toBeGreaterThanOrEqual(3);
  });

  it('AC2 sửa + hoàn tác; tạm dừng / chạy; bản nháp chưa xuất bản không tạm dừng được (409)', async () => {
    const u = await act('agent.update', { agent_id: id, patch: { name: 'Đổi tên' } });
    expect((await get(`/agents/${id}`)).body.data.name).toBe('Đổi tên');
    expect((await call(h, `/action-logs/${u.body.data.action_log_id}/undo`, {}).then(json)).status).toBe(200);
    expect((await get(`/agents/${id}`)).body.data.name).toBe('CSKH Spa');
    expect((await act('agent.pause', { agent_id: id, paused: true })).body.data.result.status).toBe('paused');
    expect((await act('agent.pause', { agent_id: id, paused: false })).body.data.result.status).toBe('active');
    const d = (await create({ name: 'Nháp' })).body.data.result.agent_id;
    expect((await act('agent.pause', { agent_id: d, paused: true })).body.error.code).toBe('INVALID_TRANSITION');
    await act('agent.delete', { agent_id: d });
  });

  it('AC2 xoá khi đang gán kênh → 409 HAS_DEPENDENCIES; bỏ gán → xoá được + hoàn tác; kênh hiện tên agent (DC-076)', async () => {
    const db = await tenant();
    const acc = uuidv7();
    await db.channelAccount.create({ data: { id: acc, type: 'webchat', name: 'Web', status: 'connected', settings: {} } });
    expect((await act('channel.update_settings', { channel_account_id: acc, patch: { agent_id: 'ag_khong_ton_tai' } })).status).toBe(404);
    expect((await act('channel.update_settings', { channel_account_id: acc, patch: { agent_id: id } })).status).toBe(200);
    const web = (await get('/settings/channels')).body.data.find((c: { type: string }) => c.type === 'webchat');
    expect(web.accounts.find((a: { id: string }) => a.id === acc)).toMatchObject({ agent_id: id, agent: 'CSKH Spa' });
    const del = await act('agent.delete', { agent_id: id });
    expect(del).toMatchObject({ status: 409, body: { error: { code: 'HAS_DEPENDENCIES', fields: { channel_accounts: 'Web' } } } });
    await act('channel.update_settings', { channel_account_id: acc, patch: { agent_id: '' } });
    const ok = await act('agent.delete', { agent_id: id });
    expect(ok.status).toBe(200);
    expect((await get(`/agents/${id}`)).status).toBe(404);
    expect((await call(h, `/action-logs/${ok.body.data.action_log_id}/undo`, {}).then(json)).status).toBe(200);
    expect((await get(`/agents/${id}`)).status).toBe(200);
    await db.channelAccount.update({ where: { id: acc }, data: { status: 'disconnected' } });
  });

  it('AC2 tool ngoài agentGrantable → 422; sales (không agents.manage) → 403 ghi + đọc', async () => {
    expect((await create({ name: 'Lạ', tools: ['agent.delete'] })).body.error).toMatchObject({ code: 'VALIDATION_FAILED' });
    expect((await act('agent.create', { name: 'x' }, { ...idem(), ...as(sales) })).status).toBe(403);
    expect((await get('/agents/meta', sales)).status).toBe(403);
    expect((await get(`/agents/${id}`, sales)).status).toBe(403);
  });

  it('AC2 hạn mức gói: Miễn phí 1 agent → agent thứ hai 402 PLAN_LIMIT_REACHED', async () => {
    const free = await h.platform.plan.findUniqueOrThrow({ where: { key: 'free' } });
    const team = await h.platform.plan.findUniqueOrThrow({ where: { key: 'team' } });
    await h.platform.subscription.update({ where: { workspaceId: h.ws }, data: { planId: free.id } });
    try {
      expect(await create({ name: 'Quá hạn mức' })).toMatchObject({ status: 402, body: { error: { code: 'PLAN_LIMIT_REACHED', fields: { resource: 'agents', limit: '1' } } } });
    } finally {
      await h.platform.subscription.update({ where: { workspaceId: h.ws }, data: { planId: team.id } });
    }
  });

  it('AC2 create_and_publish → v1 active; hoàn tác = tạm dừng + xoá mềm', async () => {
    const r = await act('agent.create_and_publish', { name: 'Booking', role: 'booking', tools: ['appointment.find_slots'] }, idem());
    expect(r.body.data.result.version).toBe(1);
    const aid = r.body.data.result.agent_id;
    expect((await get(`/agents/${aid}`)).body.data).toMatchObject({ status: 'active', version: 1 });
    await call(h, `/action-logs/${r.body.data.action_log_id}/undo`, {});
    expect((await get(`/agents/${aid}`)).status).toBe(404);
  });
});

describe('model (giả)', () => {
  it('AC3 agent.test: trả lời theo bản nháp, run dry_run ghi lại, trừ credit; không ghi dữ liệu nghiệp vụ', async () => {
    const before = (await h.app.get(WalletService, { strict: false }).balance(h.ws)).total;
    const r = await act('agent.test', { config: { name: 'Thử', tools: ['ticket.create'] }, text: 'Giá liệu trình bao nhiêu?' });
    expect(r.status).toBe(200);
    expect(r.body.data.result.reply).toContain('Giá liệu trình');
    const run = await (await tenant()).aiRun.findFirstOrThrow({ where: { title: 'Thử' }, orderBy: { startedAt: 'desc' } });
    expect(run).toMatchObject({ dryRun: true, status: 'completed', kind: 'agent_reply' });
    expect((await h.app.get(WalletService, { strict: false }).balance(h.ws)).total).toBeLessThan(before);
  });

  it('AC3 draft_from_description → cấu hình hợp lệ (tool ⊆ quyền); optimize_prompt thêm khối định dạng một lần', async () => {
    const d = (await act('agent.draft_from_description', { description: 'Agent CSKH cho spa, đặt lịch qua Zalo' })).body.data.result.draft;
    expect(d).toMatchObject({ role: 'booking', channels: ['zalo_personal'] });
    expect(d.tools.length).toBeGreaterThan(0);
    const p1 = (await act('agent.optimize_prompt', { prompt: 'Bạn là trợ lý' })).body.data.result.prompt;
    expect(p1).toContain('# ĐỊNH DẠNG TRẢ LỜI');
    expect((await act('agent.optimize_prompt', { prompt: p1 })).body.data.result.prompt).toBe(p1);
  });
});

describe('duyệt (approval)', () => {
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
  /** Tác vụ Cowork (source task) xoá chiến dịch nháp → policy `task × delete` = approval. */
  const taskCtx = (runId?: string): ActionContext => ({ workspaceId: h.ws, source: 'task', actor: { type: 'system', id: 'cowork' }, onBehalfOfUserId: h.user, ...(runId ? { runId } : {}), authz: authzForRole('owner', h.user) as never });
  /** Bản ghi cho handler test `campaign.delete` (bảng kernel `notification` — setup.ts). */
  const newTemplate = async () => {
    const id = uuidv7();
    await (await tenant()).notification.create({ data: { id, userId: h.user, type: 'tag', title: `mẫu-${id.slice(-6)}` } });
    return id;
  };

  it('AC4 action cần duyệt → 202 approval_required + approval_request pending (tiêu đề từ preview) + event + GET /approvals', async () => {
    const tpl = await newTemplate();
    const out = await executor().execute(taskCtx(), 'campaign.delete', { campaign_id: tpl });
    expect(out).toMatchObject({ status: 202, data: { status: 'approval_required' } });
    const apId = (out.data as { approval_id: string }).approval_id;
    const db = await tenant();
    expect(await db.approvalRequest.findUniqueOrThrow({ where: { id: apId } })).toMatchObject({ status: 'pending', actionId: 'campaign.delete', permission: 'campaign.approve', risk: 'delete', source: 'task' });
    expect((await db.outboxEvent.findMany({ where: { topic: 'approval.requested' } })).map((e) => (e.payload as { approval_id: string }).approval_id)).toContain(apId);
    const rows = z.array(approvalRowSchema).parse((await get('/approvals?status=pending')).body.data);
    expect(rows.find((r) => r.id === apId)).toMatchObject({ status: 'pending', can_decide: true, day: 'today' });
    expect(await db.notification.findUnique({ where: { id: tpl } })).not.toBeNull();
  });

  it('AC4 approve → action chạy đúng một lần (job chạy lại không chạy lần hai); quyết lại 409', async () => {
    const tpl = await newTemplate();
    const out = await executor().execute(taskCtx(), 'campaign.delete', { campaign_id: tpl });
    const apId = (out.data as { approval_id: string }).approval_id;
    expect((await act('approval.approve', { approval_id: apId, note: 'ok' })).body.data.result).toEqual({ approval_id: apId, status: 'approved' });
    expect((await act('approval.reject', { approval_id: apId })).status).toBe(409);
    expect(await resumeApproval(deps(), h.ws, apId, 'decided')).toBe('done');
    const db = await tenant();
    expect(await db.notification.findUnique({ where: { id: tpl } })).toBeNull();
    const ap = await db.approvalRequest.findUniqueOrThrow({ where: { id: apId } });
    expect(ap.executedAt).not.toBeNull();
    expect(ap.result).toMatchObject({ kind: 'ok' });
    await resumeApproval(deps(), h.ws, apId, 'decided');
    expect(await db.actionLog.count({ where: { actionId: 'campaign.delete', input: { path: ['campaign_id'], equals: tpl } } })).toBe(1);
    // Chạy thẳng action với approvalId đã dùng → chặn.
    await expect(executor().execute({ ...taskCtx(), approvalId: apId }, 'campaign.delete', { campaign_id: tpl })).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('AC4 run chờ duyệt → approve → run chạy tiếp tới completed; reject → run nhận { rejected }', async () => {
    const store = new RunStore(await tenant(), () => h.clock.now());
    const runner = ai.get(AiRunner, { strict: false });
    for (const decision of ['approval.approve', 'approval.reject'] as const) {
      const tpl = await newTemplate();
      const run = await store.create({ kind: 'task', tier: 'standard', input: {}, title: `duyệt ${decision}` });
      const out = await executor().execute(taskCtx(run.id), 'campaign.delete', { campaign_id: tpl });
      const apId = (out.data as { approval_id: string }).approval_id;
      const call0 = { toolCallId: 'c1', toolName: 'campaign__delete', input: { campaign_id: tpl } };
      await store.claim(run.id, ['queued']);
      await store.pause(run.id, { messages: [{ role: 'user', content: 'xoá mẫu' }, { role: 'assistant', content: [{ type: 'tool-call', ...call0 }] }], results: [], pendingToolCall: call0, skipped: [], stepIdx: 1 }, apId);
      expect((await get('/runs?status=waiting_approval')).body.data.find((r: { id: string }) => r.id === run.id)).toMatchObject({ approval_id: apId });
      await act(decision, { approval_id: apId });
      expect(await resumeApproval({ ...deps(), runner }, h.ws, apId, 'decided')).toBe('done');
      const after = await store.get(run.id);
      expect(after!.status).toBe('completed');
      const step = await (await tenant()).aiRunStep.findFirstOrThrow({ where: { runId: run.id, meta: { path: ['resumed'], equals: true } } });
      expect(step.output).toMatchObject(decision === 'approval.approve' ? { kind: 'ok' } : { kind: 'ok', output: { rejected: true } });
    }
  });

  it('AC4 thiếu permission duyệt của action gốc → 403; sales không approvals.decide → 403; hết hạn → expired + run handoff', async () => {
    const tpl = await newTemplate();
    const store = new RunStore(await tenant(), () => h.clock.now());
    const run = await store.create({ kind: 'task', tier: 'standard', input: {}, title: 'hết hạn' });
    const out = await executor().execute(taskCtx(run.id), 'campaign.delete', { campaign_id: tpl });
    const apId = (out.data as { approval_id: string }).approval_id;
    expect((await act('approval.approve', { approval_id: apId }, as(sales))).status).toBe(403);
    const db = await tenant();
    await db.approvalRequest.update({ where: { id: apId }, data: { permission: 'quote.approve' } });
    const mgr = await h.member('cs');
    expect((await act('approval.approve', { approval_id: apId }, as(mgr))).status).toBe(403);
    await db.approvalRequest.update({ where: { id: apId }, data: { expiresAt: new Date(h.clock.now().getTime() - 1000) } });
    expect((await act('approval.approve', { approval_id: apId })).body.error.code).toBe('CONFLICT');
    await store.claim(run.id, ['queued']);
    expect(await resumeApproval(deps(), h.ws, apId, 'expire')).toBe('done');
    expect((await db.approvalRequest.findUniqueOrThrow({ where: { id: apId } })).status).toBe('expired');
    expect((await store.get(run.id))!.status).toBe('handoff');
  });

  it('AC4 worker ROLE=ai: approve qua API → job ai-resume (queue thật) tự chạy action đã duyệt + ghi kết quả tool', async () => {
    const tpl = await newTemplate();
    const out = await executor().execute(taskCtx(), 'campaign.delete', { campaign_id: tpl });
    const apId = (out.data as { approval_id: string }).approval_id;
    await act('approval.approve', { approval_id: apId });
    const db = await tenant();
    expect(await until(async () => !!(await db.approvalRequest.findUniqueOrThrow({ where: { id: apId } })).result)).toBe(true);
    // Từ TIP-037 worker ROLE=ai nạp MarketingModule → `campaign.delete` chạy handler THẬT (không còn probe của API harness): id là một thông
    // báo, không phải chiến dịch → lỗi NOT_FOUND được ghi cho model (run vẫn tiếp), không đánh dấu đã chạy.
    expect(await db.approvalRequest.findUniqueOrThrow({ where: { id: apId } })).toMatchObject({ result: { kind: 'error', code: 'NOT_FOUND' }, executedAt: null });
  });
});

describe('đọc', () => {
  it('AC5 GET /agents, /agents/meta, /agent-templates (lọc nhóm / ngành / tìm không dấu), /agents/:id/tools khớp schema FE', async () => {
    const list = z.array(agentSchema).parse((await get('/agents')).body.data);
    expect(list.length).toBeGreaterThan(0);
    const meta = (await get('/agents/meta')).body.data;
    expect(meta.taxonomy.length).toBe(8);
    expect(meta.template_names.length).toBe(20);
    const all = (await get('/agent-templates')).body.data;
    expect(z.array(agentTemplateSchema).parse(all.data)).toHaveLength(45);
    expect(all.total).toBe(45);
    expect((await get(`/agent-templates?group=${encodeURIComponent('Bất động sản')}`)).body.data.data.every((t: { tag: string }) => t.tag === 'BĐS')).toBe(true);
    expect((await get('/agent-templates?q=dat%20ban')).body.data.data.map((t: { name: string }) => t.name)).toContain('Nhà hàng & Đặt bàn');
    const tools = agentToolsSchema.parse((await get(`/agents/${list[0]!.id}/tools`)).body.data);
    const keys = tools.groups.map((g) => g.key);
    expect(keys.at(-1)).toBe('skill');
    const email = tools.groups.flatMap((g) => g.tools).find((t) => t.id === 'contact.send_email');
    expect(email).toMatchObject({ badge: 'needs_connector', connector: 'email' });
  });

  it('AC5 GET /conversations/:id/agent-tools: agent của tài khoản kênh, chỉ tool đã cấp; không agent → null', async () => {
    const db = await tenant();
    const a = (await create({ name: 'Trực web', tools: ['ticket.create', 'kb.search'] })).body.data.result.agent_id;
    const acc = uuidv7();
    await db.channelAccount.create({ data: { id: acc, type: 'webchat', name: 'Web 2', status: 'connected', settings: { agent_id: a } } });
    const conv = uuidv7();
    await db.conversation.create({ data: { id: conv, channelAccountId: acc, channelType: 'webchat', externalThreadId: `t-${conv}` } });
    const r = agentToolsSchema.parse((await get(`/conversations/${conv}/agent-tools`)).body.data);
    expect(r.agent).toEqual({ id: a, name: 'Trực web' });
    expect(r.groups.flatMap((g) => g.tools.map((t) => t.id)).sort()).toEqual(['kb.search', 'ticket.create']);
    await db.channelAccount.update({ where: { id: acc }, data: { settings: {} } });
    expect((await get(`/conversations/${conv}/agent-tools`)).body.data).toEqual({ agent: null, groups: [] });
    expect((await get(`/conversations/${uuidv7()}/agent-tools`)).status).toBe(404);
  });

  it('AC5 governance: GET khớp schema FE (n/m khuyến nghị); governance.update → đổi + n/m giảm; sales 403', async () => {
    const g = governanceSchema.parse((await get('/settings/governance')).body.data);
    expect(g).toMatchObject({ applied: g.total, filter: 'strict', retention: '90' });
    expect((await act('governance.update', { bounds: { discount: true }, keywords: ['cấm A', 'cấm A'], retention: '180', unknown: 1 })).status).toBe(200);
    const g2 = governanceSchema.parse((await get('/governance')).body.data);
    expect(g2.bounds.find((b) => b.key === 'discount')!.on).toBe(true);
    expect(g2).toMatchObject({ keywords: ['cấm A'], retention: '180', applied: g.total - 1 });
    expect((await get('/settings/governance', sales)).status).toBe(403);
  });
});
