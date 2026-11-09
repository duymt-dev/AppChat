// TIP-032c §4.2 (AC3 nhánh Trợ lý) trên Postgres 16 + Memurai: thẻ xác nhận chốt ĐÚNG `if_version` lúc xem trước — model không gửi
// phiên bản → input chuẩn hoá của run mang phiên bản hiện tại; một ghi khác chen giữa xem trước và xác nhận → lần chạy 409 STALE_VERSION
// (ghi chú của Trợ lý không lọt, ghi của người khác giữ, không lấy bản mới rồi chạy lại mù); không có ghi chen → chạy được, version tăng.
// Đổi người tạo qua Trợ lý → 422 immutable, người tạo giữ.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AiSdkEngine, mockLanguageModel, staticModelSource, type MockScript } from '@appchat/ai';
import { ActionExecutor, AiRunner, CreditMeter, DbPriceBook, REDIS, WalletService, assistantConfirm, assistantTurn, createLogger, uuidv7, type AssistantDeps } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { authzForRole } from '@appchat/shared';
import { call, env, startApi, type Harness } from './setup';

const PROVIDER = `t-${uuidv7().slice(-12)}`;
const MODEL = 'mock-chat';
const log = createLogger({ level: 'silent' });

let h: Harness;
let resolver: TenantDbResolver;
let sales: { id: string; token: string };
let lan = '';

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 'commerce-edit-assistant'));
const ownerReq = () => ({ ws: h.ws, userId: h.user, authz: authzForRole('owner', h.user), userName: 'Owner', locale: 'vi', role: 'owner' });
const callAction = (action_id: string, input: unknown) => ({ tool: 'call_action', input: { action_id, input } });

function deps(script: MockScript): AssistantDeps {
  const engine = new AiSdkEngine(staticModelSource([{ provider: PROVIDER, model: MODEL, handle: mockLanguageModel(script, { provider: PROVIDER, model: MODEL }) }]));
  const runner = new AiRunner({ engine, meter: new CreditMeter(h.app.get(WalletService, { strict: false }), new DbPriceBook(h.platform)), log });
  return { executor: h.app.get(ActionExecutor, { strict: false }), runner, kv: h.app.get(REDIS, { strict: false }), now: () => h.clock.now(), planKey: async () => 'business' };
}

async function newOrder() {
  const r = await act('order.create', { contact_id: lan, items: [{ name: 'Serum', qty: 1, unit_price: '500000', tax_rate: 0 }] });
  return r.body.data.result.order_id as string;
}

beforeAll(async () => {
  h = await startApi();
  sales = await h.member('sales');
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  await h.platform.modelPrice.create({ data: { providerKey: PROVIDER, model: MODEL, tier: 'standard', creditsPer1kIn: 1, creditsPer1kOut: 3 } });
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
  const plan = await h.platform.plan.create({ data: { id: uuidv7(), key: `t-ce-${uuidv7().slice(-8)}`, segment: 'business', name: 'Test', maxAgents: null, maxChannels: null, active: false } });
  await h.platform.subscription.create({ data: { id: uuidv7(), workspaceId: h.ws, planId: plan.id, status: 'active', currentPeriodStart: h.clock.now() } });
  lan = (await act('contact.create', { full_name: 'Chị Lan Sửa Đơn', phone: '0909432001' })).body.data.result.contact_id;
}, 120_000);
afterAll(async () => {
  await h?.platform.modelPrice.deleteMany({ where: { providerKey: PROVIDER } });
  await resolver?.close();
  await h?.close();
});

