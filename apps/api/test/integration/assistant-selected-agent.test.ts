// TIP-023d pha 7 (§5.1, §5.3-5.6, AC6-7) trên Postgres 16 + Memurai: agent người dùng chọn cho lượt Cowork.
//   - hai agent cùng tên → chọn theo UUID đúng agent; ghim id + bản đã xuất bản + mức AI cấu hình (hạ theo gói) vào ai_run.input;
//   - agent tạm dừng / id lạ → 404 lúc nhận lượt (không rơi về agent khác cùng tên / vai trò);
//   - run gốc không tự ghi nghiệp vụ (SELECTED_AGENT_ONLY), giao việc → đúng MỘT run con của agent đã chọn (bỏ agent_id model gửi khác);
//   - run con chạy bước hành động của kế hoạch qua cùng cổng claim (biên nhận thật, bước succeeded);
//   - agent xuất bản bản mới giữa chừng → giao tiếp bị chặn AGENT_UNAVAILABLE (bản đã ghim không bị thay);
//   - Chat: chỉ tool đọc, không plan / delegate.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AiSdkEngine, mockLanguageModel, staticModelSource, type MockScript } from '@appchat/ai';
import { ActionExecutor, AiRunner, CreditMeter, DbPriceBook, REDIS, WalletService, assistantConfirm, assistantTurn, createLogger, uuidv7, type AssistantDeps, type TurnRequest } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { authzForRole } from '@appchat/shared';
import { call, env, startApi, type Harness } from './setup';

const PROVIDER = `t-${uuidv7().slice(-12)}`;
const MODEL = 'mock-chat';
const log = createLogger({ level: 'silent' });

let h: Harness;
let resolver: TenantDbResolver;

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  await h.platform.modelPrice.create({ data: { providerKey: PROVIDER, model: MODEL, tier: 'standard', creditsPer1kIn: 1, creditsPer1kOut: 3 } });
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
  // Gói không giới hạn agent (test tạo 5 agent) — gói thử chỉ 1.
  const team = await h.platform.plan.findUniqueOrThrow({ where: { key: 'enterprise' } });
  await h.platform.subscription.create({ data: { id: uuidv7(), workspaceId: h.ws, planId: team.id, status: 'active', currentPeriodStart: h.clock.now() } });
});
afterAll(async () => {
  await h?.platform.modelPrice.deleteMany({ where: { providerKey: PROVIDER } });
  await resolver?.close();
  await h?.close();
});

const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const seen: { system: string; tools: string[] }[] = [];
function deps(script: MockScript): AssistantDeps {
  const model = mockLanguageModel(script, { provider: PROVIDER, model: MODEL });
  const spy = model.doStream.bind(model);
  model.doStream = async (o) => {
    const p = o.prompt as { role: string; content: unknown }[];
    seen.push({ system: p.filter((m) => m.role === 'system').map((m) => String(m.content)).join('\n'), tools: ((o.tools ?? []) as { name: string }[]).map((t) => t.name) });
    return spy(o);
  };
  const engine = new AiSdkEngine(staticModelSource([{ provider: PROVIDER, model: MODEL, handle: model }]));
  const runner = new AiRunner({ engine, meter: new CreditMeter(h.app.get(WalletService, { strict: false }), new DbPriceBook(h.platform)), log });
  return { executor: h.app.get(ActionExecutor, { strict: false }), runner, kv: h.app.get(REDIS, { strict: false }), now: () => h.clock.now(), planKey: async () => 'business' };
}
const owner = () => authzForRole('owner', h.user);
const who = (): Pick<TurnRequest, 'ws' | 'userId' | 'authz' | 'userName' | 'locale' | 'role'> => ({ ws: h.ws, userId: h.user, authz: owner(), userName: 'Owner', locale: 'vi', role: 'owner' });
type Body = { data?: { result?: Record<string, unknown> }; error?: { code: string } };
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(async (r) => ({ status: r.status, body: (await r.json()) as Body }));
const agent = async (name: string, tools: string[]) => {
  const r = await act('agent.create_and_publish', { name, role: 'sales', tools, threshold: 70, model_tier: 'max' });
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body.data!.result!.agent_id as string;
};
const isRoot = (system: string) => system.includes('# TRỢ LÝ APPCHAT');

