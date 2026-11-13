// TIP-023d pha 4 (§2.1-2.4, AC1-AC2) trên Postgres 16 + Memurai: kế hoạch đã chốt → lời gọi ghi của Trợ lý ràng với bước hiện hành.
//   - đúng action của bước → thẻ xác nhận mang binding server (trạng thái dừng) → xác nhận → hiệu ứng chạy, claim + attempt + action_log,
//     bước `succeeded`, plan `completed` khi hết bước; tiến độ = biên nhận thật;
//   - action khác bước hiện hành → PLAN_UNDECLARED, không ghi gì;
//   - gọi lại cùng claim (lời gọi khác, cùng digest) → biên nhận cũ, không tạo bản ghi thứ hai; khác digest → 409;
//   - plan đã yêu cầu sửa (epoch tăng) → không admit (409), không ghi.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AiSdkEngine, mockLanguageModel, staticModelSource, type MockScript } from '@appchat/ai';
import { ActionExecutor, AiRunner, CreditMeter, DbPriceBook, REDIS, WalletService, assistantConfirm, assistantTurn, createLogger, uuidv7, type AssistantDeps, type TurnRequest } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { authzForRole } from '@appchat/shared';
import { env, startApi, type Harness } from './setup';

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
});
afterAll(async () => {
  await h?.platform.modelPrice.deleteMany({ where: { providerKey: PROVIDER } });
  await resolver?.close();
  await h?.close();
});

const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
function deps(script: MockScript): AssistantDeps {
  const model = mockLanguageModel(script, { provider: PROVIDER, model: MODEL });
  const engine = new AiSdkEngine(staticModelSource([{ provider: PROVIDER, model: MODEL, handle: model }]));
  const runner = new AiRunner({ engine, meter: new CreditMeter(h.app.get(WalletService, { strict: false }), new DbPriceBook(h.platform)), log });
  return { executor: h.app.get(ActionExecutor, { strict: false }), runner, kv: h.app.get(REDIS, { strict: false }), now: () => h.clock.now(), planKey: async () => 'business' };
}
const who = (): Pick<TurnRequest, 'ws' | 'userId' | 'authz' | 'userName' | 'locale' | 'role'> => ({ ws: h.ws, userId: h.user, authz: authzForRole('owner', h.user), userName: 'Owner', locale: 'vi', role: 'owner' });
const turn = async (script: MockScript, text: string) => assistantTurn(deps(script), await tenant(), { mode: 'cowork', ...who(), text });
const confirm = async (script: MockScript, token: string) => assistantConfirm(deps(script), await tenant(), { ws: h.ws, userId: h.user, authz: authzForRole('owner', h.user), token, decision: 'confirm' });
type Card = { action_id: string; confirm_token: string };
const cardOf = (events: unknown[], actionId: string) => events.find((e) => (e as { type: string; action_id?: string }).type === 'confirm' && (e as Card).action_id === actionId) as Card | undefined;
const contactStep = (name: string) => ({ kind: 'action', title: `Tạo khách ${name}`, instructions: 'Tạo khách hàng mới', action_or_agent_id: 'contact.create' });

/** Model: chưa có tool → đề xuất kế hoạch; sau khi kế hoạch chốt → `next`; sau lời gọi kế → câu chốt. */
function planThen(steps: unknown[], next: { tool: string; input: unknown } | null): MockScript {
  return ({ lastTool }) => (!lastTool ? { tool: 'plan', input: { steps } } : lastTool.tool === 'plan' && next ? next : { text: 'xong' });
}

