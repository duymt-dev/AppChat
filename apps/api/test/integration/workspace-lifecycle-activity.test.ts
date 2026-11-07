// TIP-041 pha 2 trên Postgres 16 thật + pg_dump / pg_restore thật (AC01 / AC03 / AC06):
//   - mốc hoạt động: action người dùng ghi `workspace.activity` cùng transaction; consumer đẩy `last_active_at` bằng GREATEST (sự kiện cũ
//     không kéo lùi); action hệ thống không phát
//   - quét lưu trữ gói Miễn phí: chưa có mốc → bỏ qua (unknown); còn ≤ 14 ngày → cảnh báo Owner một lần mỗi cửa sổ (outbox
//     notify.requested + biên nhận sent, ngày hiệu lực ≥ lúc giao + 14 ngày); trước ngày hiệu lực không lưu trữ; tới ngày → lệnh scan có
//     basis_at; gói không có ngưỡng (trial / trả phí) không bao giờ vào
//   - đua: hoạt động mới giữa lúc quét và lúc quiesce → lệnh cancelled, DB nguyên, workspace active
//   - workspace.open: workspace đã lưu trữ → lệnh khôi phục nguồn member (không mở DB tenant), thành viên thứ hai gộp cùng lệnh, thành
//     viên đã thu hồi 403, workspace tạm dừng không tự khôi phục; GET /workspace/lifecycle + /session phản ánh restoring → active
import 'reflect-metadata';
import { readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { LIFECYCLE_INFRA, LifecycleJobs, activityConsumer, processLifecycleJob, scanArchiveCandidates, touchActivity, uuidv7, type LifecycleRunDeps, type ScanDeps } from '@appchat/core';
import { env, startApi, type Harness } from './setup';

const DAY = 86_400_000;
let h: Harness;
let resolver: TenantDbResolver;
let deps: LifecycleRunDeps;
let admin: { id: string; token: string };
const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const get = (path: string, token = h.token, ws: string | null = h.ws) => fetch(`${h.base}/v1${path}`, { headers: { authorization: `Bearer ${token}`, ...(ws ? { 'x-workspace-id': ws } : {}) } }).then(json);
const act = (id: string, input: unknown, token = h.token, extra: Record<string, string> = {}) =>
  fetch(`${h.base}/v1/actions/${id}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'x-workspace-id': h.ws, 'idempotency-key': uuidv7(), ...extra },
    body: JSON.stringify({ input }),
  }).then(json);
/** Lần xác nhận của action luôn-xem-trước (admin). */
const confirm = (id: string, input: unknown, token: string) =>
  fetch(`${h.base}/v1/actions/${id}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${admin.token}`, 'idempotency-key': uuidv7() },
    body: JSON.stringify({ input, confirm_token: token }),
  }).then(json);
const ws = () => h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } });
const stats = async () => (await h.platform.workspaceStats.findUnique({ where: { workspaceId: h.ws } }))?.lastActiveAt ?? null;
const tenant = () => resolver.get(TenantContexts.system(h.ws, 'test'));
const scan = (now: Date) => scanArchiveCandidates({ platform: h.platform, resolver, kv: { sadd: async () => 1 } as never, now: () => now, wake: async () => undefined } satisfies ScanDeps);
const run = (jobId: string) => processLifecycleJob(deps, jobId, 'test-worker');
const setLastActive = (at: Date | null) =>
  at ? h.platform.workspaceStats.upsert({ where: { workspaceId: h.ws }, create: { workspaceId: h.ws, lastActiveAt: at }, update: { lastActiveAt: at } }) : h.platform.workspaceStats.deleteMany({ where: { workspaceId: h.ws } });

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  admin = { id: uuidv7(), token: '' };
  h.track(admin.id);
  await h.platform.user.create({ data: { id: admin.id, email: `t-lcadm-${admin.id.slice(-12)}@test.appchat.vn`, name: 'LC Admin', isPlatformAdmin: true } });
  admin.token = h.tokenFor(admin.id);
  deps = {
    platform: h.platform,
    jobs: new LifecycleJobs(h.platform, () => new Date()),
    infra: h.app.get(LIFECYCLE_INFRA),
    resolver,
    kv: { sadd: async () => 1 } as never,
    now: () => new Date(),
    seedDb: async () => undefined,
    settleMs: 0,
    invalidate: (id) => resolver.invalidate(id),
    stopChannels: async () => undefined,
    log: { warn: () => undefined, info: () => undefined, error: () => undefined } as never,
  };
  const free = await h.platform.plan.create({ data: { id: uuidv7(), key: `t-free-${uuidv7().slice(-8)}`, segment: 'personal', name: 'Free test', archiveInactiveDays: 90, active: false } });
  await h.platform.subscription.create({ data: { id: uuidv7(), workspaceId: h.ws, planId: free.id, status: 'active', currentPeriodStart: h.clock.now() } });
}, 240_000);

afterAll(async () => {
  const dir = join(env.ARCHIVE_DIR!, h.ws);
  try {
    for (const f of readdirSync(dir)) rmSync(join(dir, f), { force: true });
  } catch {
    /* chưa có bản lưu trữ */
  }
  await h?.platform.archiveManifest.deleteMany({ where: { workspaceId: h.ws } });
  await h?.platform.workspaceLifecycleJob.deleteMany({ where: { workspaceId: h.ws } });
  await h?.platform.workspaceLifecycleNotice.deleteMany({ where: { workspaceId: h.ws } });
  await h?.platform.workspaceStats.deleteMany({ where: { workspaceId: h.ws } });
  await h?.platform.workspace.update({ where: { id: h.ws }, data: { status: 'active', dbStatus: 'active', archivedAt: null, archiveKey: null } }).catch(() => undefined);
  await h?.platform.adminOperation.deleteMany({ where: { actorUserId: { in: [admin.id, h.user] } } });
  await h?.platform.platformAuditLog.deleteMany({ where: { workspaceId: h.ws } });
  await resolver?.close();
  await h?.close();
});

describe('mốc hoạt động (AC01)', () => {
  it('action người dùng phát workspace.activity cùng transaction; consumer GREATEST, sự kiện cũ không kéo lùi', async () => {
    const r = await act('contact.create', { full_name: 'Khách hoạt động', phone: '0909555041' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const ev = await (await tenant()).outboxEvent.findFirstOrThrow({ where: { topic: 'workspace.activity' }, orderBy: { id: 'desc' } });
    expect(ev.payload).toMatchObject({ action_log_id: r.body.data.action_log_id, source: 'ui', actor_type: 'user', occurred_at: h.clock.now().toISOString() });
    const consumer = activityConsumer(h.platform);
    const e = { id: ev.id, topic: ev.topic, workspaceId: h.ws, payload: ev.payload as Record<string, unknown>, traceId: null };
    await consumer.handle(e, await tenant());
    expect((await stats())?.toISOString()).toBe(h.clock.now().toISOString());
    // Sự kiện cũ (thử lại / tới muộn) không kéo lùi; thiếu occurred_at → không suy ra hoạt động.
    await consumer.handle({ ...e, payload: { occurred_at: new Date(h.clock.now().getTime() - 10 * DAY).toISOString() } }, await tenant());
    await consumer.handle({ ...e, payload: {} }, await tenant());
    expect((await stats())?.toISOString()).toBe(h.clock.now().toISOString());
  });
});

describe('quét lưu trữ gói Miễn phí (AC01 / AC03)', () => {
  it('không mốc → unknown; ≤ 14 ngày → cảnh báo một lần; tới ngày hiệu lực → lệnh scan; hoạt động mới trước quiesce → cancelled', async () => {
    await setLastActive(null);
    expect((await scan(new Date())).unknown).toBeGreaterThanOrEqual(1);
    expect(await h.platform.workspaceLifecycleJob.count({ where: { workspaceId: h.ws } })).toBe(0);

    const now = new Date();
    const last = new Date(now.getTime() - 80 * DAY);
    await setLastActive(last);
    const r1 = await scan(now);
    expect(r1.warned).toBeGreaterThanOrEqual(1);
    const n = await h.platform.workspaceLifecycleNotice.findUniqueOrThrow({ where: { workspaceId_windowKey_channel: { workspaceId: h.ws, windowKey: last.toISOString(), channel: 'in_app' } } });
    expect(n.status).toBe('sent');
    // Ngày hiệu lực ≥ lúc giao + 14 ngày (ngưỡng gốc là +10 ngày).
    expect(n.archiveOn.getTime()).toBeGreaterThanOrEqual(now.getTime() + 14 * DAY - DAY);
    const warn = await (await tenant()).outboxEvent.findFirstOrThrow({ where: { topic: 'notify.requested' }, orderBy: { id: 'desc' } });
    expect(warn.payload).toMatchObject({ kind: 'archive_warning', to: { user_ids: [h.user] } });
    // Lượt sau cùng cửa sổ: không cảnh báo lại, chưa tới ngày hiệu lực → không lưu trữ.
    await scan(new Date(now.getTime() + 12 * DAY));
    expect(await h.platform.workspaceLifecycleNotice.count({ where: { workspaceId: h.ws } })).toBe(1);
    expect(await h.platform.workspaceLifecycleJob.count({ where: { workspaceId: h.ws } })).toBe(0);
    expect((await get('/workspace/lifecycle')).body.data).toMatchObject({ db_status: 'active', archive_on: n.archiveOn.toISOString().slice(0, 10) });

    // Tới ngày hiệu lực → lệnh archive nguồn scan, basis_at = mốc đã dựa vào.
    await scan(new Date(n.archiveOn.getTime() + 1000));
    const job = await h.platform.workspaceLifecycleJob.findFirstOrThrow({ where: { workspaceId: h.ws, operation: 'archive' } });
    expect(job).toMatchObject({ source: 'scan', status: 'pending', basisAt: last });
    expect((await ws()).dbStatus).toBe('archiving');
    // Owner mở lại đúng lúc này (sau quét, trước quiesce) → worker thấy hoạt động mới → huỷ, DB nguyên.
    await touchActivity(h.platform, h.ws, new Date());
    expect(await run(job.id)).toBe('cancelled');
    expect(await h.platform.workspaceLifecycleJob.findUniqueOrThrow({ where: { id: job.id } })).toMatchObject({ status: 'cancelled' });
    expect((await ws()).dbStatus).toBe('active');
    expect((await get('/contacts')).status).toBe(200);
    // Mốc mới → cửa sổ cũ hết hiệu lực (không còn hiện ngày lưu trữ).
    expect((await get('/workspace/lifecycle')).body.data.archive_on).toBeNull();
  }, 240_000);

  it('gói không có ngưỡng (trial / trả phí) không bao giờ vào quét', async () => {
    const paid = await h.platform.plan.create({ data: { id: uuidv7(), key: `t-paid-${uuidv7().slice(-8)}`, segment: 'personal', name: 'Paid test', archiveInactiveDays: null, active: false } });
    const sub = await h.platform.subscription.findUniqueOrThrow({ where: { workspaceId: h.ws } });
    await h.platform.subscription.update({ where: { id: sub.id }, data: { planId: paid.id } });
    try {
      await setLastActive(new Date(Date.now() - 400 * DAY));
      const before = await h.platform.workspaceLifecycleNotice.count({ where: { workspaceId: h.ws } });
      await scan(new Date());
      expect(await h.platform.workspaceLifecycleNotice.count({ where: { workspaceId: h.ws } })).toBe(before);
      expect(await h.platform.workspaceLifecycleJob.count({ where: { workspaceId: h.ws, status: 'pending' } })).toBe(0);
    } finally {
      await h.platform.subscription.update({ where: { id: sub.id }, data: { planId: sub.planId } });
    }
  });
});

describe('workspace.open khôi phục (AC06)', () => {
  it('đã lưu trữ → lệnh member (không mở DB tenant), gộp lệnh, thu hồi 403, tạm dừng không tự khôi phục; trạng thái restoring → active', async () => {
    const v = (await ws()).statusVersion;
    const input = { workspace_id: h.ws, if_version: v, reason: 'chuẩn bị thử mở' };
    const p = await act('admin.workspace.archive', input, admin.token);
    expect(p.status).toBe(202);
    const a = await confirm('admin.workspace.archive', input, p.body.data.confirm_token);
    expect(a.status, JSON.stringify(a.body)).toBe(200);
    expect(await run(a.body.data.result.job_id)).toBe('archived');
    expect((await get('/contacts')).status).toBe(423);
    expect((await get('/session', h.token, null)).body.data.lifecycle).toBe('archived');

    // Lệnh vòng đời chỉ nguồn ui, không GenUI.
    expect((await act('workspace.open', {}, h.token, { 'x-action-source': 'assistant' })).status).toBe(403);
    const removed = await h.member('staff');
    await h.platform.membership.update({ where: { workspaceId_userId: { workspaceId: h.ws, userId: removed.id } }, data: { status: 'removed' } });
    expect((await act('workspace.open', {}, removed.token)).status).toBe(403);
    expect((await get('/workspace/lifecycle', removed.token)).status).toBe(403);

    // Tạm dừng: không tự khôi phục (chỉ trả trạng thái).
    await h.platform.workspace.update({ where: { id: h.ws }, data: { status: 'suspended' } });
    const s = await act('workspace.open', {});
    expect(s.body.data.result).toMatchObject({ db_status: 'archived', restore_job_id: null });
    await h.platform.workspace.update({ where: { id: h.ws }, data: { status: 'active' } });

    const before = await stats();
    const o1 = await act('workspace.open', {});
    expect(o1.status, JSON.stringify(o1.body)).toBe(200);
    expect(o1.body.data.result).toMatchObject({ workspace_id: h.ws, db_status: 'restoring', restore_job_id: expect.any(String) });
    expect((await stats())!.getTime()).toBeGreaterThanOrEqual(before?.getTime() ?? 0);
    const other = await h.member('manager');
    const o2 = await act('workspace.open', {}, other.token);
    expect(o2.body.data.result.restore_job_id).toBe(o1.body.data.result.restore_job_id);
    expect(await h.platform.workspaceLifecycleJob.count({ where: { workspaceId: h.ws, operation: 'restore', status: { in: ['pending', 'running'] } } })).toBe(1);
    const job = await h.platform.workspaceLifecycleJob.findUniqueOrThrow({ where: { id: o1.body.data.result.restore_job_id } });
    expect(job).toMatchObject({ source: 'member', requestedBy: h.user });
    expect(await h.platform.platformAuditLog.count({ where: { workspaceId: h.ws, actionId: 'workspace.open' } })).toBeGreaterThanOrEqual(2);

    const st = await get('/workspace/lifecycle');
    expect(st.body.data).toMatchObject({ db_status: 'restoring', job: { id: job.id, operation: 'restore', status: 'pending', step: 'queued' } });
    expect((await get('/session', h.token, null)).body.data.lifecycle).toBe('restoring');

    expect(await run(job.id)).toBe('restored');
    expect((await get('/workspace/lifecycle')).body.data).toMatchObject({ db_status: 'active', job: { status: 'succeeded' } });
    expect((await get('/session', h.token, null)).body.data.lifecycle).toBeNull();
    expect((await get('/contacts')).status).toBe(200);
    // Workspace đang active: mở chỉ ghi hoạt động.
    expect((await act('workspace.open', {})).body.data.result).toMatchObject({ db_status: 'active', restore_job_id: null });
  }, 300_000);
});
