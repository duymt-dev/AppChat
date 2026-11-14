// TIP-012b P3 trên Postgres 16 + Memurai (AC3, AC6, AC7, AC8): runtime kết nối — Casso live có API key (transport HTTP giả theo hợp đồng
// fixtures/casso/contracts.json → `read`, KHÔNG gọi provider thật). Kết nối → biên nhận thăm dò bền (chạy sau commit, ghi bằng chứng cho
// đúng phiên bản khoá); sync_now → biên nhận accepted (≠ xong), gộp lượt đang chờ, thiếu khả năng → unsupported; kéo + webhook cùng giao
// dịch → MỘT biên nhận / một khoản thu; đổi khoá giữa chừng → lượt cũ cancelled, không ghi con trỏ; lỗi provider → mã đã làm sạch, không
// last_sync giả; GET /v1/integrations/* phân quyền + 404 chung + log phân trang không lộ bí mật / số tiền.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { cassoSignature, connectorRegistry, type ProviderHttp } from '@appchat/integrations';
import { BANK_PULL_OP, PROBE_OP, bankPullOp, executeCall, parseEncKey, probeOp, providerHttp, registerCallOp, stagePulledReceipts, unregisterCallOp, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';
import { drainBankReceipts } from './helpers/bank-ingress';

let h: Harness;
let resolver: TenantDbResolver;
const ACC = '8007041027107';
const KEY = 'ck_api_SECRET_7f3';

/** Casso giả: userInfo thấy ACC; transactions trả `records` cho sẵn (một trang). `status` để ép lỗi. */
const casso = { records: [] as Record<string, unknown>[], status: 200, userStatus: 200, calls: 0 };
const transport: ProviderHttp = async (url, headers): Promise<{ status: number; headers: Record<string, string>; body: string }> => {
  casso.calls++;
  if (headers.authorization !== `Apikey ${KEY}`) return { status: 401, headers: {}, body: '' };
  if (url.startsWith('https://oauth.casso.vn/v2/userInfo'))
    return { status: casso.userStatus, headers: {}, body: JSON.stringify({ error: 0, message: 'success', data: { bankAccs: [{ id: 1, bankSubAccId: ACC }] } }) };
  if (casso.status !== 200) return { status: casso.status, headers: { 'retry-after': '1' }, body: `<html>${KEY}</html>` };
  return { status: 200, headers: {}, body: JSON.stringify({ error: 0, message: 'success', data: { page: 1, pageSize: 100, nextPage: null, totalPages: 1, records: casso.records } }) };
};
const deps = () => ({ tenants: resolver, registry: connectorRegistry, key: parseEncKey(env.APP_ENC_KEY!), http: providerHttp({ transport }), kv: null, now: () => new Date() });

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  registerCallOp(PROBE_OP, probeOp);
  registerCallOp(BANK_PULL_OP, bankPullOp(stagePulledReceipts));
}, 60_000);
afterAll(async () => {
  unregisterCallOp(PROBE_OP);
  unregisterCallOp(BANK_PULL_OP);
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown, key = uuidv7()) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': key }).then(json);
const ok = (r: { status: number; body: any }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body.data.result;
};
const get = (path: string, token?: string) => call(h, path, undefined, token ? { authorization: `Bearer ${token}` } : {}).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const rec = (id: number, amount: number, desc: string, when = new Date()) => ({ id, tid: `TF${id}`, description: desc, amount, cusum_balance: 0, when: new Date(when.getTime() + 7 * 3600_000).toISOString().slice(0, 19).replace('T', ' '), bankSubAccId: ACC });

let conn = '';
let feed = '';

describe('kết nối → thăm dò bền', () => {
  it('bank_feed.connect Casso live + api_key → biên nhận thăm dò queued; chạy ở worker → verified cho phiên bản khoá hiện tại', async () => {
    feed = ok(await act('bank_feed.connect', { provider: 'casso', fields: { webhook_secret: 'wh_s', account_number: ACC, api_key: KEY } })).feed_id;
    const db = await tenant();
    conn = (await db.tenantBankFeed.findUniqueOrThrow({ where: { id: feed } })).connectionId;
    const probe = await db.integrationCallLog.findFirstOrThrow({ where: { connectionId: conn, op: PROBE_OP } });
    expect(probe).toMatchObject({ status: 'queued', configRev: 1, safety: 'read' });
    const before = (await get(`/integrations/connections/${conn}`)).body.data;
    expect(before.health).toBe('probing');
    expect(await executeCall(deps(), h.ws, probe.id)).toBe('succeeded');
    const d = (await get(`/integrations/connections/${conn}`)).body.data;
    expect(d).toMatchObject({ health: 'verified', mode: 'live', credential_rev: 1, capabilities: { webhook: true, probe: true, pull: true }, probe: { status: 'verified', current: true }, last_sync_at: null });
    expect(d.bank_binding).toEqual({ active: true, account_masked: '••7107' });
    expect(JSON.stringify(d)).not.toContain(KEY);
    // Chạy lại cùng biên nhận → bỏ qua (đã xong, claim CAS không nhận).
    expect(await executeCall(deps(), h.ws, probe.id)).toBe('skipped');
  });
});

describe('integration.sync_now', () => {
  it('accepted ≠ xong; gửi lại cùng khoá → cùng biên nhận; lượt khác khi đang chờ → gộp', async () => {
    const k = uuidv7();
    const a = ok(await act('integration.sync_now', { connection_id: conn }, k));
    expect(a).toMatchObject({ status: 'accepted', coalesced: false, call: { op: BANK_PULL_OP, status: 'queued' } });
    expect(ok(await act('integration.sync_now', { connection_id: conn }, k)).call.id).toBe(a.call.id);
    const b = ok(await act('integration.sync_now', { connection_id: conn }));
    expect(b).toMatchObject({ coalesced: true, call: { id: a.call.id } });
    expect((await act('integration.sync_now', { connection_id: conn, if_version: 99 })).status).toBe(409);
    expect((await act('integration.sync_now', { connection_id: uuidv7() })).status).toBe(404);
  });

  it('kéo + webhook cùng giao dịch → một biên nhận, một khoản thu; hoàn tất mới có last_sync_at', async () => {
    const contact = ok(await act('contact.create', { full_name: 'Chị Mai', phone: '0909800001' })).contact_id;
    const inv = ok(await act('invoice.create', { contact_id: contact, kind: 'full', amount: '450000' })).invoice_id as string;
    const code = (await get(`/invoices/${inv}`)).body.data.transfer_code as string;
    casso.records = [rec(9001, 450000, `CK ${code}`), rec(9002, -20000, 'phi')];
    const db = await tenant();
    const call1 = await db.integrationCallLog.findFirstOrThrow({ where: { connectionId: conn, op: BANK_PULL_OP, nextAttemptAt: { not: null } } });
    expect(await executeCall(deps(), h.ws, call1.id)).toBe('succeeded');
    const done = (await get(`/integrations/connections/${conn}/calls/${call1.id}`)).body.data;
    expect(done).toMatchObject({ status: 'succeeded', outcome: { pages: 1, fetched: 2, accepted: 1, ignored: 1, complete: true } });
    // Webhook Casso V2 cùng giao dịch 9001 tới sau → trùng (deliveries 2), không biên nhận mới.
    const body = { error: 0, data: { id: 9001, reference: 'TF9001', description: `CK ${code}`, amount: 450000, runningBalance: 0, transactionDateTime: rec(9001, 1, '').when, accountNumber: ACC } };
    const t = String(Date.now());
    const r = await fetch(`${h.base}/hooks/tenant-payments/casso/${feed}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-casso-signature': cassoSignature('wh_s', t, body) }, body: JSON.stringify(body) });
    expect(((await r.json()) as { data: unknown }).data).toMatchObject({ accepted: 0, duplicate: 1 });
    await drainBankReceipts(h, resolver);
    expect(await db.bankReceipt.findUniqueOrThrow({ where: { provider_accountNo_externalId: { provider: 'casso', accountNo: ACC, externalId: '9001' } } })).toMatchObject({ status: 'processed', deliveries: 2 });
    expect(await db.customerPayment.count({ where: { invoiceId: inv } })).toBe(1);
    expect((await db.invoice.findUniqueOrThrow({ where: { id: inv } })).status).toBe('paid');
    const d = (await get(`/integrations/connections/${conn}`)).body.data;
    expect(d.last_sync_at).not.toBeNull();
    expect(d.pending_call).toBeNull();
  });

  it('lỗi provider (429) → thử lại có lịch, mã đã làm sạch; hết lượt → failed + last_error, không last_sync mới', async () => {
    const db = await tenant();
    const sync0 = (await db.integrationConnection.findUniqueOrThrow({ where: { id: conn } })).lastSyncAt;
    const a = ok(await act('integration.sync_now', { connection_id: conn }));
    casso.status = 429;
    expect(await executeCall(deps(), h.ws, a.call.id)).toBe('retry');
    const row = await db.integrationCallLog.findUniqueOrThrow({ where: { id: a.call.id } });
    expect(row).toMatchObject({ status: 'queued', error: 'rate_limited' });
    // Đẩy lượt thử tới hạn ngay và cạn lượt.
    for (let i = 0; i < 6; i++) {
      await db.integrationCallLog.update({ where: { id: a.call.id }, data: { nextAttemptAt: new Date(Date.now() - 1000) } });
      const r = await executeCall(deps(), h.ws, a.call.id);
      if (r === 'failed') break;
    }
    casso.status = 200;
    expect(await db.integrationCallLog.findUniqueOrThrow({ where: { id: a.call.id } })).toMatchObject({ status: 'failed', error: 'rate_limited', nextAttemptAt: null });
    const c = await db.integrationConnection.findUniqueOrThrow({ where: { id: conn } });
    expect(c.lastError).toBe('rate_limited');
    expect(c.lastSyncAt?.getTime()).toBe(sync0?.getTime());
    const logs = await get(`/integrations/connections/${conn}/logs?limit=50`);
    expect(JSON.stringify(logs.body)).not.toMatch(new RegExp(`${KEY}|450000|html`));
    expect((await get(`/integrations/connections/${conn}`)).body.data.health).toBe('degraded');
  });

  it('đổi khoá (kết nối lại) giữa chừng → lượt cũ cancelled, không gọi provider, không ghi con trỏ', async () => {
    const a = ok(await act('integration.sync_now', { connection_id: conn }));
    ok(await act('bank_feed.connect', { provider: 'casso', fields: { webhook_secret: 'wh_s', account_number: ACC, api_key: KEY } }));
    const db = await tenant();
    expect(await db.integrationCallLog.findUniqueOrThrow({ where: { id: a.call.id } })).toMatchObject({ status: 'cancelled', error: 'superseded' });
    expect(await db.bankPullState.count({ where: { connectionId: conn } })).toBe(0);
    const n = casso.calls;
    expect(await executeCall(deps(), h.ws, a.call.id)).toBe('skipped');
    expect(casso.calls).toBe(n);
    expect((await get(`/integrations/connections/${conn}`)).body.data).toMatchObject({ credential_rev: 2, probe: { current: false } });
  });
});

describe('khả năng thật + quyền đọc', () => {
  it('SePay live (không kéo) → sync_now unsupported, không biên nhận; GET connectors cho biết khả năng', async () => {
    ok(await act('bank_feed.connect', { provider: 'sepay', fields: { api_key: 'sk_w', account_number: '0071000123456' } }));
    const db = await tenant();
    const sepay = await db.integrationConnection.findFirstOrThrow({ where: { connectorKey: 'sepay' } });
    expect(ok(await act('integration.sync_now', { connection_id: sepay.id }))).toEqual({ status: 'unsupported', call: null, reason: 'no_pull', coalesced: false });
    expect(await db.integrationCallLog.count({ where: { connectionId: sepay.id, op: BANK_PULL_OP } })).toBe(0);
    const list = (await get('/integrations/connectors')).body.data as { key: string; capabilities: unknown; connection_id: string | null }[];
    expect(list.find((c) => c.key === 'sepay')).toMatchObject({ capabilities: { webhook: true, probe: true, pull: false }, connection_id: sepay.id });
    expect(list.find((c) => c.key === 'casso')).toMatchObject({ capabilities: { pull: true } });
  });

  it('sales (không integrations.manage) → 403; id lạ / sai dạng → 404 chung; log phân trang theo cursor; action integration.get = HTTP', async () => {
    const sales = await h.member('sales');
    expect((await get(`/integrations/connections/${conn}`, sales.token)).status).toBe(403);
    expect((await get(`/integrations/connections/${uuidv7()}`)).status).toBe(404);
    expect((await get('/integrations/connections/abc')).status).toBe(404);
    expect((await get(`/integrations/connections/${conn}/calls/${uuidv7()}`)).status).toBe(404);
    const p1 = (await get(`/integrations/connections/${conn}/logs?limit=2`)).body;
    expect(p1.data).toHaveLength(2);
    expect(p1.next_cursor).toBeTruthy();
    const p2 = (await get(`/integrations/connections/${conn}/logs?limit=2&cursor=${p1.next_cursor}`)).body;
    expect(p2.data[0].id).not.toBe(p1.data[1].id);
    expect(p1.data[0]).not.toHaveProperty('outcome');
    expect((await get(`/integrations/connections/${conn}/logs?limit=0`)).status).toBe(422);
    const viaAction = ok(await act('integration.get', { connection_id: conn }));
    expect(viaAction.id).toBe(conn);
    expect(ok(await act('integration.list_calls', { connection_id: conn, limit: 2 })).items).toHaveLength(2);
  });
});