describe('kế hoạch → bước hành động ràng biên nhận thật (TIP-023d §2)', () => {
  it('đúng action của bước: xác nhận → claim + attempt + action_log, bước succeeded, plan completed', async () => {
    const script = planThen([contactStep('Plan Một')], { tool: 'call_action', input: { action_id: 'contact.create', input: { full_name: 'Plan Một', phone: '0911223301' } } });
    const r = await turn(script, 'tạo khách theo kế hoạch');
    const c1 = await confirm(script, cardOf(r.events, 'assistant.plan_propose')!.confirm_token);
    const db = await tenant();
    const plan = await db.assistantPlan.findFirstOrThrow({ where: { rootRunId: r.run_id } });
    // Chạy tiếp sau khi chốt kế hoạch → model gọi contact.create → thẻ xác nhận mang binding bước 1 (server ghi trong trạng thái dừng).
    const card = cardOf(c1.events, 'contact.create');
    expect(card).toBeDefined();
    const run = await db.aiRun.findUniqueOrThrow({ where: { id: r.run_id! } });
    expect((run.state as { binding?: unknown }).binding).toMatchObject({ planId: plan.id, generation: 1, epoch: 0 });
    expect(await db.contact.count({ where: { name: 'Plan Một' } })).toBe(0);
    const c2 = await confirm(script, card!.confirm_token);
    expect(c2).toMatchObject({ status: 'done' });
    expect(await db.contact.count({ where: { name: 'Plan Một' } })).toBe(1);
    const claim = await db.assistantPlanPrimaryClaim.findFirstOrThrow({ where: { planId: plan.id } });
    expect(claim).toMatchObject({ actionOrDelegateTarget: 'contact.create', phase: 'succeeded', receiptRef: c2.action_log_id, executionGeneration: 1 });
    expect(await db.assistantPlanAttempt.count({ where: { planId: plan.id, actionLogId: c2.action_log_id } })).toBe(1);
    const after = await db.assistantPlan.findUniqueOrThrow({ where: { id: plan.id }, include: { steps: true } });
    expect(after.phase).toBe('completed');
    expect(after.steps.map((s) => s.state)).toEqual(['succeeded']);
  });

  it('action khác bước hiện hành → PLAN_UNDECLARED, không ghi; ghi ngoài kế hoạch không thành bước ẩn', async () => {
    const script = planThen([contactStep('Plan Hai')], { tool: 'call_action', input: { action_id: 'contact.add_note', input: { contact_id: uuidv7(), text: 'ghi chú' } } });
    const r = await turn(script, 'kế hoạch rồi làm việc khác');
    await confirm(script, cardOf(r.events, 'assistant.plan_propose')!.confirm_token);
    const db = await tenant();
    const step = await db.aiRunStep.findFirstOrThrow({ where: { runId: r.run_id!, actionId: 'call_action' }, orderBy: { idx: 'desc' } });
    expect(step.output).toMatchObject({ kind: 'error', code: 'PLAN_UNDECLARED' });
    const plan = await db.assistantPlan.findFirstOrThrow({ where: { rootRunId: r.run_id }, include: { steps: true } });
    expect(plan.steps.map((s) => s.state)).toEqual(['pending']);
    expect(await db.assistantPlanPrimaryClaim.count({ where: { planId: plan.id } })).toBe(0);
  });

  it('cùng claim gọi lại (khoá khác, cùng digest) → biên nhận cũ, không tạo lần hai; khác digest → 409; epoch đổi → 409', async () => {
    const script = planThen([contactStep('Plan Ba')], null);
    const r = await turn(script, 'chỉ chốt kế hoạch');
    await confirm(script, cardOf(r.events, 'assistant.plan_propose')!.confirm_token);
    const db = await tenant();
    const plan = await db.assistantPlan.findFirstOrThrow({ where: { rootRunId: r.run_id }, include: { steps: true } });
    const executor = h.app.get(ActionExecutor, { strict: false });
    const binding = { planId: plan.id, stepId: plan.steps[0]!.id, generation: 1, epoch: 0 };
    const ctx = (key: string) => ({ workspaceId: h.ws, source: 'ui' as const, actor: { type: 'user' as const, id: h.user }, idempotencyKey: key, authz: authzForRole('owner', h.user), planBinding: binding });
    const input = { full_name: 'Plan Ba', phone: '0911223303' };
    const a = await executor.execute(ctx(uuidv7()), 'contact.create', input);
    const b = await executor.execute(ctx(uuidv7()), 'contact.create', input);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect((b.data as { action_log_id: string }).action_log_id).toBe((a.data as { action_log_id: string }).action_log_id);
    expect(await db.contact.count({ where: { name: 'Plan Ba' } })).toBe(1);
    await expect(executor.execute(ctx(uuidv7()), 'contact.create', { ...input, phone: '0911223304' })).rejects.toMatchObject({ code: 'CONFLICT', fields: { plan_step: 'claim_mismatch' } });
    // Yêu cầu sửa tăng epoch: thế hệ mới của bước không admit được bằng binding epoch cũ.
    await db.assistantPlan.update({ where: { id: plan.id }, data: { planEpoch: 1, phase: 'pause_requested' } });
    await db.assistantPlanStep.update({ where: { planId_id: { planId: plan.id, id: binding.stepId } }, data: { executionGeneration: 2, state: 'pending' } });
    const stale = { ...binding, generation: 2 };
    const ctx2 = { ...ctx(uuidv7()), planBinding: stale };
    await expect(executor.execute(ctx2, 'contact.create', { full_name: 'Plan Bốn', phone: '0911223305' })).rejects.toMatchObject({ code: 'CONFLICT', fields: { plan: 'edit_requested' } });
    expect(await db.contact.count({ where: { name: 'Plan Bốn' } })).toBe(0);
  });
});
