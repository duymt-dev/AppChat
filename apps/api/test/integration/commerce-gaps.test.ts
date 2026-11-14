// TIP-032b P1 AC1 + review độc lập trên Postgres 16 + Memurai: ngưỡng duyệt cấu hình được (COMMERCE §3 Q5) — Owner đổi ngưỡng 30M thì báo
// giá 25M không cần duyệt; Quản lý (có settings.manage) không đổi được; version cũ → STALE_VERSION. Trần giảm giá agent (AI Governance 5%):
// báo giá agent giảm 6% → duyệt, Owner tự giảm 6% trên UI không bị trần agent chặn. Một báo giá → một HĐ HOẶC một đơn (QUOTE_ALREADY_CONVERTED
// cả hai chiều, gọi lại trả chứng từ cũ, hai yêu cầu đồng thời → một thắng); đơn từ HĐ đã ký vẫn tạo được. FORCE_APPROVAL: agent trực kênh /
// tác vụ không hỏi trước vẫn phải duyệt khi gửi hợp đồng ký.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { authzForRole, salesPolicySchema } from '@appchat/shared';
import { ActionExecutor, uuidv7, type ActionContext } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let lan: string;
let manager: { id: string; token: string };

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u: { token: string }) => ({ authorization: `Bearer ${u.token}` });
const act = (id: string, input: unknown, who?: { token: string }, key = uuidv7()) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': key, ...(who ? as(who) : {}) }).then(json);
const get = (path: string, who?: { token: string }) => call(h, path, undefined, who ? as(who) : {}).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const ok = (r: { status: number; body: unknown }) => {
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return (r.body as { data: { result: Record<string, any> } }).data.result; // eslint-disable-line @typescript-eslint/no-explicit-any
};
const line = (price: string, pct?: number) => ({ name: 'Gói chăm sóc', qty: 1, unit_price: price, tax_rate: 0, ...(pct === undefined ? {} : { discount: { kind: 'pct', value: pct } }) });
const quote = async (price: string, pct?: number) => ok(await act('quote.create', { contact_id: lan, items: [line(price, pct)] })).quote_id as string;
const reasons = async (id: string) => (await get(`/quotes/${id}`)).body.data.approval_reasons as string[];
const policy = async () => salesPolicySchema.parse((await get('/settings/sales-policy')).body.data);

/** Báo giá đã chốt (accepted) — gửi qua email (khách có email), rồi đánh dấu khách đồng ý. */
async function accepted(price = '1000000') {
  const id = await quote(price);
  ok(await act('quote.send', { quote_id: id, channel: 'email' }));
  ok(await act('quote.mark_accepted', { quote_id: id }));
  return id;
}

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  lan = ok(await act('contact.create', { full_name: 'Chị Lan CG', phone: '0909400001', email: 'lan.cg@example.com' })).contact_id;
  manager = await h.member('manager');
  // Tài khoản email đã kết nối — quote.send qua email mở chuỗi thư mới cho khách có email.
  await (await tenant()).channelAccount.create({ data: { id: uuidv7(), type: 'email', name: 'cskh@spa.vn', externalId: 'cskh@spa.vn', status: 'connected', settings: {} } });
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('ngưỡng duyệt cấu hình được', () => {
  it('mặc định 20M / 5% (seed migration); báo giá 25M cần duyệt', async () => {
    expect(await policy()).toMatchObject({ approval_total_vnd: '20000000', approval_discount_pct: 5, agent_max_discount_pct: 5, version: 1, can_edit: true });
    expect(await reasons(await quote('25000000'))).toEqual(['total']);
  });

  it('Quản lý (settings.manage) không đổi được — chỉ Chủ sở hữu; version cũ → STALE_VERSION', async () => {
    expect((await get('/settings/sales-policy', manager)).body.data.can_edit).toBe(false);
    expect((await act('sales_settings.update', { if_version: 1, approval_total_vnd: '30000000' }, manager)).status).toBe(403);
    const stale = await act('sales_settings.update', { if_version: 0, approval_total_vnd: '30000000' });
    expect(stale.status).toBe(409);
    expect(stale.body.error).toMatchObject({ code: 'STALE_VERSION', fields: { version: '1' } });
  });

  it('Owner đổi ngưỡng 30M → báo giá 25M không cần duyệt, gửi được ngay; event + action_log ghi trước / sau', async () => {
    const r = ok(await act('sales_settings.update', { if_version: 1, approval_total_vnd: '30000000' }));
    expect(r).toEqual({ version: 2, approval_total_vnd: '30000000', approval_discount_pct: 5 });
    const id = await quote('25000000');
    expect(await reasons(id)).toEqual([]);
    ok(await act('quote.send', { quote_id: id, channel: 'email' }));
    const db = await tenant();
    expect(await db.outboxEvent.findFirst({ where: { topic: 'sales_settings.updated' } })).toBeTruthy();
    const log = await db.actionLog.findFirstOrThrow({ where: { actionId: 'sales_settings.update' }, orderBy: { createdAt: 'desc' } });
    expect(log.before).toMatchObject({ approval_total_vnd: '20000000' });
  });

  it('Owner giảm 6% trên UI: ngưỡng workspace 5% → duyệt; nâng workspace lên 10% → gửi được (trần agent không chặn Owner)', async () => {
    const id = await quote('1000000', 6);
    expect(await reasons(id)).toEqual(['discount']);
    ok(await act('sales_settings.update', { if_version: 2, approval_discount_pct: 10 }));
    expect(await reasons(id)).toEqual([]);
  });

  it('báo giá do agent tạo giảm 6% → vẫn duyệt (trần AI Governance 5%) dù workspace cho 10%', async () => {
    const id = await quote('1000000', 6);
    await (await tenant()).quote.update({ where: { id }, data: { createdByType: 'agent' } });
    expect(await reasons(id)).toEqual(['discount']);
    expect((await act('quote.send', { quote_id: id, channel: 'email' })).body.error).toMatchObject({ code: 'QUOTE_NEEDS_APPROVAL', fields: { discount: 'over_threshold' } });
  });
});

