// TIP-040 pha 4 (AC07, AC09 một phần) trên Postgres thật — tạm dừng / mở lại workspace ở ngữ cảnh nền tảng (DC-373):
//   - suspend: CAS status_version; lý do bắt buộc; chỉ từ active (archiving / restoring → 409); dữ liệu giữ nguyên.
//   - sau tạm dừng: API của workspace (đã warm cache resolver) → 423 ngay; resolver của tiến trình KHÁC (cache đã nạp) chặn trong ≤ 2 giây;
//     cổng AI / gửi (WorkspaceAccess) thấy đóng; admin vẫn đọc / mở lại được (không cần DB tenant mở cho workspace).
//   - resume: chỉ từ suspended + DB tenant trả lời thật; resume không dùng để mở workspace archived; sau resume API chạy lại.
//   - GET /admin/workspaces: lọc status / q, cursor, stats chưa làm tươi → null; người thường 403.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { uuidv7, WorkspaceAccess } from '@appchat/core';
import { env, startApi, testEmail, type Harness } from './setup';

let h: Harness;
let admin: { id: string; token: string };
const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const get = (path: string, token = admin.token, ws?: string) => fetch(`${h.base}/v1${path}`, { headers: { authorization: `Bearer ${token}`, ...(ws ? { 'x-workspace-id': ws } : {}) } }).then(json);
const act = (id: string, input: unknown, token = admin.token) =>
  fetch(`${h.base}/v1/actions/${id}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'idempotency-key': uuidv7() }, body: JSON.stringify({ input }) }).then(json);
const version = async () => (await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).statusVersion;

beforeAll(async () => {
  h = await startApi();
  admin = { id: uuidv7(), token: '' };
  h.track(admin.id);
  await h.platform.user.create({ data: { id: admin.id, email: testEmail('wsadmin'), name: 'Ws Admin', isPlatformAdmin: true } });
  admin.token = h.tokenFor(admin.id);
}, 240_000);
afterAll(async () => {
  await h?.platform.workspace.update({ where: { id: h.ws }, data: { status: 'active', dbStatus: 'active', suspendedAt: null, suspendReason: null } }).catch(() => undefined);
  await h?.platform.adminOperation.deleteMany({ where: { actorUserId: admin.id } });
  await h?.platform.platformAuditLog.deleteMany({ where: { actorUserId: admin.id } });
  await h?.close();
});

describe('admin.workspace.suspend / resume (AC07)', () => {
  it('tạm dừng chặn việc mới ở API / resolver tiến trình khác / cổng AI-gửi; mở lại khi DB sẵn sàng', async () => {
    // Warm: API + resolver "tiến trình khác" + cổng đã nạp workspace đang mở.
    expect((await get('/contacts', h.token, h.ws)).status).toBe(200);
    const other = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
    const db = await other.get(TenantContexts.system(h.ws, 'test'));
    const contacts0 = await db.contact.count();
    const access = new WorkspaceAccess(h.platform);
    expect(await access.isOpen(h.ws)).toBe(true);

    const v0 = await version();
    expect((await act('admin.workspace.suspend', { workspace_id: h.ws, if_version: v0 })).status).toBe(422);
    expect((await act('admin.workspace.suspend', { workspace_id: h.ws, if_version: v0 + 7, reason: 'tranh chấp thanh toán' })).body.error.fields).toMatchObject({ if_version: 'stale' });
    const s = await act('admin.workspace.suspend', { workspace_id: h.ws, if_version: v0, reason: 'tranh chấp thanh toán' });
    expect(s.status, JSON.stringify(s.body)).toBe(200);
    expect(s.body.data.result).toEqual({ workspace_id: h.ws, status: 'suspended', version: v0 + 1 });
    expect((await act('admin.workspace.suspend', { workspace_id: h.ws, if_version: v0 + 1, reason: 'lần hai' })).status).toBe(409);

    // API cùng tiến trình (cache resolver đã warm) bị chặn ngay; tiến trình khác trong ≤ 2 giây (thế hệ workspace_status).
    expect((await get('/contacts', h.token, h.ws)).status).toBe(423);
    await new Promise((r) => setTimeout(r, 2_100));
    await expect(other.get(TenantContexts.system(h.ws, 'test'))).rejects.toMatchObject({ dbStatus: 'suspended' });
    expect(await access.isOpen(h.ws)).toBe(false);
    await expect(access.assertOpen(h.ws)).rejects.toMatchObject({ httpStatus: 423 });

    // Admin vẫn thấy workspace + lý do; dữ liệu còn nguyên.
    const list = await get(`/admin/workspaces?status=suspended&q=${encodeURIComponent('WS test')}`);
    expect(list.body.data.find((w: { id: string }) => w.id === h.ws)).toMatchObject({ status: 'suspended', db_status: 'suspended', suspend_reason: 'tranh chấp thanh toán', version: v0 + 1, stats: null, refreshed_at: null });
    const audit = await h.platform.platformAuditLog.findUniqueOrThrow({ where: { id: s.body.data.action_log_id } });
    expect(audit).toMatchObject({ workspaceId: h.ws, actionId: 'admin.workspace.suspend' });

    const r = await act('admin.workspace.resume', { workspace_id: h.ws, if_version: v0 + 1 });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toEqual({ workspace_id: h.ws, status: 'active', version: v0 + 2 });
    expect((await act('admin.workspace.resume', { workspace_id: h.ws, if_version: v0 + 2 })).status).toBe(409);
    expect((await get('/contacts', h.token, h.ws)).status).toBe(200);
    await new Promise((res) => setTimeout(res, 2_100));
    expect(await (await other.get(TenantContexts.system(h.ws, 'test'))).contact.count()).toBe(contacts0);
    expect(await access.isOpen(h.ws)).toBe(true);
    await other.close();
  }, 60_000);

  it('không tạm dừng khi đang lưu trữ; resume không mở workspace archived', async () => {
    const v = await version();
    await h.platform.workspace.update({ where: { id: h.ws }, data: { dbStatus: 'archiving' } });
    try {
      expect((await act('admin.workspace.suspend', { workspace_id: h.ws, if_version: v, reason: 'thử' })).status).toBe(409);
      await h.platform.workspace.update({ where: { id: h.ws }, data: { dbStatus: 'archived', status: 'suspended' } });
      expect((await act('admin.workspace.resume', { workspace_id: h.ws, if_version: v })).body.error.code).toBe('INVALID_TRANSITION');
      expect((await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).dbStatus).toBe('archived');
    } finally {
      await h.platform.workspace.update({ where: { id: h.ws }, data: { dbStatus: 'active', status: 'active' } });
    }
  });

  it('danh sách: cursor, lọc trạng thái, tham số lạ 400; người thường 403', async () => {
    const a = await get('/admin/workspaces?status=active&limit=1');
    expect(a.status).toBe(200);
    expect(a.body.data).toHaveLength(1);
    if (a.body.next_cursor) {
      const b = await get(`/admin/workspaces?status=active&limit=1&cursor=${a.body.next_cursor}`);
      expect(b.body.data[0]?.id).not.toBe(a.body.data[0].id);
    }
    expect((await get('/admin/workspaces?status=archived')).status).toBe(400);
    expect((await get('/admin/workspaces', h.token)).status).toBe(403);
    expect((await act('admin.workspace.suspend', { workspace_id: h.ws, if_version: 0, reason: 'owner thử' }, h.token)).status).toBe(403);
    const plan = await h.platform.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(`EXPLAIN SELECT id, created_at FROM workspace WHERE status = 'active' ORDER BY created_at DESC, id DESC LIMIT 51`);
    expect(plan.map((r) => r['QUERY PLAN']).join('\n')).toMatch(/workspace_status_created_idx|Seq Scan/);
  });
});
