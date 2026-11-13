// TIP-022c pha 2 trên Postgres 16 + Memurai: lệnh NGƯỜI VẬN HÀNH cho quyết định báo giá. Agent làm thay người (delegate của Trợ lý / tác vụ
// Cowork — ctx agent + onBehalfOfUserId) không căn cứ ý định khách → Executor đẩy sang hàng chờ duyệt (không hiệu ứng, kể cả write vốn chạy
// thẳng); dòng duyệt ràng dấu báo giá lúc xin + lý do "quyết định của người vận hành". Người thật duyệt → job ai-resume chạy đúng một lần,
// báo giá đổi sau khi xin duyệt → 409 quote_changed (không tự làm mới đích), từ chối → không hiệu ứng. Lượt kênh (không người ra lệnh) vẫn
// 403. Thẻ xác nhận Trợ lý: cảnh báo operator_decision, xem trước rồi báo giá đổi trước khi xác nhận → 409 preview stale.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ActionExecutor, REDIS, createLogger, resumeApproval, uuidv7, type ActionContext, type ResumeDeps } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { authzForRole } from '@appchat/shared';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let agentId: string;

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  // Báo giá gửi qua email cần tài khoản email đã kết nối (gửi thật đi qua outbox, không chạy ở test này).
  await (await tenant()).channelAccount.create({ data: { id: uuidv7(), type: 'email', name: 'cskh@spa.vn', externalId: `cskh-${uuidv7().slice(-6)}@spa.vn`, status: 'connected', settings: {} } });
  agentId = ok(await act('agent.create_and_publish', { name: 'Sales vận hành', role: 'sales', tools: ['quote.get', 'quote.mark_accepted', 'quote.mark_rejected', 'quote.request_revision'] })).agent_id;
}, 60_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown, headers: Record<string, string> = {}, extra: Record<string, unknown> = {}) => call(h, `/actions/${id}`, { input, ...extra }, { 'idempotency-key': uuidv7(), ...headers }).then(json);
const ok = (r: { status: number; body: any }) => (expect(r.status, JSON.stringify(r.body)).toBe(200), r.body.data.result); // eslint-disable-line @typescript-eslint/no-explicit-any
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const quoteOf = async (id: string) => (await tenant()).quote.findUniqueOrThrow({ where: { id } });

async function sentQuote() {
  const k = ok(await act('contact.create', { full_name: `Khách ${uuidv7().slice(-5)}`, email: `k${uuidv7().slice(-8)}@example.test` }));
  const q = ok(await act('quote.create', { contact_id: k.contact_id, items: [{ name: 'Gói chăm sóc', qty: 1, unit_price: '1000000', tax_rate: 0 }] }));
  ok(await act('quote.send', { quote_id: q.quote_id, channel: 'email' }));
  return q.quote_id as string;
}

/** Ngữ cảnh lời gọi của agent được Trợ lý giao việc (runDelegate → agentToolSpecs): agent ∩ người ra lệnh, có run delegate thật. */
async function delegateCtx(): Promise<ActionContext> {
  const runId = uuidv7();
  await (await tenant()).aiRun.create({ data: { id: runId, kind: 'delegate', tier: 'standard', input: { task: 'Chốt báo giá giúp tôi' }, rootRunId: runId, initiatedByUserId: h.user, agentId, status: 'running', startedAt: h.clock.now() } });
  return { workspaceId: h.ws, source: 'agent', actor: { type: 'agent', id: agentId }, onBehalfOfUserId: h.user, runId, stepId: '1', idempotencyKey: uuidv7(), authz: authzForRole('owner', h.user) as never };
}

const resumeDeps = (): ResumeDeps => ({ tenants: resolver, executor: h.app.get(ActionExecutor, { strict: false }), runner: null, kv: h.app.get(REDIS, { strict: false }), log: createLogger({ level: 'silent' }), now: () => h.clock.now(), commander: async () => authzForRole('owner', h.user) as never });

