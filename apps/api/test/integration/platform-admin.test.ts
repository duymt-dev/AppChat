// TIP-040 pha 1 (AC01–AC02) trên Postgres thật — ngữ cảnh quản trị nền tảng (DC-368):
//   - admin nền tảng KHÔNG có membership, không gửi X-Workspace-Id → `admin.invoice.confirm_transfer` chạy qua ActionExecutor ở ngữ cảnh
//     nền tảng: hoá đơn → paid, ghi nhận một lần, `platform_audit_log` ghi workspace của HOÁ ĐƠN + actor; không có action_log ở tenant.
//   - workspace đích đang tạm dừng / DB tenant không sẵn sàng → vẫn quản trị được (không mở DB tenant).
//   - Owner (có membership, không is_platform_admin) / header nguồn giả / intent GenUI → 403; danh sách /v1/actions của workspace không có
//     action admin; Owner gọi qua đường workspace (X-Workspace-Id) → 403.
//   - thu hồi is_platform_admin giữa lần gọi → 403 ngay (kiểm sống).
//   - cùng Idempotency-Key → cùng kết quả, một biên nhận; khác input cùng khoá → 409; thiếu khoá (risk money) → 422.
//   - GET /v1/admin/session: admin 200, người khác 403.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { env, startApi, testEmail, type Harness } from './setup';

let h: Harness;
let admin: { id: string; token: string };
let resolver: TenantDbResolver;
const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any

