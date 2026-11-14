// TIP-023d pha 6 (§4, AC8) trên Postgres 16 + Memurai: tái dùng kế hoạch.
//   - kế hoạch chạy xong thật → ứng viên chỉ có cấu trúc chung (action id + nhãn registry), KHÔNG tiêu đề / hướng dẫn riêng / tên khách;
//   - plan_reusable xếp hạng theo action trùng; không trùng → rỗng; người khác không thấy;
//   - plan_reuse → bản nháp MỚI (mọi bước pending, nguồn = plan cũ), không chạy gì;
//   - lượt mới kèm plan_draft → gắn root + active một lần; request khác dùng lại bản nháp → 409.
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
type Card = { type: string; action_id?: string; confirm_token: string };
const cardOf = (events: unknown[], id: string) => (events as Card[]).find((e) => e.type === 'confirm' && e.action_id === id)!;
const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as { data?: { result?: Record<string, unknown> }; error?: { code: string; fields?: Record<string, string> } } });
const act = (id: string, input: unknown, headers: Record<string, string> = {}) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...headers }).then(json);

describe('tái dùng kế hoạch (TIP-023d §4)', () => {
  it('xong thật → ứng viên chỉ cấu trúc chung; gợi ý theo action; reuse → bản nháp mới; gửi lượt gắn một lần', async () => {
    const PRIVATE = 'Gọi chị Bích Hồng về liệu trình riêng';
    const script: MockScript = ({ lastTool }) =>
      !lastTool
        ? { tool: 'plan', input: { steps: [{ kind: 'action', title: PRIVATE, instructions: 'SĐT 0911225501, ưu đãi riêng', action_or_agent_id: 'contact.create' }] } }
        : lastTool.tool === 'plan'
          ? { tool: 'call_action', input: { action_id: 'contact.create', input: { full_name: 'Bích Hồng Reuse', phone: '0911225501' } } }
          : { text: 'xong' };
    const r = await assistantTurn(deps(script), await tenant(), { mode: 'cowork', ...who(), text: 'tạo khách theo kế hoạch' });
    const c1 = await assistantConfirm(deps(script), await tenant(), { ws: h.ws, userId: h.user, authz: owner(), token: cardOf(r.events, 'assistant.plan_propose').confirm_token, decision: 'confirm' });
    await assistantConfirm(deps(script), await tenant(), { ws: h.ws, userId: h.user, authz: owner(), token: cardOf(c1.events, 'contact.create').confirm_token, decision: 'confirm' });
    const db = await tenant();
    const plan = await db.assistantPlan.findFirstOrThrow({ where: { rootRunId: r.run_id } });
    expect(plan.phase).toBe('completed');
    const cand = await db.assistantPlanReuseCandidate.findFirstOrThrow({ where: { sourcePlanId: plan.id } });
    expect(cand.genericTitle).toBe('Tạo khách hàng');
    const raw = JSON.stringify(cand);
    for (const leak of [PRIVATE, '0911225501', 'Bích Hồng', 'ưu đãi']) expect(raw).not.toContain(leak);

    // Gợi ý: cùng action → có; action khác hẳn → rỗng; người khác → không thấy.
    const hit = await act('assistant.plan_reusable', { limit: 3, actions: ['contact.create'] });
    expect((hit.body.data!.result!.candidates as { id: string }[]).map((c) => c.id)).toContain(cand.id);
    expect((await act('assistant.plan_reusable', { limit: 3, actions: ['ticket.create'] })).body.data!.result!.candidates).toEqual([]);
    const sales = await h.member('sales');
    const theirs = await act('assistant.plan_reusable', { limit: 3 }, { authorization: `Bearer ${sales.token}` });
    expect(JSON.stringify(theirs.body)).not.toContain(cand.id);

    // Reuse → bản nháp mới, mọi bước pending, không gắn root, không chạy gì; người khác dùng ứng viên → 404.
    const reused = await act('assistant.plan_reuse', { candidate_id: cand.id, session_id: r.session_id });
    expect(reused.status, JSON.stringify(reused.body)).toBe(200);
    const draftId = reused.body.data!.result!.plan_id as string;
    const draft = await db.assistantPlan.findUniqueOrThrow({ where: { id: draftId }, include: { steps: true } });
    expect(draft).toMatchObject({ phase: 'draft', rootRunId: null, sourcePlanId: plan.id, sourceRevision: plan.revision });
    expect(draft.steps.map((s) => [s.state, s.actionOrAgentId, s.title, s.instructions])).toEqual([['pending', 'contact.create', 'Tạo khách hàng', '']]);
    expect((await act('assistant.plan_reuse', { candidate_id: cand.id, session_id: r.session_id }, { authorization: `Bearer ${sales.token}` })).status).toBe(404);

    // Gửi lượt mới kèm bản nháp → gắn root + active; request khác dùng lại → 409.
    const quiet: MockScript = () => ({ text: 'đã nhận kế hoạch' });
    const t2 = await assistantTurn(deps(quiet), await tenant(), { mode: 'cowork', ...who(), text: 'làm lại như lần trước', sessionId: r.session_id, planDraft: { plan_id: draftId, revision: 1 } });
    const bound = await db.assistantPlan.findUniqueOrThrow({ where: { id: draftId } });
    expect(bound).toMatchObject({ rootRunId: t2.run_id, phase: 'active' });
    await expect(assistantTurn(deps(quiet), await tenant(), { mode: 'cowork', ...who(), text: 'lần nữa', sessionId: r.session_id, planDraft: { plan_id: draftId, revision: 1 } })).rejects.toMatchObject({ code: 'CONFLICT' });
  });
});