describe('agent đã chọn (TIP-023d §5)', () => {
  it('trùng tên → đúng UUID, ghim bản + mức AI; tạm dừng / id lạ → 404 không rơi về agent khác', async () => {
    const other = await agent('Sales Trùng Tên', ['contact.search']);
    const mine = await agent('Sales Trùng Tên', ['contact.search', 'contact.create']);
    const quiet: MockScript = () => ({ text: 'đã nhận' });
    const r = await assistantTurn(deps(quiet), await tenant(), { mode: 'cowork', ...who(), text: 'chào', selectedAgentId: mine });
    const db = await tenant();
    const run = await db.aiRun.findUniqueOrThrow({ where: { id: r.run_id! } });
    expect((run.input as { selected_agent?: unknown }).selected_agent).toEqual({ id: mine, version: 1, tier: 'max' });
    expect(seen.at(-1)!.system).toContain(mine);
    expect(seen.at(-1)!.system).not.toContain(`(id: ${other}) cho lượt`);

    await expect(assistantTurn(deps(quiet), await tenant(), { mode: 'cowork', ...who(), text: 'x', selectedAgentId: uuidv7() })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect((await act('agent.pause', { agent_id: other, paused: true })).status).toBe(200);
    await expect(assistantTurn(deps(quiet), await tenant(), { mode: 'cowork', ...who(), text: 'x', selectedAgentId: other })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('run gốc không tự ghi; giao → một run con đúng agent chạy bước kế hoạch (claim thật); giao lại → cùng run con', async () => {
    const mine = await agent('Sales Chọn', ['contact.search', 'contact.create']);
    const decoy = await agent('Sales Mồi', ['contact.create']);
    const script: MockScript = ({ system, lastTool, call: n }) => {
      if (!isRoot(system)) return lastTool ? { text: 'đã tạo khách' } : { tool: 'contact__create', input: { full_name: 'Khách Chọn Agent', phone: '0911000777' } };
      if (!lastTool) return { tool: 'plan', input: { steps: [{ kind: 'action', title: 'Tạo khách', instructions: 'tạo', action_or_agent_id: 'contact.create' }] } };
      if (lastTool.tool === 'plan') return { tool: 'call_action', input: { action_id: 'contact.create', input: { full_name: 'Gốc Tự Ghi', phone: '0911000778' } } };
      if (lastTool.tool === 'call_action') return { tool: 'delegate', input: { agent_id: decoy, task: 'Tạo khách hàng' } };
      if (n < 8 && lastTool.tool === 'delegate' && JSON.stringify(lastTool.output).includes('SELECTED_AGENT_ONLY')) return { tool: 'delegate', input: { task: 'Tạo khách hàng' } };
      if (lastTool.tool === 'delegate' && JSON.stringify(lastTool.output).includes('completed') && n < 8) return { tool: 'delegate', input: { task: 'Tạo khách hàng lần nữa' } };
      return { text: 'xong' };
    };
    const r = await assistantTurn(deps(script), await tenant(), { mode: 'cowork', ...who(), text: 'tạo khách qua agent', selectedAgentId: mine });
    const card = (r.events as { type: string; action_id?: string; confirm_token: string }[]).find((e) => e.type === 'confirm' && e.action_id === 'assistant.plan_propose')!;
    await assistantConfirm(deps(script), await tenant(), { ws: h.ws, userId: h.user, authz: owner(), token: card.confirm_token, decision: 'confirm' });
    const db = await tenant();
    const steps = await db.aiRunStep.findMany({ where: { runId: r.run_id!, type: 'tool' }, orderBy: { idx: 'asc' }, select: { actionId: true, output: true } });
    expect(steps.find((s) => s.actionId === 'call_action')!.output).toMatchObject({ kind: 'error', code: 'SELECTED_AGENT_ONLY' });
    expect(steps.find((s) => s.actionId === 'delegate')!.output).toMatchObject({ kind: 'error', code: 'SELECTED_AGENT_ONLY' });
    const kids = await db.aiRun.findMany({ where: { parentRunId: r.run_id! } });
    expect(kids).toHaveLength(1);
    expect(kids[0]).toMatchObject({ kind: 'delegate', agentId: mine, agentVersion: 1, tier: 'max', childKey: 'selected:0', status: 'completed' });
    expect(await db.contact.count({ where: { name: 'Gốc Tự Ghi' } })).toBe(0);
    expect(await db.contact.count({ where: { name: 'Khách Chọn Agent' } })).toBe(1);
    const plan = await db.assistantPlan.findFirstOrThrow({ where: { rootRunId: r.run_id! }, include: { steps: true } });
    expect(plan.steps.map((s) => s.state)).toEqual(['succeeded']);
    expect(plan.phase).toBe('completed');
    expect(await db.assistantPlanAttempt.count({ where: { planId: plan.id } })).toBe(1);
  });

  it('agent xuất bản bản mới giữa chừng → giao bị chặn AGENT_UNAVAILABLE; Chat chỉ tool đọc', async () => {
    const mine = await agent('Sales Đổi Bản', ['contact.search', 'contact.create']);
    let republished = false;
    const script: MockScript = ({ system, lastTool }) => (!isRoot(system) ? { text: 'không được chạy' } : !lastTool ? { tool: 'delegate', input: { task: 'Rà khách' } } : { text: 'báo lại' });
    const d = deps(script);
    const orig = d.runner.start.bind(d.runner);
    d.runner.start = async (...a: Parameters<typeof orig>) => {
      if (!republished) {
        republished = true;
        expect((await act('agent.publish', { agent_id: mine, note: 'v2' })).status).toBe(200);
      }
      return orig(...a);
    };
    const r = await assistantTurn(d, await tenant(), { mode: 'cowork', ...who(), text: 'giao rà khách', selectedAgentId: mine });
    const db = await tenant();
    const del = await db.aiRunStep.findFirstOrThrow({ where: { runId: r.run_id!, actionId: 'delegate' } });
    expect(del.output).toMatchObject({ kind: 'error', code: 'AGENT_UNAVAILABLE' });
    expect(await db.aiRun.count({ where: { parentRunId: r.run_id! } })).toBe(0);

    await assistantTurn(deps(() => ({ text: 'chỉ đọc' })), await tenant(), { mode: 'chat', ...who(), text: 'xem', selectedAgentId: mine });
    expect(seen.at(-1)!.tools).not.toEqual(expect.arrayContaining(['plan']));
    expect(seen.at(-1)!.tools).not.toEqual(expect.arrayContaining(['delegate']));
  });
});