describe('một báo giá → một HĐ hoặc một đơn', () => {
  it('báo giá đã sinh HĐ → tạo đơn trả QUOTE_ALREADY_CONVERTED kèm mã HĐ; gọi lại HĐ trả HĐ cũ', async () => {
    const q = await accepted();
    const c = ok(await act('contract.create_from_quote', { quote_id: q }));
    expect(ok(await act('contract.create_from_quote', { quote_id: q })).contract_id).toBe(c.contract_id);
    const r = await act('order.create_from_quote', { quote_id: q });
    expect(r.status).toBe(409);
    expect(r.body.error).toMatchObject({ code: 'QUOTE_ALREADY_CONVERTED', fields: { quote_id: 'has_contract', code: c.code } });
  });

  it('ngược lại: đã sinh đơn → tạo HĐ bị chặn; đơn từ HĐ đã ký vẫn tạo được (COMMERCE §4)', async () => {
    const q = await accepted();
    const o = ok(await act('order.create_from_quote', { quote_id: q }));
    expect((await act('contract.create_from_quote', { quote_id: q })).body.error).toMatchObject({ code: 'QUOTE_ALREADY_CONVERTED', fields: { quote_id: 'has_order', code: o.code } });
    const q2 = await accepted();
    const c = ok(await act('contract.create_from_quote', { quote_id: q2 }));
    // Ký thật đã phủ ở contracts.test.ts — gắn bản ký giả để thoả CHECK contract_signed_chk.
    const db = await tenant();
    const file = uuidv7();
    await db.file.create({ data: { id: file, storageKey: `t/${file}.pdf`, name: 'hd.pdf', mime: 'application/pdf', size: 1n, purpose: 'contract', confirmed: true } });
    await db.contract.update({ where: { id: c.contract_id }, data: { status: 'signed', signedFileId: file, signedSha256: 'a'.repeat(64) } });
    expect(ok(await act('order.create_from_contract', { contract_id: c.contract_id })).order_id).toBeTruthy();
  });

  it('HĐ và đơn đồng thời trên cùng báo giá → đúng một thắng, một QUOTE_ALREADY_CONVERTED; không hai chứng từ', async () => {
    const q = await accepted();
    const [a, b] = await Promise.all([act('contract.create_from_quote', { quote_id: q }), act('order.create_from_quote', { quote_id: q })]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    expect([a, b].find((x) => x.status === 409)!.body.error.code).toBe('QUOTE_ALREADY_CONVERTED');
    const db = await tenant();
    const n = (await db.contract.count({ where: { quoteId: q, deletedAt: null } })) + (await db.order.count({ where: { quoteId: q } }));
    expect(n).toBe(1);
  });

  it('CSKH không có quyền tạo hợp đồng → 403 trước khi lộ mã chứng từ đã sinh', async () => {
    const q = await accepted();
    ok(await act('order.create_from_quote', { quote_id: q }));
    const cs = await h.member('cs');
    expect((await act('contract.create_from_quote', { quote_id: q }, cs)).status).toBe(403);
  });
});

describe('FORCE_APPROVAL ở executor', () => {
  it('agent trực kênh gửi hợp đồng ký vào chính hội thoại đang phục vụ → approval_required, không gửi', async () => {
    const exec = h.app.get(ActionExecutor, { strict: false });
    const conv = uuidv7();
    const ctx: ActionContext = { workspaceId: h.ws, source: 'agent', actor: { type: 'agent', id: uuidv7() }, onBehalfOfUserId: h.user, servedConversationId: conv, authz: authzForRole('owner', h.user) as never, idempotencyKey: uuidv7() };
    const r = await exec.execute(ctx, 'contract.send_for_signature', { contract_id: uuidv7(), channel: 'zalo_personal', conversation_id: conv });
    expect(r.status).toBe(202);
    expect((r.data as { status: string }).status).toBe('approval_required');
  });
});
