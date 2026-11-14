// TIP-023d pha 5 (§3, AC3-AC5) trên Postgres 16 + Memurai: sửa kế hoạch giữa lượt.
//   - plan_request_edit (người, qua Executor + Idempotency-Key): epoch + 1, gọi lại → cùng epoch; model không thấy lệnh này (catalog);
//   - lượt đang chạy gặp cổng → dừng ở checkpoint `waiting_operation` (plan_edit), kết quả đã có giữ nguyên, lời gọi cũ superseded;
//     plan → paused khi đã xả;
//   - plan_update: sửa / bỏ bước chưa bắt đầu (revision + 1, thế hệ thực thi + 1); bước đã chạy → 409; revision cũ → 409;
//   - plan_resume: chạy tiếp CÙNG run từ checkpoint (bộ đếm bước giữ), không phát lại hiệu ứng cũ;
//   - §2.5: lượt xong mà kế hoạch còn bước → run gốc chờ `plan_next` (không completed), DTO `awaiting_continue`; resume chạy bước kế đúng
//     một lần, hết bước → completed.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AiSdkEngine, mockLanguageModel, staticModelSource, type MockScript } from '@appchat/ai';
import { ActionExecutor, AiRunner, CreditMeter, DbPriceBook, REDIS, WalletService, assistantConfirm, assistantTurn, continuePlanTurn, createLogger, uuidv7, type AssistantDeps, type TurnRequest } from '@appchat/core';
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
const owner = () => authzForRole('owner', h.user);
const who = (): Pick<TurnRequest, 'ws' | 'userId' | 'authz' | 'userName' | 'locale' | 'role'> => ({ ws: h.ws, userId: h.user, authz: owner(), userName: 'Owner', locale: 'vi', role: 'owner' });
const turn = async (script: MockScript, text: string) => assistantTurn(deps(script), await tenant(), { mode: 'cowork', ...who(), text });
const confirm = async (script: MockScript, token: string) => assistantConfirm(deps(script), await tenant(), { ws: h.ws, userId: h.user, authz: owner(), token, decision: 'confirm' });
type Card = { type: string; action_id?: string; confirm_token: string };
const cardOf = (events: unknown[], actionId: string) => (events as Card[]).find((e) => e.type === 'confirm' && e.action_id === actionId);
const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as { data?: { result?: Record<string, unknown> }; error?: { code: string; fields?: Record<string, string> } } });
const act = (id: string, input: unknown, key = uuidv7()) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': key }).then(json);
const step = (title: string, extra: Record<string, unknown> = {}) => ({ kind: 'analysis', title, instructions: title, ...extra });