describe('Trợ lý sửa đơn — phiên bản chốt lúc xem trước (TIP-032c)', () => {
  it('model không gửi if_version → canonical mang phiên bản hiện tại; ghi chen giữa → 409, ghi chú không lọt, ghi nền giữ', async () => {
    const id = await newOrder();
    const db = await tenant();
    const v0 = (await db.order.findUniqueOrThrow({ where: { id } })).version;
    const d = deps(({ lastTool }) => (lastTool ? { text: 'xong' } : callAction('order.update', { order_id: id, patch: { note: 'Khách hẹn thứ bảy' } })));
    const r = await assistantTurn(d, db, { mode: 'cowork', ...ownerReq(), text: 'thêm ghi chú' });
    const card = r.events.find((e) => e.type === 'confirm') as { confirm_token: string };
    const run = await db.aiRun.findUniqueOrThrow({ where: { id: r.run_id! } });
    expect((run.state as { canonicalInput: unknown }).canonicalInput).toMatchObject({ order_id: id, if_version: v0 });

    expect((await act('order.update_shipping', { order_id: id, shipping: { carrier: 'Viettel Post' } })).status).toBe(200);
    const c = await assistantConfirm(d, db, { ...ownerReq(), token: card.confirm_token, decision: 'confirm' });
    expect(c.status).not.toBe('done');
    const step = await db.aiRunStep.findFirstOrThrow({ where: { runId: r.run_id!, type: 'tool' }, orderBy: { idx: 'desc' } });
    expect(step.output).toMatchObject({ kind: 'error', code: 'STALE_VERSION' });
    const row = await db.order.findUniqueOrThrow({ where: { id } });
    expect(row.note).toBe('');
    expect(row.shipping).toMatchObject({ carrier: 'Viettel Post' });
    expect(row.version).toBe(v0 + 1);
  });

  it('không có ghi chen → chạy được, version tăng; model gửi if_version cũ → xem trước 409 ngay (không có thẻ)', async () => {
    const id = await newOrder();
    const db = await tenant();
    const v0 = (await db.order.findUniqueOrThrow({ where: { id } })).version;
    const d = deps(({ lastTool }) => (lastTool ? { text: 'xong' } : callAction('order.update', { order_id: id, patch: { assigned_user_id: sales.id } })));
    const r = await assistantTurn(d, db, { mode: 'cowork', ...ownerReq(), text: 'giao đơn' });
    const card = r.events.find((e) => e.type === 'confirm') as { confirm_token: string };
    expect((await assistantConfirm(d, db, { ...ownerReq(), token: card.confirm_token, decision: 'confirm' })).status).toBe('done');
    expect(await db.order.findUniqueOrThrow({ where: { id } })).toMatchObject({ assignedUserId: sales.id, ownerUserId: h.user, version: v0 + 1 });

    const stale = deps(({ lastTool }) => (lastTool ? { text: 'xong' } : callAction('order.update', { order_id: id, if_version: v0, patch: { note: 'cũ' } })));
    const s = await assistantTurn(stale, db, { mode: 'cowork', ...ownerReq(), text: 'ghi chú' });
    expect(s.events.some((e) => e.type === 'confirm')).toBe(false);
    const step = await db.aiRunStep.findFirstOrThrow({ where: { runId: s.run_id!, type: 'tool' } });
    expect(step.output).toMatchObject({ kind: 'error', code: 'STALE_VERSION' });
  });

  it('đổi người tạo qua Trợ lý → 422 immutable ở xem trước, người tạo giữ', async () => {
    const id = await newOrder();
    const db = await tenant();
    const d = deps(({ lastTool }) => (lastTool ? { text: 'không đổi được' } : callAction('order.update', { order_id: id, patch: { owner_user_id: sales.id } })));
    const r = await assistantTurn(d, db, { mode: 'cowork', ...ownerReq(), text: 'đổi người tạo' });
    expect(r.events.some((e) => e.type === 'confirm')).toBe(false);
    const step = await db.aiRunStep.findFirstOrThrow({ where: { runId: r.run_id!, type: 'tool' } });
    expect(step.output).toMatchObject({ kind: 'error', code: 'VALIDATION_FAILED', message: expect.stringContaining('immutable') });
    expect((await db.order.findUniqueOrThrow({ where: { id } })).ownerUserId).toBe(h.user);
  });
});