describe('agent làm thay người → duyệt của người thật (AC3 / AC4)', () => {
  it('xin duyệt (không hiệu ứng, ràng dấu báo giá, lý do người vận hành) → duyệt → chạy đúng một lần', async () => {
    const qid = await sentQuote();
    const exec = h.app.get(ActionExecutor, { strict: false });
    const out = await exec.execute(await delegateCtx(), 'quote.mark_accepted', { quote_id: qid });
    expect(out).toMatchObject({ status: 202, data: { status: 'approval_required' } });
    expect((await quoteOf(qid)).status).toBe('sent');
    const db = await tenant();
    const ap = await db.approvalRequest.findUniqueOrThrow({ where: { id: (out.data as { approval_id: string }).approval_id } });
    expect(ap).toMatchObject({ actionId: 'quote.mark_accepted', source: 'agent', onBehalfOfUserId: h.user, agentId, reason: expect.stringContaining('người vận hành') });
    expect((ap.preview as { warnings?: string[] }).warnings).toContain('operator_decision');
    expect((ap.preview as { bound?: Record<string, string> }).bound?.quote_fingerprint).toMatch(/^[0-9a-f]{32}$/);
    // Không có căn cứ khách nào được tạo — đây là lệnh người vận hành, không phải ý định khách.
    expect(await db.aiSalesIntent.count({ where: { quoteId: qid } })).toBe(0);

    ok(await act('approval.approve', { approval_id: ap.id }));
    expect(await resumeApproval(resumeDeps(), h.ws, ap.id, 'decided')).toBe('done');
    expect((await quoteOf(qid)).status).toBe('accepted');
    const done = await db.approvalRequest.findUniqueOrThrow({ where: { id: ap.id } });
    expect(done.executedAt).not.toBeNull();
    expect(done.result).toMatchObject({ kind: 'ok', output: { quote_id: qid, status: 'accepted' } });
    // Chạy lại job (restart) → dùng kết quả đã lưu, không hiệu ứng thứ hai.
    expect(await resumeApproval(resumeDeps(), h.ws, ap.id, 'decided')).toBe('done');
    expect(await db.actionLog.count({ where: { actionId: 'quote.mark_accepted', status: 'succeeded', input: { path: ['quote_id'], equals: qid } } })).toBe(1);
  });

  it('báo giá bị sửa sau khi xin duyệt → chạy sau duyệt 409 quote_changed, báo giá giữ nguyên', async () => {
    const qid = await sentQuote();
    const out = await h.app.get(ActionExecutor, { strict: false }).execute(await delegateCtx(), 'quote.request_revision', { quote_id: qid, reason: 'Khách xin giảm' });
    const apId = (out.data as { approval_id: string }).approval_id;
    const db = await tenant();
    const q = await quoteOf(qid);
    await db.quote.update({ where: { id: qid }, data: { note: 'sửa tay', updatedAt: new Date(q.updatedAt.getTime() + 5000) } });
    ok(await act('approval.approve', { approval_id: apId }));
    expect(await resumeApproval(resumeDeps(), h.ws, apId, 'decided')).toBe('done');
    const ap = await db.approvalRequest.findUniqueOrThrow({ where: { id: apId } });
    // Lý do `quote_changed` (fields) đã kiểm ở unit sales-command-provenance — kết quả tool chỉ mang mã.
    expect(ap.result).toMatchObject({ kind: 'error', code: 'CONFLICT' });
    expect((await quoteOf(qid)).status).toBe('sent');
    expect(await db.quote.count({ where: { code: q.code } })).toBe(1);
  });

  it('người duyệt từ chối → không hiệu ứng; nguồn cũ không tái dùng được để vượt từ chối', async () => {
    const qid = await sentQuote();
    const exec = h.app.get(ActionExecutor, { strict: false });
    const out = await exec.execute(await delegateCtx(), 'quote.mark_rejected', { quote_id: qid });
    const apId = (out.data as { approval_id: string }).approval_id;
    ok(await act('approval.reject', { approval_id: apId, note: 'Khách chưa nói vậy' }));
    expect(await resumeApproval(resumeDeps(), h.ws, apId, 'decided')).toBe('done');
    expect((await quoteOf(qid)).status).toBe('sent');
    // Gắn duyệt đã từ chối vào lời gọi mới → 403 operator_unconfirmed.
    await expect(exec.execute({ ...(await delegateCtx()), approvalId: apId }, 'quote.mark_rejected', { quote_id: qid })).rejects.toMatchObject({ code: expect.stringMatching(/FORBIDDEN|INVALID_STATE/) });
    expect((await quoteOf(qid)).status).toBe('sent');
  });

  it('lượt kênh (agent, không người ra lệnh) không vào hàng duyệt — 403 customer_intent', async () => {
    const qid = await sentQuote();
    const ctx = { ...(await delegateCtx()), onBehalfOfUserId: undefined, authz: authzForRole('owner', h.user) as never };
    await expect(h.app.get(ActionExecutor, { strict: false }).execute(ctx, 'quote.mark_accepted', { quote_id: qid })).rejects.toMatchObject({ code: 'FORBIDDEN', fields: { customer_intent: 'missing' } });
    expect(await (await tenant()).approvalRequest.count({ where: { input: { path: ['quote_id'], equals: qid } } })).toBe(0);
  });
});

describe('thẻ xác nhận Trợ lý (người dùng tự quyết)', () => {
  it('cảnh báo operator_decision; báo giá đổi giữa xem trước và xác nhận → 409 preview stale, không hiệu ứng', async () => {
    const qid = await sentQuote();
    const src = { 'x-action-source': 'assistant' };
    const pv = await act('quote.mark_accepted', { quote_id: qid }, src);
    expect(pv.status).toBe(202);
    expect(pv.body.data.preview.warnings).toEqual(['operator_decision']);
    const q = await quoteOf(qid);
    await (await tenant()).quote.update({ where: { id: qid }, data: { note: 'sửa tay', updatedAt: new Date(q.updatedAt.getTime() + 5000) } });
    const done = await act('quote.mark_accepted', { quote_id: qid }, src, { confirm_token: pv.body.data.confirm_token });
    expect(done.status).toBe(409);
    expect(done.body.error.fields).toMatchObject({ preview: 'stale', quote_fingerprint: 'changed' });
    expect((await quoteOf(qid)).status).toBe('sent');
  });
});