/** Gọi /v1 bằng token, KHÔNG gửi X-Workspace-Id (trừ khi truyền). */
const raw = (token: string, path: string, body?: unknown, headers: Record<string, string> = {}) =>
  fetch(`${h.base}/v1${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).then(json);
const confirm = (token: string, input: unknown, headers: Record<string, string> = {}) =>
  raw(token, '/actions/admin.invoice.confirm_transfer', { input }, { 'idempotency-key': uuidv7(), ...headers });

async function invoice(status: 'pending' | 'pending_review' = 'pending_review') {
  const r = await raw(h.token, '/actions/billing.create_invoice', { input: { kind: 'credit', item: 'credit_500' } }, { 'x-workspace-id': h.ws, 'idempotency-key': uuidv7() });
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  const id = r.body.data.result.invoice_id as string;
  if (status === 'pending_review') await h.platform.billingInvoice.update({ where: { id }, data: { status: 'pending_review' } });
  return id;
}

beforeAll(async () => {
  h = await startApi();
  admin = { id: uuidv7(), token: '' };
  h.track(admin.id);
  await h.platform.user.create({ data: { id: admin.id, email: testEmail('padmin'), name: 'Platform Admin', isPlatformAdmin: true } });
  admin.token = h.tokenFor(admin.id);
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
}, 240_000);
afterAll(async () => {
  await h?.platform.adminOperation.deleteMany({ where: { actorUserId: admin.id } });
  await h?.platform.platformAuditLog.deleteMany({ where: { actorUserId: admin.id } });
  await resolver?.close();
  await h?.close();
});

describe('ngữ cảnh nền tảng (AC01)', () => {
  it('admin không membership duyệt chuyển khoản: paid + ghi nhận; audit nền tảng ghi workspace hoá đơn; không action_log tenant', async () => {
    expect(await h.platform.membership.count({ where: { userId: admin.id } })).toBe(0);
    const id = await invoice();
    const r = await confirm(admin.token, { invoice_id: id, note: 'đã thấy tiền', evidence: 'VCB FT001' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toEqual({ invoice_id: id, status: 'paid' });
    expect(r.body.data.undo_until).toBeUndefined();
    const inv = await h.platform.billingInvoice.findUniqueOrThrow({ where: { id } });
    expect([inv.status, inv.confirmedBy]).toEqual(['paid', admin.id]);
    const audit = await h.platform.platformAuditLog.findUniqueOrThrow({ where: { id: r.body.data.action_log_id } });
    expect(audit).toMatchObject({ actorUserId: admin.id, actionId: 'admin.invoice.confirm_transfer', workspaceId: h.ws });
    expect(audit.result).toMatchObject({ after: { status: 'paid', workspace_id: h.ws } });
    const tdb = await resolver.get(TenantContexts.system(h.ws, 't'));
    expect(await tdb.actionLog.count({ where: { actionId: 'admin.invoice.confirm_transfer' } })).toBe(0);
  });

  it('workspace đích đang tạm dừng + DB tenant không sẵn sàng → vẫn duyệt được (không mở DB tenant)', async () => {
    const id = await invoice();
    await h.platform.workspace.update({ where: { id: h.ws }, data: { status: 'suspended', dbStatus: 'suspended' } });
    try {
      const r = await confirm(admin.token, { invoice_id: id, note: 'đã thấy tiền', evidence: 'VCB FT001' });
      expect(r.status, JSON.stringify(r.body)).toBe(200);
      expect((await h.platform.billingInvoice.findUniqueOrThrow({ where: { id } })).status).toBe('paid');
    } finally {
      await h.platform.workspace.update({ where: { id: h.ws }, data: { status: 'active', dbStatus: 'active' } });
    }
  });

  it('Owner / header nguồn giả / intent GenUI / đường workspace → 403; /v1/actions của workspace không có action admin', async () => {
    const id = await invoice();
    expect((await confirm(h.token, { invoice_id: id, note: 'đã thấy tiền', evidence: 'VCB FT001' })).status).toBe(403);
    expect((await confirm(h.token, { invoice_id: id, note: 'đã thấy tiền', evidence: 'VCB FT001' }, { 'x-workspace-id': h.ws })).status).toBe(403);
    expect((await confirm(admin.token, { invoice_id: id, note: 'đã thấy tiền', evidence: 'VCB FT001' }, { 'x-action-source': 'assistant' })).status).toBe(403);
    expect((await confirm(admin.token, { invoice_id: id, note: 'đã thấy tiền', evidence: 'VCB FT001' }, { 'x-genui-intent': 'forged' })).status).toBe(403);
    expect((await confirm('not-a-token', { invoice_id: id, note: 'đã thấy tiền', evidence: 'VCB FT001' })).status).toBe(401);
    const list = await raw(h.token, '/actions', undefined, { 'x-workspace-id': h.ws });
    expect(list.body.data.some((a: { id: string }) => a.id.startsWith('admin.'))).toBe(false);
    expect((await h.platform.billingInvoice.findUniqueOrThrow({ where: { id } })).status).toBe('pending_review');
  });

  it('thu hồi is_platform_admin giữa hai lần gọi → 403 ngay', async () => {
    const id = await invoice();
    await h.platform.user.update({ where: { id: admin.id }, data: { isPlatformAdmin: false } });
    try {
      expect((await confirm(admin.token, { invoice_id: id, note: 'đã thấy tiền', evidence: 'VCB FT001' })).status).toBe(403);
      expect((await raw(admin.token, '/admin/session')).status).toBe(403);
      expect((await raw(admin.token, '/admin/transfers')).status).toBe(403);
    } finally {
      await h.platform.user.update({ where: { id: admin.id }, data: { isPlatformAdmin: true } });
    }
    expect((await raw(admin.token, '/admin/session')).body.data).toMatchObject({ user_id: admin.id, platform_admin: true });
    expect((await raw(h.token, '/admin/session')).status).toBe(403);
  });
});

describe('idempotency nền tảng (AC02)', () => {
  it('cùng khoá → cùng kết quả một biên nhận; song song cùng khoá → một lần; khác input cùng khoá → 409; thiếu khoá → 422', async () => {
    const id = await invoice();
    const key = uuidv7();
    const [a, b] = await Promise.all([confirm(admin.token, { invoice_id: id, note: 'đã thấy tiền', evidence: 'VCB FT001' }, { 'idempotency-key': key }), confirm(admin.token, { invoice_id: id, note: 'đã thấy tiền', evidence: 'VCB FT001' }, { 'idempotency-key': key })]);
    const ok = [a, b].filter((x) => x.status === 200);
    expect(ok.length, JSON.stringify([a.body, b.body])).toBeGreaterThanOrEqual(1);
    const again = await confirm(admin.token, { invoice_id: id, note: 'đã thấy tiền', evidence: 'VCB FT001' }, { 'idempotency-key': key });
    expect(again.status).toBe(200);
    expect(again.body.data.action_log_id).toBe(ok[0]!.body.data.action_log_id);
    expect(await h.platform.adminOperation.count({ where: { actorUserId: admin.id, idempotencyKey: key } })).toBe(1);
    expect(await h.platform.platformAuditLog.count({ where: { actorUserId: admin.id, actionId: 'admin.invoice.confirm_transfer', workspaceId: h.ws, id: again.body.data.action_log_id } })).toBe(1);
    const other = await invoice();
    expect((await confirm(admin.token, { invoice_id: other, note: 'đã thấy tiền', evidence: 'VCB FT001' }, { 'idempotency-key': key })).status).toBe(409);
    const nokey = await raw(admin.token, '/actions/admin.invoice.confirm_transfer', { input: { invoice_id: other, note: 'đã thấy tiền', evidence: 'VCB FT001' } });
    expect([nokey.status, nokey.body.error.fields]).toEqual([422, { idempotency_key: 'required' }]);
    // Đã paid → lệnh mới (khoá mới) 409, không ghi nhận lần hai.
    expect((await confirm(admin.token, { invoice_id: id, note: 'đã thấy tiền', evidence: 'VCB FT001' })).status).toBe(409);
  });
});