describe('sửa kế hoạch giữa lượt (TIP-023d §3)', () => {
  it('request_edit → checkpoint, paused; update bước chưa chạy; resume cùng run, không phát lại hiệu ứng cũ', async () => {
    // Lượt: đề xuất kế hoạch → (chốt) → bước đầu tạo khách (thẻ chờ xác nhận) → người bấm "Sửa" → chạy tiếp gặp cổng → checkpoint.
    const script: MockScript = ({ lastTool, lastUser }) => {
      if (lastUser.startsWith('Người dùng đã sửa kế hoạch')) return { text: 'Làm tiếp theo kế hoạch mới.' };
      if (!lastTool) return { tool: 'plan', input: { steps: [{ kind: 'action', title: 'Tạo khách Sửa Một', instructions: 'tạo', action_or_agent_id: 'contact.create' }, step('Soạn tin chào'), step('Gửi báo cáo')] } };
      if (lastTool.tool === 'plan') return { tool: 'call_action', input: { action_id: 'contact.create', input: { full_name: 'Sửa Một', phone: '0911224401' } } };
      return { text: 'không được gọi khi kế hoạch đang dừng' };
    };
    const r = await turn(script, 'kế hoạch 3 bước');
    const c1 = await confirm(script, cardOf(r.events, 'assistant.plan_propose')!.confirm_token);
    const db = await tenant();
    const plan = await db.assistantPlan.findFirstOrThrow({ where: { rootRunId: r.run_id } });
    // Người bấm "Sửa kế hoạch" trước khi xác nhận bước tạo khách → cổng dừng ngay lời gọi kế của lượt.
    const req = await act('assistant.plan_request_edit', { plan_id: plan.id, if_revision: 1 });
    expect(req.status, JSON.stringify(req.body)).toBe(200);
    expect(req.body.data!.result).toMatchObject({ plan_epoch: 1 });
    const again = await act('assistant.plan_request_edit', { plan_id: plan.id, if_revision: 1 });
    expect(again.body.data!.result).toMatchObject({ plan_epoch: 1 });
    // Xác nhận thẻ tạo khách cũ (gắn epoch 0) → không admit (plan không active) — hiệu ứng cũ không chạy.
    const card = cardOf(c1.events, 'contact.create')!;
    const c2 = await confirm(script, card.confirm_token);
    expect(c2.status).not.toBe('done');
    expect(await db.contact.count({ where: { name: 'Sửa Một' } })).toBe(0);
    // Lượt chạy tiếp sau thẻ → gặp cổng trước lời gọi model → checkpoint `waiting_operation` (plan_edit) → plan paused.
    const run = await db.aiRun.findUniqueOrThrow({ where: { id: r.run_id! } });
    expect(run.status).toBe('waiting_operation');
    expect((run.state as { wait_reason: string }).wait_reason).toBe('plan_edit');
    const paused = await db.assistantPlan.findUniqueOrThrow({ where: { id: plan.id } });
    expect(paused.phase).toBe('paused');
    expect(await db.assistantPlanCheckpoint.count({ where: { rootRunId: r.run_id!, planEpoch: 1 } })).toBe(1);

    // Sửa: bỏ bước 3, đổi tiêu đề bước 2 (bước 1 chưa claim → còn sửa được nhưng giữ nguyên).
    const steps = await db.assistantPlanStep.findMany({ where: { planId: plan.id }, orderBy: { position: 'asc' } });
    const stale = await act('assistant.plan_update', { plan_id: plan.id, if_revision: 9, ops: [{ op: 'remove', step_id: steps[2]!.id }] });
    expect(stale.status).toBe(409);
    const up = await act('assistant.plan_update', { plan_id: plan.id, if_revision: 1, ops: [{ op: 'remove', step_id: steps[2]!.id }, { op: 'update', step_id: steps[1]!.id, patch: { title: 'Soạn tin chào (ngắn)' } }] });
    expect(up.status, JSON.stringify(up.body)).toBe(200);
    expect(up.body.data!.result).toMatchObject({ revision: 2, phase: 'editing' });
    const after = await db.assistantPlanStep.findMany({ where: { planId: plan.id }, orderBy: { position: 'asc' } });
    expect(after.map((s) => s.title)).toEqual(['Tạo khách Sửa Một', 'Soạn tin chào (ngắn)']);
    expect(after[1]!.executionGeneration).toBe(2);

    // Tiếp tục: plan active; chạy tiếp CÙNG run từ checkpoint (consumer ROLE=ai — gọi trực tiếp ở test), nối tin kế hoạch mới.
    const res = await act('assistant.plan_resume', { plan_id: plan.id, if_revision: 2 });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const d = deps(script);
    const cp = ((await db.aiRun.findUniqueOrThrow({ where: { id: r.run_id! } })).state as { plan_checkpoint: { stepIdx: number } }).plan_checkpoint;
    const at = { epoch: 1, step: cp.stepIdx };
    expect(await continuePlanTurn({ ...d }, db, h.ws, r.run_id!, owner(), at)).toBe('done');
    // Job lặp cho đúng checkpoint đã resume → không gọi model lần hai (run đã chạy tiếp, giờ chờ ở checkpoint khác).
    expect(await continuePlanTurn({ ...d }, db, h.ws, r.run_id!, owner(), at)).toBe('skipped');
    // §2.5: model trả lời xong nhưng kế hoạch còn 2 bước chưa chạy → run gốc KHÔNG `completed`; chờ `plan_next` (nút chạy bước kế).
    const held = await db.aiRun.findUniqueOrThrow({ where: { id: r.run_id! } });
    expect(held.status).toBe('waiting_operation');
    expect((held.state as { wait_reason: string }).wait_reason).toBe('plan_next');
    expect(await db.contact.count({ where: { name: 'Sửa Một' } })).toBe(0);
    const resumed = await db.assistantPlan.findUniqueOrThrow({ where: { id: plan.id } });
    expect(resumed).toMatchObject({ phase: 'active', revision: 2, planEpoch: 1 });
  });

  it('bước đã chạy không sửa được (409); sai chủ → 404; model không thấy lệnh điều khiển kế hoạch', async () => {
    const script: MockScript = ({ lastTool }) => (!lastTool ? { tool: 'plan', input: { steps: [{ kind: 'action', title: 'Tạo khách Khoá', instructions: 'tạo', action_or_agent_id: 'contact.create' }, step('Bước sau')] } } : lastTool.tool === 'plan' ? { tool: 'call_action', input: { action_id: 'contact.create', input: { full_name: 'Khoá Một', phone: '0911224402' } } } : { text: 'xong' });
    const r = await turn(script, 'kế hoạch có bước đã chạy');
    const c1 = await confirm(script, cardOf(r.events, 'assistant.plan_propose')!.confirm_token);
    await confirm(script, cardOf(c1.events, 'contact.create')!.confirm_token);
    const db = await tenant();
    const plan = await db.assistantPlan.findFirstOrThrow({ where: { rootRunId: r.run_id }, include: { steps: { orderBy: { position: 'asc' } } } });
    expect(plan.steps[0]!.state).toBe('succeeded');
    const req = await act('assistant.plan_request_edit', { plan_id: plan.id, if_revision: 1 });
    expect(req.status, JSON.stringify(req.body)).toBe(200);
    const locked = await act('assistant.plan_update', { plan_id: plan.id, if_revision: 1, ops: [{ op: 'update', step_id: plan.steps[0]!.id, patch: { title: 'đổi' } }] });
    expect(locked.status).toBe(409);
    expect(locked.body.error).toMatchObject({ code: 'CONFLICT', fields: { step_id: 'already_started' } });
    const sales = await h.member('sales');
    const other = await call(h, '/actions/assistant.plan_resume', { input: { plan_id: plan.id, if_revision: 1 } }, { 'idempotency-key': uuidv7(), authorization: `Bearer ${sales.token}` }).then(json);
    expect([403, 404]).toContain(other.status);
  });

  it('§2.5: lượt xong khi còn bước → chờ plan_next (không completed); Làm bước kế tiếp → chạy đúng một lần, hết bước → completed', async () => {
    let next = 0;
    const script: MockScript = ({ lastTool, lastUser }) => {
      if (lastUser.startsWith('Người dùng đã sửa kế hoạch')) return next++ === 0 ? { tool: 'call_action', input: { action_id: 'contact.create', input: { full_name: 'Bước Kế Hai', phone: '0911224403' } } } : { text: 'Đã làm bước 2.' };
      if (!lastTool) return { tool: 'plan', input: { steps: [{ kind: 'action', title: 'Tạo khách Bước Kế', instructions: 'tạo', action_or_agent_id: 'contact.create' }, { kind: 'action', title: 'Tạo khách Bước Kế Hai', instructions: 'tạo', action_or_agent_id: 'contact.create' }] } };
      if (lastTool.tool === 'plan') return { tool: 'call_action', input: { action_id: 'contact.create', input: { full_name: 'Bước Kế Một', phone: '0911224404' } } };
      return { text: 'Xong bước 1, còn bước 2.' };
    };
    const r = await turn(script, 'kế hoạch hai bước');
    const c1 = await confirm(script, cardOf(r.events, 'assistant.plan_propose')!.confirm_token);
    await confirm(script, cardOf(c1.events, 'contact.create')!.confirm_token);
    const db = await tenant();
    const held = await db.aiRun.findUniqueOrThrow({ where: { id: r.run_id! } });
    expect(held.status).toBe('waiting_operation');
    expect((held.state as { wait_reason: string }).wait_reason).toBe('plan_next');
    const plan = await db.assistantPlan.findFirstOrThrow({ where: { rootRunId: r.run_id } });
    const got = await act('assistant.plan_get', { plan_id: plan.id });
    expect(got.body.data!.result).toMatchObject({ phase: 'active', awaiting_continue: true, progress: 0.5 });

    const res = await act('assistant.plan_resume', { plan_id: plan.id, if_revision: 1 });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const cp = (held.state as { plan_checkpoint: { stepIdx: number } }).plan_checkpoint;
    const d = deps(script);
    const at = { epoch: 0, step: cp.stepIdx };
    expect(await continuePlanTurn({ ...d }, db, h.ws, r.run_id!, owner(), at)).toBe('done');
    expect(await continuePlanTurn({ ...d }, db, h.ws, r.run_id!, owner(), at)).toBe('skipped');
    // Bước 2 là hiệu ứng ghi → thẻ xác nhận (ràng bước 2); xác nhận → hết bước → plan completed, run completed.
    const waiting = await db.aiRun.findUniqueOrThrow({ where: { id: r.run_id! } });
    expect(waiting.status).toBe('waiting_approval');
    // Thẻ của lượt chạy tiếp lưu ở tin cuối của phiên (cùng sự kiện SSE đã phát).
    const last = await db.assistantMessage.findFirstOrThrow({ where: { sessionId: r.session_id }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
    const parts = (last.content as { parts?: { type: string; card?: Card }[] }).parts ?? [];
    const card = parts.find((x) => x.type === 'card' && x.card?.action_id === 'contact.create')?.card;
    expect(card?.confirm_token).toBeTruthy();
    await confirm(script, card!.confirm_token);
    const end = await db.assistantPlan.findUniqueOrThrow({ where: { id: plan.id } });
    expect(end.phase).toBe('completed');
    expect((await db.aiRun.findUniqueOrThrow({ where: { id: r.run_id! } })).status).toBe('completed');
    expect(await db.contact.count({ where: { name: { in: ['Bước Kế Một', 'Bước Kế Hai'] } } })).toBe(2);
  });
});
